import { Context, MarketError, id, now, pageOf, Row } from './types';
import { authenticated, permit, owned, one, rows, run, stmt, notice, pagination, uploadCheck } from './core';
import { offerSchema, messageSchema, reviewSchema, profileSchema, validate, stringValue } from './validation';
export async function requestStatus(c: Context, key: string, body: Record<string, unknown>) { permit(c, 'buyer'); const r = await owned(c, 'buyer_requests', key); const status = body.status; const allowed = ['Closed', 'Cancelled', 'Seller Selected']; if (!allowed.includes(String(status)))
    throw new MarketError('Choose close, cancel or select seller.'); if (['Closed', 'Cancelled', 'Expired', 'Hidden', 'Deleted'].includes(r.status) || (r.expiry <= now() && r.status!=='Seller Selected'))
    throw new MarketError('This request is no longer active.', 409); if (status === 'Seller Selected') {
    if (!['Open', 'Responses Received'].includes(r.status))
        throw new MarketError('A seller has already been selected.', 409);
    const offer = await one(c.db, "SELECT * FROM seller_offers WHERE id=? AND request_id=? AND status='Pending'", body.offerId || '', key);
    if (offer && !await one(c.db, 'SELECT id FROM profiles WHERE id=? AND suspended=0', offer.owner))
        throw new MarketError('This seller is currently unavailable.', 409);
    if (!offer)
        throw new MarketError('Choose an active offer for this request.');
    const result = await c.db.batch([stmt(c.db, "UPDATE buyer_requests SET status='Seller Selected',selected_offer=?,updated=? WHERE id=? AND status IN ('Open','Responses Received') AND expiry>? RETURNING id", offer.id, now(), key, now()), stmt(c.db, "UPDATE seller_offers SET status=CASE WHEN id=? THEN 'Selected' ELSE 'Not selected' END,updated=? WHERE request_id=? AND status='Pending' AND EXISTS (SELECT 1 FROM buyer_requests WHERE id=? AND selected_offer=?)", offer.id, now(), key, key, offer.id), stmt(c.db, "INSERT INTO notifications (id,owner,title,body,link_type,link_id,read,created) SELECT ?,?,'Your offer was selected',?,'request',?,0,? WHERE EXISTS (SELECT 1 FROM buyer_requests WHERE id=? AND selected_offer=?) ON CONFLICT(id) DO NOTHING", 'selected:' + key, offer.owner, r.title, key, now(), key, offer.id)]);
    if (!result[0].results?.length)
        throw new MarketError('The request changed. Refresh and try again.', 409);
}
else {
    await c.db.batch([stmt(c.db, 'UPDATE buyer_requests SET status=?,updated=? WHERE id=?', status, now(), key), stmt(c.db, "INSERT INTO notifications (id,owner,title,body,link_type,link_id,read,created) SELECT ?||id,owner,?,?,'request',?,0,? FROM seller_offers WHERE request_id=? ON CONFLICT(id) DO NOTHING", status + ':', `Request ${status.toLowerCase()}`, r.title, key, now(), key)]);
} return { ok: true }; }
export async function offers(c: Context, q: URLSearchParams) { const u = authenticated(c), { page, size, offset } = pageOf(q); const request = q.get('request'); let where = 'o.owner=?'; let args: unknown[] = [u.userId]; if (request) {
    const r = await one(c.db, 'SELECT owner FROM buyer_requests WHERE id=?', request);
    if (!r)
        throw new MarketError('Request not found.', 404);
    where = r.owner === u.userId || u.role === 'admin' ? 'o.request_id=?' : 'o.request_id=? AND o.owner=?';
    args = r.owner === u.userId || u.role === 'admin' ? [request] : [request, u.userId];
}
else if (q.get('received') === '1') {
    where = 'r.owner=?';
} const sql = ' FROM seller_offers o JOIN buyer_requests r ON r.id=o.request_id JOIN profiles p ON p.id=o.owner WHERE ' + where; const order = q.get('sort') === 'low' ? 'o.price ASC' : 'o.created DESC'; return pagination(c.db, 'SELECT o.*,r.title request_title,r.owner buyer,p.name seller,p.verified' + sql + ' ORDER BY ' + order, 'SELECT COUNT(*) n' + sql, args, page, size, offset); }
export async function saveOffer(c: Context, requestId: string, body: Record<string, unknown>, key?: string) {
    const u = permit(c, 'seller'), d = validate(offerSchema, body);
    await uploadCheck(c, [d.image || '']);
    const r = await one(c.db, 'SELECT r.* FROM buyer_requests r JOIN profiles p ON p.id=r.owner WHERE r.id=? AND p.suspended=0', requestId);
    if (!r || !['Open', 'Responses Received'].includes(r.status) || r.expiry <= now())
        throw new MarketError('Only active requests can receive offers.', 409);
    if (r.owner === u.userId)
        throw new MarketError('You cannot respond to your own request.');
    if (key) {
        await owned(c, 'seller_offers', key);
        const result = await one(c.db, "UPDATE seller_offers SET price=?,description=?,image=?,updated=? WHERE id=? AND owner=? AND request_id=? AND status='Pending' RETURNING id", d.price, d.description, d.image, now(), key, u.userId, requestId);
        if (!result)
            throw new MarketError('This offer cannot be edited.', 409);
        return { id: key };
    }
    const keyNew = id(), t = now();
    const result = await c.db.batch([stmt(c.db, "INSERT INTO seller_offers (id,request_id,owner,price,description,image,status,created,updated) SELECT ?,?,?,?,?,?,'Pending',?,? FROM buyer_requests WHERE id=? AND status IN ('Open','Responses Received') AND expiry>? AND NOT EXISTS (SELECT 1 FROM seller_offers WHERE request_id=? AND owner=? AND status='Pending') ON CONFLICT DO NOTHING RETURNING id", keyNew, requestId, u.userId, d.price, d.description, d.image, t, t, requestId, t, requestId, u.userId), stmt(c.db, "UPDATE buyer_requests SET status='Responses Received',updated=? WHERE id=? AND status='Open' AND EXISTS (SELECT 1 FROM seller_offers WHERE id=?)", t, requestId, keyNew), stmt(c.db, "INSERT INTO notifications (id,owner,title,body,link_type,link_id,read,created) SELECT ?,?,'New seller offer',?,'request',?,0,? WHERE EXISTS (SELECT 1 FROM seller_offers WHERE id=?)", 'offer:' + keyNew, r.owner, r.title, requestId, t, keyNew)]);
    if (!result[0].results?.length)
        throw new MarketError('You already have an active offer, or the request has closed.', 409);
    return { id: keyNew };
}
export async function withdrawOffer(c: Context, key: string) { const r = await owned(c, 'seller_offers', key); if (r.status !== 'Pending')
    throw new MarketError('Only pending offers can be withdrawn.'); await run(c.db, "UPDATE seller_offers SET status='Withdrawn',updated=? WHERE id=? AND status='Pending'", now(), key); return { ok: true }; }
export async function profile(c: Context, key: string, q: URLSearchParams) { const p = await one(c.db, 'SELECT id,name,role,location,bio,avatar,verified,suspended,created FROM profiles WHERE id=?', key); if (!p || p.suspended && c.user?.userId !== key && c.user?.role !== 'admin')
    throw new MarketError('Profile unavailable.', 404); const rating = await one(c.db, 'SELECT AVG(rating) average,COUNT(*) count FROM reviews WHERE seller_id=? AND hidden=0', key); const { page, size, offset } = pageOf(q); const reviewPage = await pagination(c.db, 'SELECT r.*,p.name reviewer FROM reviews r JOIN profiles p ON p.id=r.owner WHERE r.seller_id=? AND r.hidden=0 ORDER BY r.created DESC', 'SELECT COUNT(*) n FROM reviews r WHERE r.seller_id=? AND r.hidden=0', [key], page, size, offset); const listingPage = Math.max(1, Math.floor(Number(q.get('listingPage'))) || 1); const items = await rows(c.db, "SELECT * FROM listings WHERE owner=? AND status='Active' ORDER BY created DESC,id DESC LIMIT 12 OFFSET ?", key, (listingPage - 1) * 12); return { profile: p, rating, reviews: reviewPage, listingPage, listings: items.map(r => ({ ...r, images: JSON.parse(r.images) })), activeListings: Number((await one(c.db, "SELECT COUNT(*) n FROM listings WHERE owner=? AND status='Active'", key))!.n) }; }
export async function saveProfile(c: Context, body: Record<string, unknown>) { const u = authenticated(c), d = validate(profileSchema, body); await uploadCheck(c, [String(d.avatar)]); await c.db.batch([stmt(c.db, 'UPDATE profiles SET name=?,role=?,location=?,bio=?,avatar=?,phone=?,whatsapp=?,meetup_spot=? WHERE id=?', d.name, d.role, d.location, d.bio, d.avatar, d.phone, d.whatsapp, d.meetup_spot, u.userId), stmt(c.db, 'UPDATE accounts SET name=?,role=? WHERE id=?', d.name, u.role === 'admin' ? 'admin' : d.role, u.userId)]); return { ok: true }; }
export async function review(c: Context, seller: string, body: Record<string, unknown>) { const u = permit(c, 'buyer'), d = validate(reviewSchema, body); if (seller === u.userId)
    throw new MarketError('You cannot review yourself.'); const p = await one(c.db, "SELECT id FROM profiles WHERE id=? AND suspended=0 AND role IN ('seller','both')", seller); if (!p)
    throw new MarketError('Seller unavailable.', 404); const interaction = await one(c.db, 'SELECT id FROM conversations WHERE (first_user=? AND second_user=?) OR (first_user=? AND second_user=?)', u.userId, seller, seller, u.userId); if (!interaction)
    throw new MarketError('Contact this seller before reviewing your interaction.'); const key = u.userId + ':' + seller; await c.db.batch([stmt(c.db, 'INSERT INTO reviews (id,owner,seller_id,rating,body,hidden,created) VALUES (?,?,?,?,?,0,?) ON CONFLICT(id) DO UPDATE SET rating=excluded.rating,body=excluded.body', key, u.userId, seller, d.rating, d.body, now()), notice(c.db, seller, 'New review', 'A buyer reviewed their interaction with you.', 'profile', seller, 'review:' + key)]); return { ok: true }; }
export async function conversation(c: Context, body: Record<string, unknown>) { const u = authenticated(c); const type = body.contextType, key = stringValue(body.contextId, 1, 160); let recipient = '', title = ''; if (type === 'listing') {
    const r = await one(c.db, "SELECT owner,title FROM listings WHERE id=? AND status='Active'", key);
    if (!r)
        throw new MarketError('Listing unavailable.', 404);
    recipient = r.owner;
    title = r.title;
}
else if (type === 'request') {
    permit(c, 'seller');
    const r = await one(c.db, "SELECT owner,title FROM buyer_requests WHERE id=? AND status NOT IN ('Deleted','Hidden')", key);
    if (!r)
        throw new MarketError('Request unavailable.', 404);
    recipient = r.owner;
    title = r.title;
}
else if (type === 'offer') {
    const r = await one(c.db, 'SELECT o.owner,r.owner buyer,r.title FROM seller_offers o JOIN buyer_requests r ON r.id=o.request_id WHERE o.id=?', key);
    if (!r || ![r.owner, r.buyer].includes(u.userId))
        throw new MarketError('You cannot access this offer.', 403);
    recipient = r.owner === u.userId ? r.buyer : r.owner;
    title = r.title;
}
else
    throw new MarketError('Choose a listing, request or offer to discuss.'); if (recipient === u.userId)
    throw new MarketError('You cannot message yourself.'); if (!await one(c.db, 'SELECT id FROM profiles WHERE id=? AND suspended=0', recipient))
    throw new MarketError('Recipient unavailable.', 404); const participants = [u.userId, recipient].sort(), convKey = participants.join(':') + ':' + type + ':' + key; await run(c.db, 'INSERT INTO conversations (id,first_user,second_user,context_type,context_id,title,updated) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING', convKey, participants[0], participants[1], type, key, title, now()); return { id: convKey }; }
/** The product, buyer request or offer a conversation is about: enough to show it beside the chat. */
async function conversationContext(c: Context, conv: Row) {
    const firstImage = (v: unknown) => { try { const a = typeof v === 'string' ? JSON.parse(v) : v; return Array.isArray(a) && a.length ? String(a[0]) : ''; } catch { return ''; } };
    if (conv.context_type === 'listing') {
        const r = await one(c.db, 'SELECT id,title,price,images,status,condition,location FROM listings WHERE id=?', conv.context_id);
        return r ? { kind: 'listing', id: r.id, title: r.title, price: Number(r.price), image: firstImage(r.images), status: r.status, condition: r.condition, location: r.location, available: r.status === 'Active' } : null;
    }
    if (conv.context_type === 'request') {
        const r = await one(c.db, 'SELECT id,title,price,image,status,condition,location FROM buyer_requests WHERE id=?', conv.context_id);
        return r ? { kind: 'request', id: r.id, title: r.title, price: Number(r.price), image: r.image || '', status: r.status, condition: r.condition, location: r.location, available: !['Deleted', 'Hidden'].includes(r.status) } : null;
    }
    if (conv.context_type === 'offer') {
        const r = await one(c.db, 'SELECT r.id,r.title,o.price,o.image,o.status,r.status request_status,r.location FROM seller_offers o JOIN buyer_requests r ON r.id=o.request_id WHERE o.id=?', conv.context_id);
        return r ? { kind: 'offer', id: r.id, title: r.title, price: Number(r.price), image: r.image || '', status: r.status, condition: '', location: r.location, available: !['Deleted', 'Hidden'].includes(r.request_status) } : null;
    }
    return null;
}
export async function conversationList(c: Context, q: URLSearchParams) { const u = authenticated(c), { page, size, offset } = pageOf(q); return pagination(c.db, 'SELECT c.*,p.name other_name FROM conversations c JOIN profiles p ON p.id=CASE WHEN c.first_user=? THEN c.second_user ELSE c.first_user END WHERE c.first_user=? OR c.second_user=? ORDER BY c.updated DESC', 'SELECT COUNT(*) n FROM conversations c JOIN profiles p ON p.id=CASE WHEN c.first_user=? THEN c.second_user ELSE c.first_user END WHERE c.first_user=? OR c.second_user=?', [u.userId, u.userId, u.userId], page, size, offset).then(async result => ({ ...result, items: await Promise.all(result.items.map(async (conv: Row) => ({ ...conv, context: await conversationContext(c, conv) }))) })); }
export async function getConversation(c: Context, key: string) { const u = authenticated(c), r = await one(c.db, 'SELECT * FROM conversations WHERE id=?', key); if (!r || ![r.first_user, r.second_user].includes(u.userId))
    throw new MarketError('Conversation unavailable.', 404); return r; }
export async function messageList(c: Context, key: string, q: URLSearchParams) { const conv = await getConversation(c, key), { page, size, offset } = pageOf(q);
    // Opening the chat is what marks the other person's messages as read.
    const me = c.user!.userId, them = conv.first_user === me ? conv.second_user : conv.first_user;
    await run(c.db, 'INSERT INTO conversation_reads (id,conversation_id,owner,read_at) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET read_at=excluded.read_at', key + ':' + me, key, me, now());
    // ...and clears this chat's "New message" notifications from the bell; `cleared` tells the page to update its count.
    const cleared = Number((await one(c.db, "SELECT COUNT(*) n FROM notifications WHERE owner=? AND link_type='conversation' AND link_id=? AND read=0", me, key))!.n);
    if (cleared)
        await run(c.db, "UPDATE notifications SET read=1 WHERE owner=? AND link_type='conversation' AND link_id=? AND read=0", me, key);
    const seen = (await one(c.db, 'SELECT read_at FROM conversation_reads WHERE id=?', key + ':' + them))?.read_at || '';
    const result = await pagination(c.db, 'SELECT m.*,p.name sender FROM chat_messages m JOIN profiles p ON p.id=m.owner WHERE m.conversation_id=? ORDER BY m.created DESC,m.id DESC', 'SELECT COUNT(*) n FROM chat_messages WHERE conversation_id=?', [key], page, size, offset); const other = await one(c.db, 'SELECT name,avatar FROM profiles WHERE id=?', conv.first_user === c.user!.userId ? conv.second_user : conv.first_user); return { ...result, cleared, items: result.items.map((m: Row) => ({ ...m, read: m.owner === me && !!seen && m.created <= seen })), conversation: { ...conv, other_name: other?.name || 'Member', other_avatar: other?.avatar || '', context: await conversationContext(c, conv) } }; }
export async function sendMessage(c: Context, key: string, body: Record<string, unknown>) { const u = authenticated(c), conv = await getConversation(c, key), d = validate(messageSchema, body); const recipient = conv.first_user === u.userId ? conv.second_user : conv.first_user; if (!await one(c.db, 'SELECT id FROM profiles WHERE id=? AND suspended=0', recipient))
    throw new MarketError('Recipient unavailable.', 404); const keyNew = id(), t = now(); await c.db.batch([stmt(c.db, 'INSERT INTO chat_messages (id,conversation_id,owner,body,created) VALUES (?,?,?,?,?)', keyNew, key, u.userId, d.body, t), stmt(c.db, 'UPDATE conversations SET updated=? WHERE id=?', t, key), notice(c.db, recipient, 'New message', `${u.displayName}: ${d.body.slice(0, 100)}`, 'conversation', key, 'message:' + keyNew)]); return { id: keyNew }; }
export async function report(c: Context, body: Record<string, unknown>) { const u = authenticated(c), reason = stringValue(body.reason, 10, 2000), key = body.targetType === 'general' ? 'site' : stringValue(body.targetId, 1, 400); const tables: Record<string, string> = { listing: 'listings', request: 'buyer_requests', message: 'chat_messages', user: 'profiles', review: 'reviews' }; if (body.targetType === 'general') {
    // A problem with the site itself (footer > Report a Problem): nothing to look up.
    await run(c.db, 'INSERT INTO reports (id,owner,target_type,target_id,reason,status,created) VALUES (?,?,?,?,?,?,?)', id(), u.userId, 'general', 'site', reason, 'Open', now());
    return { ok: true };
} const table = tables[String(body.targetType)]; if (!table)
    throw new MarketError('Invalid report target.'); const target = await one(c.db, `SELECT * FROM ${table} WHERE id=?`, key); if (!target)
    throw new MarketError('The reported item does not exist.', 404); if (body.targetType === 'message')
    await getConversation(c, target.conversation_id); await run(c.db, 'INSERT INTO reports (id,owner,target_type,target_id,reason,status,created) VALUES (?,?,?,?,?,?,?)', id(), u.userId, body.targetType, key, reason, 'Open', now()); return { ok: true }; }
export async function notificationList(c: Context, q: URLSearchParams) { const u = authenticated(c), { page, size, offset } = pageOf(q); return pagination(c.db, 'SELECT * FROM notifications WHERE owner=? ORDER BY created DESC,id DESC', 'SELECT COUNT(*) n FROM notifications WHERE owner=?', [u.userId], page, size, offset); }
export async function readNotification(c: Context, key: string) { const u = authenticated(c); if (key === 'all')
    await run(c.db, 'UPDATE notifications SET read=1 WHERE owner=?', u.userId);
else
    await run(c.db, 'UPDATE notifications SET read=1 WHERE id=? AND owner=?', key, u.userId); return { ok: true }; }

// ---- Request drafts: a buyer's unfinished Post a Request form, kept for later ----
const MAX_DRAFTS = 20;
const text = (v: unknown, max: number) => (typeof v === 'string' ? v : '').slice(0, max);
function draftData(body: Record<string, unknown>) {
    const d = (body.data && typeof body.data === 'object' && !Array.isArray(body.data) ? body.data : {}) as Record<string, unknown>;
    const quantity = Math.round(Number(d.quantity));
    return {
        title: text(d.title, 120).trim(), quantity: Number.isFinite(quantity) ? Math.min(10000, Math.max(1, quantity)) : 1,
        domain: text(d.domain, 80), subcategory: text(d.subcategory, 80), size: text(d.size, 40), condition: text(d.condition, 40),
        budget: text(String(d.budget ?? ''), 12).replace(/[^0-9]/g, ''), negotiable: d.negotiable !== false, notes: text(d.notes, 3000), handover: text(d.handover, 40),
        location: text(d.location, 80).trim(), expiry: /^\d{4}-\d{2}-\d{2}$/.test(text(d.expiry, 10)) ? text(d.expiry, 10) : '',
        images: (Array.isArray(d.images) ? d.images : []).filter((x): x is string => typeof x === 'string' && x.length > 0 && x.length <= 300).slice(0, 6),
    };
}
export async function draftList(c: Context) {
    const u = authenticated(c);
    const items = await rows(c.db, 'SELECT id,title,data,updated FROM request_drafts WHERE owner=? ORDER BY updated DESC LIMIT ?', u.userId, MAX_DRAFTS);
    return { items: items.map((r: Row) => { let data = {}; try { data = JSON.parse(r.data); } catch { } return { id: r.id, title: r.title, updated: r.updated, data }; }), total: items.length, limit: MAX_DRAFTS };
}
export async function saveDraft(c: Context, body: Record<string, unknown>) {
    const u = permit(c, 'buyer'), data = draftData(body);
    if (!data.title && !data.notes && !data.budget && !data.images.length)
        throw new MarketError('Add a title, a budget or a note before saving a draft.');
    await uploadCheck(c, data.images);
    const key = typeof body.id === 'string' && body.id ? body.id : '';
    if (key) {
        const old = await one(c.db, 'SELECT owner FROM request_drafts WHERE id=?', key);
        if (!old || old.owner !== u.userId)
            throw new MarketError('This draft is no longer available.', 404);
        await run(c.db, 'UPDATE request_drafts SET title=?,data=?,updated=? WHERE id=?', data.title, JSON.stringify(data), now(), key);
        return { id: key };
    }
    const count = Number((await one(c.db, 'SELECT COUNT(*) n FROM request_drafts WHERE owner=?', u.userId))!.n);
    if (count >= MAX_DRAFTS)
        throw new MarketError('You can keep up to ' + MAX_DRAFTS + ' drafts. Delete one to save another.');
    const keyNew = id();
    await run(c.db, 'INSERT INTO request_drafts (id,owner,title,data,updated) VALUES (?,?,?,?,?)', keyNew, u.userId, data.title, JSON.stringify(data), now());
    return { id: keyNew };
}
export async function deleteDraft(c: Context, key: string) {
    const u = authenticated(c);
    await run(c.db, 'DELETE FROM request_drafts WHERE id=? AND owner=?', key, u.userId);
    return { ok: true };
}
