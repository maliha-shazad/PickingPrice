import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir } from 'node:fs/promises';
import { market } from '../lib/market/router';
import { PgDatabase } from '../server/database';
import { migrate } from '../server/migrate';
import { one, run } from '../lib/market/core';
import { MarketError } from '../lib/market/types';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const wr = createRequire(require.resolve('wrangler/package.json'));
const { Miniflare } = wr('miniflare');
let checks = 0;
async function suite(db: unknown, label: string) {
    const users = Object.fromEntries(['buyer', 'seller', 'other', 'admin'].map(role => [role, { userId: role, displayName: role + ' Name', email: role + '@example.test', role: role === 'other' ? 'both' : role }]));
    const call = (who: string | null, method: string, path: string, body: Record<string, unknown> = {}, query = ''): Promise<unknown> => market({ db: db as import('../lib/market/types').Database, user: who ? { ...users[who] } : null }, method, path.split('/'), new URLSearchParams(query), body) as Promise<unknown>;
    const ok = (value: unknown) => { assert.ok(value); checks++; };
    const denied = async (fn: () => Promise<unknown>, status?: number) => { await assert.rejects(fn, e => e instanceof MarketError && (!status || e.status === status)); checks++; };
    for (const who of Object.keys(users))
        await call(who, 'GET', 'bootstrap');
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
    const req = { title: 'Looking for a good book', description: 'Looking for an interesting used novel.', category: 'Books', price: 900, quantity: 1, condition: 'Good', location: 'Lahore', image: '', expiry: new Date(Date.now() + 86400000).toISOString() };
    await denied(() => call('seller', 'POST', 'requests', req), 403);
    await denied(() => call('buyer', 'POST', 'requests', { ...req, expiry: '2000-01-01' }));
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
    await call('buyer', 'POST', 'profiles/seller/reviews', { rating: 4, body: 'A very helpful and responsive seller.' });
    ok(Number((await call(null, 'GET', 'profiles/seller')).rating.average) === 4);
    await denied(() => call('buyer', 'POST', 'profiles/seller/reviews', { rating: 7, body: 'Some review body' }));
    await call('buyer', 'POST', 'reports', { targetType: 'message', targetId: msg.id, reason: 'Please review this sample conversation.' });
    ok((await call('admin', 'GET', 'admin/reports')).items[0].target.body.includes('tote'));
    await denied(() => call('other', 'GET', 'admin/users'), 403);
    await call('buyer', 'PUT', 'favorites/' + l.id, { saved: true });
    ok((await call('buyer', 'GET', 'favorites')).total == 1);
    ok((await call('seller', 'GET', 'favorites')).total == 0);
    await denied(() => call('seller', 'POST', 'payments', { purpose: 'slots', quantity: 2, reference: 'REF-TEST' }), 409);
    const settings = (await call('admin', 'GET', 'admin/settings')).settings;
    await call('admin', 'POST', 'admin/settings', { ...settings, freeListings: 1, paymentInstructions: 'Test-only external payment instructions.' });
    await denied(() => call('seller', 'POST', 'listings', listing), 409);
    const pay = await call('seller', 'POST', 'payments', { purpose: 'slots', quantity: 2, reference: 'REF-TEST', amount: 1 });
    ok(pay.amount === 100);
    await denied(() => call('seller', 'POST', 'admin/payments/' + pay.id, { status: 'Approved' }), 403);
    await call('admin', 'POST', 'admin/payments/' + pay.id, { status: 'Approved' });
    await denied(() => call('admin', 'POST', 'admin/payments/' + pay.id, { status: 'Approved' }), 409);
    ok((await one(db as import('../lib/market/types').Database, 'SELECT extra_slots FROM profiles WHERE id=?', 'seller') as Record<string, unknown>)?.extra_slots === 2);
    const l2 = await call('seller', 'POST', 'listings', listing);
    ok(l2.id);
    const promo = await call('seller', 'POST', 'payments', { purpose: 'promotion', duration: 3, listingId: l.id, reference: 'PROMO-TEST' });
    ok(promo.amount === 350);
    await call('admin', 'POST', 'admin/payments/' + promo.id, { status: 'Approved' });
    ok((await call(null, 'GET', 'listings')).items.find((i: Record<string, unknown>) => i.id === l.id)?.featured);
    await call('seller', 'DELETE', 'listings/' + l2.id);
    await call('seller', 'DELETE', 'listings/' + l2.id);
    ok((await one(db as import('../lib/market/types').Database, 'SELECT used_slots FROM profiles WHERE id=?', 'seller') as Record<string, unknown>)?.used_slots === 1);
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
    ok(ns.items.some((n: Record<string, unknown>) => n.id === 'request-expired:' + expired.id));
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
    const reject = await call('seller', 'POST', 'payments', { purpose: 'slots', quantity: 1, reference: 'REJECT-ME' });
    await call('admin', 'POST', 'admin/payments/' + reject.id, { status: 'Rejected', note: 'Transfer not found' });
    ok((await call('seller', 'GET', 'services')).usage.extra_slots === 2);
    ok(Array.isArray((await call('admin', 'GET', 'admin/listings')).items[0].images));
    const conf = (await call('admin', 'GET', 'admin/settings')).settings;
    await denied(() => call('admin', 'POST', 'admin/settings', { ...conf, promotionDurations: [1, 1, 2] }));
    await call('admin', 'POST', 'admin/settings', { ...conf, promotionDurations: [2, 5, 10], promotionPlacement: 'badge-only' });
    await denied(() => call('seller', 'POST', 'payments', { purpose: 'promotion', duration: 3, listingId: l.id, reference: 'BAD-DURATION' }));
    const custom = await call('seller', 'POST', 'payments', { purpose: 'promotion', duration: 5, listingId: l.id, reference: 'CUSTOM-PROMO' });
    ok(custom.amount === 350);
    await call('admin', 'POST', 'admin/payments/' + custom.id, { status: 'Approved' });
    const promotion = await one(db, 'SELECT * FROM promotions WHERE id=?', custom.id);
    ok(Date.parse(promotion!.expires) - Date.parse(promotion!.starts) === 5 * 86400000);
    await call('admin', 'POST', 'admin/moderate', { type: 'promotion', id: custom.id, action: 'cancel', reason: 'Test promotion cancellation' });
    ok((await one(db, 'SELECT status FROM promotions WHERE id=?', custom.id))!.status === 'Cancelled');
    await run(db, 'UPDATE promotions SET expires=? WHERE id=?', '2000-01-01T00:00:00.000Z', promo.id);
    await call('seller', 'GET', 'services');
    ok((await one(db, 'SELECT status FROM promotions WHERE id=?', promo.id))!.status === 'Expired');
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
    await call('capacity','DELETE','listings/'+capacityIds[0]);ok((await call('capacity','POST','listings',listing)).id);
    ok((await call('buyer','GET','my-reviews')).items[0].seller_id==='seller');ok((await call('other','GET','my-reviews')).total===0);
    // Selected requests can be completed after their original response deadline.
    await run(db,'UPDATE buyer_requests SET expiry=? WHERE id=?','2000-01-01T00:00:00.000Z',r.id);
    await call('buyer','POST','requests/'+r.id+'/status',{status:'Closed'});ok((await call('buyer','GET','requests/'+r.id)).status==='Closed');
    await call('admin','POST','admin/moderate',{type:'request',id:r.id,action:'restore',reason:'Repeated restoration must not reopen'});ok((await call('buyer','GET','requests/'+r.id)).status==='Closed');
    // Retries and concurrency at the D1 transaction boundary cannot over-allocate.
    if(label==='Cloudflare D1'){
      await call('admin','POST','admin/settings',{...conf,freeListings:26});
      const attempts=await Promise.allSettled([call('capacity','POST','listings',listing),call('capacity','POST','listings',listing)]);
      ok(attempts.filter(x=>x.status==='fulfilled').length===1);ok((await call('capacity','GET','me')).counts.listings===26);
      const references=await Promise.allSettled([call('seller','POST','payments',{purpose:'slots',quantity:1,reference:'RACE-REF'}),call('seller','POST','payments',{purpose:'slots',quantity:1,reference:'RACE-REF'})]);
      ok(references.filter(x=>x.status==='fulfilled').length===1);
    }
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
const mf = new Miniflare({ modules: true, script: 'export default {fetch(){return new Response("test")}}', compatibilityDate: '2026-05-15', d1Databases: ['DB'], cf: false });
try {
    const db = await mf.getD1Database('DB');
    for (const f of (await readdir('drizzle')).filter(f => f.endsWith('.sql')).sort()) {
        for (const sql of (await readFile('drizzle/' + f, 'utf8')).split('--> statement-breakpoint').filter(x => x.trim()))
            await db.prepare(sql).run();
    }
    await suite(db, 'Cloudflare D1');
}
finally {
    await mf.dispose();
}
console.log(checks + ' assertions passed across both database engines.');
