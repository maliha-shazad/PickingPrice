import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { market } from '../lib/market/router';
import { PgDatabase } from '../server/database';
import { migrate } from '../server/migrate';
import { one, run } from '../lib/market/core';
import { MarketError } from '../lib/market/types';
let checks = 0;
async function suite(db: unknown, label: string) {
    const users = Object.fromEntries(['buyer', 'seller', 'other', 'admin'].map(role => [role, { userId: role, displayName: role + ' Name', email: role + '@example.test', role: role === 'other' ? 'both' : role }]));
    const call = (who: string | null, method: string, path: string, body: Record<string, unknown> = {}, query = ''): Promise<unknown> => market({ db: db as import('../lib/market/types').Database, user: who ? { ...users[who] } : null }, method, path.split('/'), new URLSearchParams(query), body) as Promise<unknown>;
    const ok = (value: unknown) => { assert.ok(value); checks++; };
    const denied = async (fn: () => Promise<unknown>, status?: number) => { await assert.rejects(fn, e => e instanceof MarketError && (!status || e.status === status)); checks++; };
    for (const who of Object.keys(users))
        await call(who, 'GET', 'bootstrap');
    // Payment details the seller sends with every payment, including a receipt uploaded to their own account.
    await run(db, 'INSERT INTO uploads (id,owner,mime,size,created) VALUES (?,?,?,?,?)', 'receipt-seller', 'seller', 'image/png', 100, new Date().toISOString());
    const proof = { method: 'JazzCash', senderName: 'Seller Name', senderAccount: '03001234567', paidAmount: 100000, paidOn: new Date().toISOString().slice(0, 10), receipt: '/api/files/receipt-seller' };
    const listing = { title: 'Canvas tote bag', description: 'A well kept everyday canvas bag.', category: 'Accessories', subcategory: '', brand: 'Test', price: 1500, quantity: 1, condition: 'Good', location: 'Karachi', images: ['https://example.test/photo.jpg'] };
    await denied(() => call(null, 'POST', 'listings', listing), 401);
    await denied(() => call('buyer', 'POST', 'listings', listing), 403);
    for (const bad of [{ condition: 'Invalid' }, { quantity: -1 }, { description: '' }, { location: '' }, { price: 0 }, { category: 'Missing' }, { images: [] }, { images: [''] }, { images: ['javascript:alert(1)'] }, { price: 1.5 }, { quantity: 1.5 }])
        await denied(() => call('seller', 'POST', 'listings', { ...listing, ...bad }));
    const l = await call('seller', 'POST', 'listings', listing);
    ok(l.id);
    await denied(() => call('other', 'PATCH', 'listings/' + l.id, listing), 403);
    await call('seller', 'PATCH', 'listings/' + l.id, { ...listing, price: 1700 });
    ok((await call(null, 'GET', 'listings/' + l.id)).price === 1700);
    // "About this item" is limited to 1000 characters; a description already longer may stay as long as it was.
    await denied(() => call('seller', 'POST', 'listings', { ...listing, description: 'x'.repeat(1001) }));
    await run(db, 'UPDATE listings SET description=? WHERE id=?', 'y'.repeat(1200), l.id);
    ok(await call('seller', 'PATCH', 'listings/' + l.id, { ...listing, price: 1700, description: 'y'.repeat(1200) }));
    await denied(() => call('seller', 'PATCH', 'listings/' + l.id, { ...listing, price: 1700, description: 'y'.repeat(1201) }));
    await call('seller', 'PATCH', 'listings/' + l.id, { ...listing, price: 1700 });
    const req = { title: 'Looking for a good book', description: 'Looking for an interesting used novel.', category: 'Books', price: 900, quantity: 1, condition: 'Good', location: 'Lahore', image: '', expiry: new Date(Date.now() + 86400000).toISOString() };
    await denied(() => call('seller', 'POST', 'requests', req), 403);
    // Every new request runs for 30 days; an expiry sent by the browser is ignored.
    const fixed = await call('buyer', 'POST', 'requests', { ...req, expiry: '2000-01-01' });
    const fixedEnd = Date.parse((await call('buyer', 'GET', 'requests/' + fixed.id)).expiry) - Date.now();
    ok(fixedEnd > 30 * 86400000 - 60000 && fixedEnd <= 30 * 86400000);
    await denied(() => call('seller', 'DELETE', 'requests/' + fixed.id), 403);
    await call('buyer', 'DELETE', 'requests/' + fixed.id);
    await denied(() => call('buyer', 'GET', 'requests/' + fixed.id), 404);
    const r = await call('buyer', 'POST', 'requests', req);
    await denied(() => call('seller', 'POST', 'requests/' + r.id + '/offers', { description: 'Good condition book' }));
    const offer = { price: 800, description: 'I have this book in good condition.', image: '' };
    const o = await call('seller', 'POST', 'requests/' + r.id + '/offers', offer);
    await denied(() => call('seller', 'POST', 'requests/' + r.id + '/offers', offer), 409);
    const o2 = await call('other', 'POST', 'requests/' + r.id + '/offers', { ...offer, price: 700 });
    ok((await call('buyer', 'GET', 'offers', {}, 'request=' + r.id + '&sort=low')).items[0].id === o2.id);
    ok((await call('seller', 'GET', 'offers', {}, 'request=' + r.id)).total === 1);
    await denied(() => call('other', 'POST', 'requests/' + r.id + '/status', { status: 'Seller Selected', offerId: o2.id }), 403);
    await call('buyer', 'POST', 'requests/' + r.id + '/status', { status: 'Seller Selected', offerId: o.id });
    ok((await one(db as import('../lib/market/types').Database, 'SELECT status FROM seller_offers WHERE id=?', o2.id) as Record<string, unknown>)?.status === 'Not selected');
    await denied(() => call('other', 'POST', 'requests/' + r.id + '/offers', offer), 409);
    const r2 = await call('buyer', 'POST', 'requests', req);
    await call('buyer', 'POST', 'requests/' + r2.id + '/status', { status: 'Cancelled' });
    await denied(() => call('seller', 'POST', 'requests/' + r2.id + '/offers', offer), 409);
    await denied(() => call('buyer', 'POST', 'conversations', { contextType: 'listing', contextId: 'missing' }), 404);
    await denied(() => call('buyer', 'POST', 'profiles/seller/reviews', { rating: 5, body: 'A very helpful and responsive seller.' }));
    const conv = await call('buyer', 'POST', 'conversations', { contextType: 'listing', contextId: l.id });
    const msg = await call('buyer', 'POST', 'messages/' + conv.id, { body: 'Is the tote bag still available?' });
    ok(msg.id);
    await denied(() => call('other', 'GET', 'messages/' + conv.id), 404);
    await denied(() => call('other', 'POST', 'messages/' + conv.id, { body: 'intrusion' }), 404);
    // The Messages count is unread messages: the seller has one until the chat is opened; the buyer's own message does not count.
    const sellerChats = await call('seller', 'GET', 'conversations');
    ok(sellerChats.unread === 1 && sellerChats.items.find((x: Record<string, unknown>) => x.id === conv.id).unread === 1);
    ok((await call('buyer', 'GET', 'conversations')).unread === 0);
    ok((await call('seller', 'GET', 'messages/' + conv.id)).wasUnread === 1);
    ok((await call('seller', 'GET', 'conversations')).unread === 0);
    await call('buyer', 'POST', 'profiles/seller/reviews', { rating: 4, body: 'A very helpful and responsive seller.' });
    ok(Number((await call(null, 'GET', 'profiles/seller')).rating.average) === 4);
    await denied(() => call('buyer', 'POST', 'profiles/seller/reviews', { rating: 7, body: 'Some review body' }));
    await call('buyer', 'POST', 'reports', { targetType: 'message', targetId: msg.id, reason: 'Please review this sample conversation.' });
    ok((await call('admin', 'GET', 'admin/reports')).items[0].target.body.includes('tote'));
    await denied(() => call('other', 'GET', 'admin/users'), 403);
    await call('buyer', 'PUT', 'favorites/' + l.id, { saved: true });
    ok((await call('buyer', 'GET', 'favorites')).total == 1);
    ok((await call('seller', 'GET', 'favorites')).total == 0);
    await denied(() => call('seller', 'POST', 'payments', { purpose: 'slots', quantity: 2, reference: 'REF-TEST', ...proof }), 409);
    const settings = (await call('admin', 'GET', 'admin/settings')).settings;
    await call('admin', 'POST', 'admin/settings', { ...settings, freeListings: 1, paymentInstructions: 'Test-only external payment instructions.' });
    await denied(() => call('seller', 'POST', 'listings', listing), 409);
    const pay = await call('seller', 'POST', 'payments', { purpose: 'slots', quantity: 2, reference: 'REF-TEST', ...proof, amount: 1 });
    ok(pay.amount === 100);
    await denied(() => call('seller', 'POST', 'admin/payments/' + pay.id, { status: 'Approved' }), 403);
    await call('admin', 'POST', 'admin/payments/' + pay.id, { status: 'Approved' });
    await denied(() => call('admin', 'POST', 'admin/payments/' + pay.id, { status: 'Approved' }), 409);
    ok((await one(db as import('../lib/market/types').Database, 'SELECT extra_slots FROM profiles WHERE id=?', 'seller') as Record<string, unknown>)?.extra_slots === 2);
    const l2 = await call('seller', 'POST', 'listings', listing);
    ok(l2.id);
    const promo = await call('seller', 'POST', 'payments', { purpose: 'promotion', duration: 3, listingId: l.id, reference: 'PROMO-TEST', ...proof });
    ok(promo.amount === 350);
    await call('admin', 'POST', 'admin/payments/' + promo.id, { status: 'Approved' });
    ok((await call(null, 'GET', 'listings')).items.find((i: Record<string, unknown>) => i.id === l.id)?.featured);
    // The Premium strip lists only products with an active promotion.
    const premium = await call(null, 'GET', 'listings', {}, 'premium=1');
    ok(premium.items.length >= 1 && premium.items.every((i: Record<string, unknown>) => i.featured) && premium.items.some((i: Record<string, unknown>) => i.id === l.id));
    await call('seller', 'DELETE', 'listings/' + l2.id);
    await call('seller', 'DELETE', 'listings/' + l2.id);
    ok((await one(db as import('../lib/market/types').Database, 'SELECT used_slots FROM profiles WHERE id=?', 'seller') as Record<string, unknown>)?.used_slots === 1);
    // Payment details are cross-checked: a known method, the full amount, a sensible date and the seller's own receipt.
    type Row = Record<string, unknown>;
    const promoBody = { purpose: 'promotion', duration: 3, listingId: l.id };
    await denied(() => call('seller', 'POST', 'payments', { ...promoBody, ...proof, reference: 'NO-METHOD', method: 'Cash in hand' }));
    await denied(() => call('seller', 'POST', 'payments', { ...promoBody, ...proof, reference: 'TOO-LITTLE', paidAmount: 349 }));
    await denied(() => call('seller', 'POST', 'payments', { ...promoBody, ...proof, reference: 'FUTURE-DAY', paidOn: '2999-01-01' }));
    await denied(() => call('seller', 'POST', 'payments', { ...promoBody, ...proof, reference: 'NO-RECEIPT', receipt: '' }));
    await run(db, 'INSERT INTO uploads (id,owner,mime,size,created) VALUES (?,?,?,?,?)', 'receipt-other', 'other', 'image/png', 100, new Date().toISOString());
    await denied(() => call('seller', 'POST', 'payments', { ...promoBody, ...proof, reference: 'NOT-MINE', receipt: '/api/files/receipt-other' }));
    const payments = async () => (await call('admin', 'GET', 'admin/payments')).items as Row[];
    const promoRow = (await payments()).find(p => p.reference === 'PROMO-TEST')!;
    ok(promoRow.sender_account === '03001234567' && promoRow.method === 'JazzCash' && promoRow.paid_amount === 100000 && promoRow.receipt === '/api/files/receipt-seller');
    // Spotlight chosen on Sell Now: the listing waits, unseen by others, until the payment is approved.
    const held = await call('seller', 'POST', 'listings', { ...listing, title: 'Held for Spotlight', spotlight: { duration: 3, ...proof, reference: 'SPOT-1' } });
    ok(held.status === 'Awaiting payment');
    ok(!(await call(null, 'GET', 'listings')).items.some((i: Row) => i.id === held.id));
    await denied(() => call(null, 'GET', 'listings/' + held.id), 404);
    await denied(() => call('buyer', 'GET', 'listings/' + held.id), 404);
    ok((await call('seller', 'GET', 'listings/' + held.id)).id === held.id);
    const spot1 = (await payments()).find(p => p.reference === 'SPOT-1')!;
    ok(spot1.listing_id === held.id && spot1.status === 'Pending' && spot1.purpose === 'promotion');
    await call('admin', 'POST', 'admin/payments/' + spot1.id, { status: 'Approved' });
    ok((await call(null, 'GET', 'listings')).items.find((i: Row) => i.id === held.id)?.featured);
    // Rejected: the listing stays back, the seller is told why, and can publish it without the Spotlight.
    const held2 = await call('seller', 'POST', 'listings', { ...listing, title: 'Second Spotlight', spotlight: { duration: 3, ...proof, reference: 'SPOT-2' } });
    const spot2 = (await payments()).find(p => p.reference === 'SPOT-2')!;
    await call('admin', 'POST', 'admin/payments/' + spot2.id, { status: 'Rejected', note: 'No such transfer was found.' });
    ok(!(await call(null, 'GET', 'listings')).items.some((i: Row) => i.id === held2.id));
    ok(((await call('seller', 'GET', 'notifications')).items as Row[]).some(n => n.title === 'Payment rejected' && String(n.body).includes('not published yet')));
    await denied(() => call('buyer', 'POST', 'listings/' + held2.id + '/publish'));
    await call('seller', 'POST', 'listings/' + held2.id + '/publish');
    ok((await call(null, 'GET', 'listings')).items.some((i: Row) => i.id === held2.id));
    await denied(() => call('seller', 'POST', 'listings/' + held2.id + '/publish'), 409);
    // A Spotlight with bad payment details creates no listing and uses no slot.
    const usedBefore = (await one(db, 'SELECT used_slots FROM profiles WHERE id=?', 'seller'))!.used_slots;
    await denied(() => call('seller', 'POST', 'listings', { ...listing, spotlight: { duration: 3, ...proof, reference: 'SPOT-3', paidAmount: 1 } }));
    ok((await one(db, 'SELECT used_slots FROM profiles WHERE id=?', 'seller'))!.used_slots === usedBefore);
    await call('seller', 'DELETE', 'listings/' + held.id);
    await call('seller', 'DELETE', 'listings/' + held2.id);
    ok((await one(db, 'SELECT used_slots FROM profiles WHERE id=?', 'seller'))!.used_slots === 1);
    await call('admin', 'POST', 'admin/moderate', { type: 'user', id: 'seller', action: 'suspend', reason: 'Testing account moderation' });
    await denied(() => call('seller', 'GET', 'me'), 403);
    ok(!(await call(null, 'GET', 'listings')).items.some((i: Record<string, unknown>) => i.id === l.id));
    await call('admin', 'POST', 'admin/moderate', { type: 'user', id: 'seller', action: 'restore', reason: 'Testing account restoration' });
    // More than 500 unrelated records cannot clip a user's messages or listings.
    for (let start = 0; start < 520; start += 40)
        await db.batch(Array.from({ length: Math.min(40, 520 - start) }, (_, i) => db.prepare("INSERT INTO listings(id,owner,title,description,category,price,quantity,condition,location,images,status,created,updated) VALUES(?,?,?,?,?,1,1,'Good','Karachi','[]','Active',?,?)").bind('bulk' + (start + i), 'other', 'Sample ' + (start + i), 'Sample description', 'Books', new Date().toISOString(), new Date().toISOString())));
    ok((await call('seller', 'GET', 'listings', {}, 'mine=1')).total === 1);
    ok((await call('buyer', 'GET', 'messages/' + conv.id)).total === 1);
    const pages = await call(null, 'GET', 'listings', {}, 'size=60&page=9');
    ok(pages.total >= 520 && pages.items.length > 0);
    // Search, category/brand keywords, combined filters and every sorting mode.
    for (const term of ['Canvas', 'Test', 'Accessories'])
        ok((await call(null, 'GET', 'listings', {}, 'q=' + term)).items.some((v: Record<string, unknown>) => v.id === l.id));
    ok((await call(null, 'GET', 'listings', {}, 'category=Accessories&condition=Good&location=Karachi&min=1600&max=1800&type=preloved')).items[0].id === l.id);
    ok((await call(null, 'GET', 'listings', {}, 'category=Accessories&type=new')).total === 0);
    ok((await call(null, 'GET', 'listings', {}, 'q=' + encodeURIComponent("' OR 1=1 --"))).total === 0);
    for (const sort of ['low', 'high', 'newest', 'relevance'])
        ok((await call(null, 'GET', 'listings', {}, 'sort=' + sort)).items.length === 12);
    ok((await call(null, 'GET', 'listings', {}, 'page=1.5&size=12.5')).size === 12);
    await call('buyer', 'PUT', 'favorites/' + l.id, { saved: false });
    ok((await call('buyer', 'GET', 'favorites')).total == 0);
    await call('buyer', 'PATCH', 'profile', { name: 'Updated Buyer', bio: 'My buyer profile', location: 'Peshawar', avatar: '', role: 'both' });
    ok((await call('buyer', 'GET', 'me')).profile.name === 'Updated Buyer');
    await denied(() => call('buyer', 'PATCH', 'profile', { name: 'Wrong role', bio: '', location: '', avatar: '', role: 'admin' }));
    const r3 = await call('buyer', 'POST', 'requests', req);
    await call('buyer', 'PATCH', 'requests/' + r3.id, { ...req, price: 1200 });
    ok((await call('buyer', 'GET', 'requests/' + r3.id)).price === 1200);
    const editOffer = await call('seller', 'POST', 'requests/' + r3.id + '/offers', offer);
    await call('seller', 'PATCH', 'offers/' + editOffer.id, { ...offer, price: 650 });
    ok((await call('buyer', 'GET', 'offers', {}, 'request=' + r3.id)).items[0].price === 650);
    await call('seller', 'DELETE', 'offers/' + editOffer.id);
    ok((await call('seller', 'GET', 'offers', {}, 'request=' + r3.id)).items[0].status === 'Withdrawn');
    await call('buyer', 'POST', 'requests/' + r3.id + '/status', { status: 'Closed' });
    await denied(() => call('seller', 'POST', 'requests/' + r3.id + '/offers', offer), 409);
    const expired = await call('buyer', 'POST', 'requests', req);
    await run(db, 'UPDATE buyer_requests SET expiry=? WHERE id=?', '2000-01-01T00:00:00.000Z', expired.id);
    await denied(() => call('seller', 'POST', 'requests/' + expired.id + '/offers', offer), 409);
    const ns = await call('buyer', 'GET', 'notifications');
    ok(ns.items.some((n: Record<string, unknown>) => n.id === 'request-expired:' + expired.id && n.title === 'Request taken down' && String(n.body).startsWith('No offers came in')));
    // A request whose offers were never selected says so; an ended request can be posted again for a fresh 30 days.
    const unanswered = await call('buyer', 'POST', 'requests', req);
    await call('seller', 'POST', 'requests/' + unanswered.id + '/offers', offer);
    await denied(() => call('buyer', 'POST', 'requests/' + unanswered.id + '/repost'), 409);
    await run(db, 'UPDATE buyer_requests SET expiry=? WHERE id=?', '2000-01-01T00:00:00.000Z', unanswered.id);
    await call('other', 'GET', 'bootstrap');
    ok((await call('buyer', 'GET', 'requests/' + unanswered.id)).status === 'Expired');
    ok((await call('buyer', 'GET', 'notifications')).items.some((n: Record<string, unknown>) => n.id === 'request-expired:' + unanswered.id && String(n.body).startsWith('No offer was selected')));
    await denied(() => call('seller', 'POST', 'requests/' + unanswered.id + '/repost'), 403);
    const again = await call('buyer', 'POST', 'requests/' + unanswered.id + '/repost');
    const repost = await call('buyer', 'GET', 'requests/' + again.id);
    ok(repost.status === 'Open' && repost.title === req.title && Date.parse(repost.expiry) > Date.now() + 29 * 86400000);
    // Deleting a request with an open offer closes the offer and tells the seller.
    const lastOffer = await call('seller', 'POST', 'requests/' + again.id + '/offers', offer) as { id: string };
    await call('buyer', 'DELETE', 'requests/' + again.id);
    ok((await call('seller', 'GET', 'notifications')).items.some((n: Record<string, unknown>) => n.id === 'request-deleted:' + lastOffer.id && n.title === 'Request removed'));
    await call('buyer', 'PATCH', 'notifications/all');
    ok((await call('buyer', 'GET', 'bootstrap')).unread === 0);
    for (const request of [r, r2, r3]) {
        const before = (await call('buyer', 'GET', 'requests/' + request.id)).status;
        await call('admin', 'POST', 'admin/moderate', { type: 'request', id: request.id, action: 'hide', reason: 'Lifecycle regression check' });
        await denied(() => call(null, 'GET', 'requests/' + request.id), 404);
        await call('admin', 'POST', 'admin/moderate', { type: 'request', id: request.id, action: 'restore', reason: 'Lifecycle regression restore' });
        ok((await call('buyer', 'GET', 'requests/' + request.id)).status === before);
    }
    const reqConv = await call('seller', 'POST', 'conversations', { contextType: 'request', contextId: r3.id });
    ok(reqConv.id);
    const offerConv = await call('buyer', 'POST', 'conversations', { contextType: 'offer', contextId: o.id });
    ok(offerConv.id);
    await denied(() => call('other', 'POST', 'reports', { targetType: 'message', targetId: msg.id, reason: 'Unauthorized private message report' }), 404);
    await call('admin', 'POST', 'admin/moderate', { type: 'review', id: 'buyer:seller', action: 'hide', reason: 'Review visibility testing' });
    ok((await call(null, 'GET', 'profiles/seller')).rating.count == 0);
    await call('admin', 'POST', 'admin/moderate', { type: 'review', id: 'buyer:seller', action: 'restore', reason: 'Review visibility restored' });
    ok((await call(null, 'GET', 'profiles/seller')).rating.count == 1);
    await call('admin', 'POST', 'admin/moderate', { type: 'user', id: 'seller', action: 'verify', reason: 'Verified for testing' });
    ok((await call(null, 'GET', 'profiles/seller')).profile.verified === 1);
    await call('admin', 'POST', 'admin/moderate', { type: 'user', id: 'seller', action: 'warn', reason: 'Test account warning' });
    const rp = (await call('admin', 'GET', 'admin/reports')).items[0];
    await call('admin', 'POST', 'admin/moderate', { type: 'report', id: rp.id, action: 'resolve', reason: 'Reviewed and resolved report' });
    ok((await call('admin', 'GET', 'admin/reports')).items[0].status === 'Resolved');
    // Every moderation action tells the member what happened, to what, and why.
    const sellerNotes = (await call('seller', 'GET', 'notifications')).items as Record<string, unknown>[];
    ok(sellerNotes.some(n => n.title === 'Your account is now verified' && String(n.body).includes('Reason: Verified for testing')));
    ok(sellerNotes.some(n => n.title === 'A warning about your account' && String(n.body).includes('Reason: Test account warning')));
    ok((await call('buyer', 'GET', 'notifications')).items.some((n: Record<string, unknown>) => n.title === 'Your report was resolved' && String(n.body).includes('Reviewed and resolved report')));
    // Delete a listing: gone for everyone, the seller's slot is freed, the seller is told with the title and reason.
    const slotsBefore = Number((await call('seller', 'GET', 'me')).counts.listings);
    const doomed = await call('seller', 'POST', 'listings', { ...listing, title: 'Listing to be removed' });
    await denied(() => call('admin', 'POST', 'admin/moderate', { type: 'listing', id: doomed.id, action: 'archive', reason: 'Not a real action' }));
    await call('admin', 'POST', 'admin/moderate', { type: 'listing', id: doomed.id, action: 'delete', reason: 'Prohibited item in the photos' });
    await denied(() => call(null, 'GET', 'listings/' + doomed.id), 404);
    ok(Number((await call('seller', 'GET', 'me')).counts.listings) === slotsBefore);
    ok((await call('seller', 'GET', 'notifications')).items.some((n: Record<string, unknown>) => n.title === 'Your listing was removed' && String(n.body).includes('"Listing to be removed"') && String(n.body).includes('Reason: Prohibited item in the photos') && n.link_type === ''));
    await denied(() => call('admin', 'POST', 'admin/moderate', { type: 'listing', id: doomed.id, action: 'restore', reason: 'Deleted items stay deleted' }));
    // Cancel a request with an open offer: the buyer and the seller are both told; the offer is closed.
    const cancelled = await call('buyer', 'POST', 'requests', { ...req, title: 'Request the team cancels' });
    const openOffer = await call('seller', 'POST', 'requests/' + cancelled.id + '/offers', offer);
    await call('admin', 'POST', 'admin/moderate', { type: 'request', id: cancelled.id, action: 'cancel', reason: 'Duplicate of another request' });
    ok((await call('buyer', 'GET', 'requests/' + cancelled.id)).status === 'Cancelled');
    ok((await call('buyer', 'GET', 'notifications')).items.some((n: Record<string, unknown>) => n.title === 'Your request was cancelled' && String(n.body).includes('Reason: Duplicate of another request')));
    ok((await call('seller', 'GET', 'notifications')).items.some((n: Record<string, unknown>) => n.id === 'request-removed:' + openOffer.id && n.title === 'Request closed by the support team'));
    ok((await call('seller', 'GET', 'offers', {}, 'request=' + cancelled.id)).items[0].status === 'Not selected');
    // Delete a request.
    await call('admin', 'POST', 'admin/moderate', { type: 'request', id: cancelled.id, action: 'delete', reason: 'Removed after the duplicate check' });
    await denied(() => call('buyer', 'GET', 'requests/' + cancelled.id), 404);
    await denied(() => call('admin', 'POST', 'admin/moderate', { type: 'promotion', id: 'none', action: 'delete', reason: 'Promotions cannot be deleted' }));
    const reject = await call('seller', 'POST', 'payments', { purpose: 'slots', quantity: 1, reference: 'REJECT-ME', ...proof });
    await call('admin', 'POST', 'admin/payments/' + reject.id, { status: 'Rejected', note: 'Transfer not found' });
    ok((await call('seller', 'GET', 'services')).usage.extra_slots === 2);
    ok(Array.isArray((await call('admin', 'GET', 'admin/listings')).items[0].images));
    const conf = (await call('admin', 'GET', 'admin/settings')).settings;
    await denied(() => call('admin', 'POST', 'admin/settings', { ...conf, promotionDurations: [1, 1, 2] }));
    await call('admin', 'POST', 'admin/settings', { ...conf, promotionDurations: [2, 5, 10], promotionPlacement: 'badge-only' });
    await denied(() => call('seller', 'POST', 'payments', { purpose: 'promotion', duration: 3, listingId: l.id, reference: 'BAD-DURATION', ...proof }));
    const custom = await call('seller', 'POST', 'payments', { purpose: 'promotion', duration: 5, listingId: l.id, reference: 'CUSTOM-PROMO', ...proof });
    ok(custom.amount === 350);
    await call('admin', 'POST', 'admin/payments/' + custom.id, { status: 'Approved' });
    const promotion = await one(db, 'SELECT * FROM promotions WHERE id=?', custom.id);
    ok(Date.parse(promotion!.expires) - Date.parse(promotion!.starts) === 5 * 86400000);
    await call('admin', 'POST', 'admin/moderate', { type: 'promotion', id: custom.id, action: 'cancel', reason: 'Test promotion cancellation' });
    ok((await one(db, 'SELECT status FROM promotions WHERE id=?', custom.id))!.status === 'Cancelled');
    await run(db, 'UPDATE promotions SET expires=? WHERE id=?', '2000-01-01T00:00:00.000Z', promo.id);
    await call('seller', 'GET', 'services');
    ok((await one(db, 'SELECT status FROM promotions WHERE id=?', promo.id))!.status === 'Expired');
    ok(!(await call(null, 'GET', 'listings', {}, 'premium=1')).items.some((i: Record<string, unknown>) => i.id === l.id));
    await call('admin', 'POST', 'admin/categories', { id: 'books', name: 'Books', subcategories: ['Fiction'], active: false });
    await denied(() => call('buyer', 'POST', 'requests', req));
    await call('admin', 'POST', 'admin/categories', { id: 'books', name: 'Books', subcategories: ['Fiction'], active: true });
    const p1 = await call(null, 'GET', 'profiles/other', {}, 'listingPage=1'), p2 = await call(null, 'GET', 'profiles/other', {}, 'listingPage=2');
    ok(p1.activeListings === 520 && p2.listings.length === 12 && p1.listings[0].id !== p2.listings[0].id);
    for (const area of ['users', 'listings', 'requests', 'payments', 'reports', 'promotions', 'reviews', 'settings', 'audit', 'legacy', 'stats']) {
        ok(await call('admin', 'GET', 'admin/' + area));
        await denied(() => call('other', 'GET', 'admin/' + area), 403);
    }
    // The actual free tier boundary, rather than only a reduced test quota.
    users.capacity={userId:'capacity',displayName:'Capacity Seller',email:'capacity@example.test',role:'seller'};
    await call('capacity','GET','bootstrap');
    await call('admin','POST','admin/settings',{...conf,freeListings:25});
    const capacityIds=[];for(let i=0;i<25;i++)capacityIds.push((await call('capacity','POST','listings',{...listing,title:'Capacity item '+i})).id);
    ok((await call('capacity','GET','me')).counts.listings===25);await denied(()=>call('capacity','POST','listings',listing),409);
    await run(db,'INSERT INTO uploads (id,owner,mime,size,created) VALUES (?,?,?,?,?)','receipt-capacity','capacity','image/png',100,new Date().toISOString());
    await call('capacity','POST','payments',{purpose:'slots',quantity:1,...proof,reference:'CAP-SLOT',receipt:'/api/files/receipt-capacity'});
    await assert.rejects(()=>call('capacity','POST','listings',listing),e=>e instanceof MarketError&&e.status===409&&/waiting for verification/.test(e.message));checks++;
    await call('capacity','DELETE','listings/'+capacityIds[0]);ok((await call('capacity','POST','listings',listing)).id);
    ok((await call('buyer','GET','my-reviews')).items[0].seller_id==='seller');
    // Delete a review: it is gone, and the reviewer is told whose review and why.
    await call('admin','POST','admin/moderate',{type:'review',id:'buyer:seller',action:'delete',reason:'Personal details in the text'});
    ok((await call('buyer','GET','my-reviews')).total==0);ok((await call(null,'GET','profiles/seller')).rating.count==0);
    ok((await call('buyer','GET','notifications')).items.some((n:Record<string,unknown>)=>n.title==='Your review was removed'&&String(n.body).includes('Reason: Personal details in the text')));ok((await call('other','GET','my-reviews')).total===0);
    // Selected requests can be completed after their original response deadline.
    await run(db,'UPDATE buyer_requests SET expiry=? WHERE id=?','2000-01-01T00:00:00.000Z',r.id);
    await call('buyer','POST','requests/'+r.id+'/status',{status:'Closed'});ok((await call('buyer','GET','requests/'+r.id)).status==='Closed');
    await call('admin','POST','admin/moderate',{type:'request',id:r.id,action:'restore',reason:'Repeated restoration must not reopen'});ok((await call('buyer','GET','requests/'+r.id)).status==='Closed');
    const times = [];
    for (let n = 0; n < 30; n++) {
        const t = performance.now();
        await call(null, 'GET', 'listings', {}, 'q=Sample&sort=low');
        times.push(performance.now() - t);
    }
    times.sort((a, b) => a - b);
    console.log(label + ' local browse median=' + Math.round(times[15]) + 'ms p95=' + Math.round(times[28]) + 'ms, 520+ records');
    console.log(label + ': passed; browse timings ms ' + JSON.stringify(times.map(n => Math.round(n))));
}
const pg = new PGlite();
const pool: { query: (sql: string, args?: unknown[]) => Promise<{rows: unknown[]; rowCount: number | null}>; connect: () => Promise<unknown> } = { query: async (sql: string, args: unknown[] = []) => { const r = await pg.query(sql, args); return { rows: r.rows, rowCount: r.affectedRows ?? null }; }, connect: async () => ({ ...pool, release() { } }) };
await migrate(pool);
await suite(new PgDatabase(pool), 'PostgreSQL (PGlite)');
await pg.close();
console.log(checks + ' assertions passed on PostgreSQL.');
