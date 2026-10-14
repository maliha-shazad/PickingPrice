import { Context, MarketError, id, now, pageOf } from './types';
import { permit, owned, one, rows, stmt, configuration, pagination, log } from './core';
import { stringValue } from './validation';
export async function services(c: Context, q: URLSearchParams) { const u = permit(c, 'seller'), { page, size, offset } = pageOf(q); const p = await one(c.db, 'SELECT used_slots,extra_slots FROM profiles WHERE id=?', u.userId); return { settings: await configuration(c.db), usage: p, payments: await pagination(c.db, 'SELECT * FROM payment_requests WHERE owner=? ORDER BY created DESC', 'SELECT COUNT(*) n FROM payment_requests WHERE owner=?', [u.userId], page, size, offset), promotionPage: Math.max(1, Math.floor(Number(q.get('promotionPage'))) || 1), promotionTotal: Number((await one(c.db, 'SELECT COUNT(*) n FROM promotions WHERE owner=?', u.userId))!.n), promotions: await rows(c.db, 'SELECT p.*,l.title FROM promotions p JOIN listings l ON l.id=p.listing_id WHERE p.owner=? ORDER BY p.expires DESC LIMIT 12 OFFSET ?', u.userId, (Math.max(1, Math.floor(Number(q.get('promotionPage'))) || 1) - 1) * 12) }; }
export async function requestPayment(c: Context, body: Record<string, unknown>) { const u = permit(c, 'seller'), conf = await configuration(c.db); if (!conf.paymentInstructions.trim())
    throw new MarketError('The administrator has not configured payment instructions yet.', 409); const reference = stringValue(body.reference, 4, 120); const purpose = body.purpose; let quantity = 1, duration = 0, listingId = '', amount = 0; if (purpose === 'slots') {
    quantity = Number(body.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100)
        throw new MarketError('Choose 1–100 listing slots.');
    amount = conf.extraListingPrice * quantity;
}
else if (purpose === 'promotion') {
    duration = Number(body.duration);
    if (!conf.promotionDurations.includes(duration))
        throw new MarketError('Choose one of the configured promotion durations.');
    listingId = stringValue(body.listingId, 1, 160);
    const listing = await owned(c, 'listings', listingId);
    if (listing.owner !== u.userId || listing.status !== 'Active')
        throw new MarketError('Choose your own active listing.');
    amount = [conf.promotion24h, conf.promotion3d, conf.promotion7d][conf.promotionDurations.indexOf(duration)];
}
else
    throw new MarketError('Choose a valid service.'); if (await one(c.db, "SELECT id FROM payment_requests WHERE reference=? AND status!='Rejected'", reference))
    throw new MarketError('This payment reference has already been submitted.', 409); const key = id(); const inserted = await one(c.db, "INSERT INTO payment_requests (id,owner,purpose,quantity,duration,listing_id,amount,reference,status,created) VALUES (?,?,?,?,?,?,?,?,'Pending',?) ON CONFLICT DO NOTHING RETURNING id", key, u.userId, purpose, quantity, duration, listingId, amount, reference, now()); if (!inserted)
    throw new MarketError('This payment reference has already been submitted.', 409); return { id: key, amount, status: 'Pending' }; }
export async function decidePayment(c: Context, key: string, body: Record<string, unknown>) {
    const u = permit(c, 'admin'), payment = await one(c.db, 'SELECT * FROM payment_requests WHERE id=?', key);
    if (!payment)
        throw new MarketError('Payment request not found.', 404);
    if (payment.status !== 'Pending')
        throw new MarketError('This payment has already been reviewed.', 409);
    if (!['Approved', 'Rejected'].includes(body.status))
        throw new MarketError('Choose approve or reject.');
    const note = stringValue(body.note || '', body.status === 'Rejected' ? 5 : 0, 1000);
    if (body.status === 'Approved' && payment.amount < 1)
        throw new MarketError('This legacy enquiry has no valid amount. Reject it and request a new submission.');
    if (body.status === 'Approved' && payment.purpose === 'promotion') {
        const l = await one(c.db, "SELECT id FROM listings WHERE id=? AND owner=? AND status='Active'", payment.listing_id, payment.owner);
        if (!l)
            throw new MarketError('The listing is no longer active. Reject this request.');
    }
    const token = id(), t = now();
    const previous = payment.purpose === 'promotion' ? await one(c.db, "SELECT MAX(expires) expiry FROM promotions WHERE listing_id=? AND status='Active'", payment.listing_id) : null;
    const start = previous?.expiry && previous.expiry > t ? previous.expiry : t;
    const expires = new Date(Date.parse(start) + payment.duration * 86400000).toISOString();
    const ops = [stmt(c.db, "UPDATE payment_requests SET status=?,note=?,verified_at=?,verified_by=?,approval_token=? WHERE id=? AND status='Pending' RETURNING id", body.status, note, t, u.userId, token, key)];
    if (body.status === 'Approved' && payment.purpose === 'slots')
        ops.push(stmt(c.db, 'UPDATE profiles SET extra_slots=extra_slots+? WHERE id=? AND EXISTS (SELECT 1 FROM payment_requests WHERE id=? AND approval_token=?)', payment.quantity, payment.owner, key, token));
    if (body.status === 'Approved' && payment.purpose === 'promotion')
        ops.push(stmt(c.db, "INSERT INTO promotions (id,owner,listing_id,starts,expires,status) SELECT ?,?,?,?,?,'Active' WHERE EXISTS (SELECT 1 FROM payment_requests WHERE id=? AND approval_token=?) ON CONFLICT(id) DO NOTHING", key, payment.owner, payment.listing_id, start, expires, key, token));
    ops.push(stmt(c.db, "INSERT INTO notifications (id,owner,title,body,link_type,link_id,read,created) SELECT ?,?,?,?,'services',?,0,? WHERE EXISTS (SELECT 1 FROM payment_requests WHERE id=? AND approval_token=?) ON CONFLICT(id) DO NOTHING", 'payment:' + key, payment.owner, `Payment ${body.status.toLowerCase()}`, body.status === 'Approved' ? (payment.purpose === 'slots' ? `${payment.quantity} additional listing slots are available.` : `Promotion scheduled from ${start.slice(0, 10)} to ${expires.slice(0, 10)}.`) : note, key, t, key, token), log(c, 'payment:' + body.status, key));
    const results = await c.db.batch(ops);
    if (!results[0].results?.length)
        throw new MarketError('Another administrator already reviewed this payment.', 409);
    return { ok: true };
}
