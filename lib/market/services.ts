import { Context, MarketError, id, now, pageOf } from './types';
import { permit, owned, one, rows, stmt, configuration, pagination, log, uploadCheck, AWAITING_PAYMENT } from './core';
import { stringValue } from './validation';
export async function services(c: Context, q: URLSearchParams) { const u = permit(c, 'seller'), { page, size, offset } = pageOf(q); const p = await one(c.db, 'SELECT used_slots,extra_slots FROM profiles WHERE id=?', u.userId); return { settings: await configuration(c.db), usage: p, payments: await pagination(c.db, 'SELECT * FROM payment_requests WHERE owner=? ORDER BY created DESC', 'SELECT COUNT(*) n FROM payment_requests WHERE owner=?', [u.userId], page, size, offset), promotionPage: Math.max(1, Math.floor(Number(q.get('promotionPage'))) || 1), promotionTotal: Number((await one(c.db, 'SELECT COUNT(*) n FROM promotions WHERE owner=?', u.userId))!.n), promotions: await rows(c.db, 'SELECT p.*,l.title FROM promotions p JOIN listings l ON l.id=p.listing_id WHERE p.owner=? ORDER BY p.expires DESC LIMIT 12 OFFSET ?', u.userId, (Math.max(1, Math.floor(Number(q.get('promotionPage'))) || 1) - 1) * 12) }; }
/** Ways sellers pay outside the site; they choose one when they send the payment details. */
export const PAYMENT_METHODS = ['Bank transfer', 'JazzCash', 'Easypaisa', 'Other'];
/** The details a seller gives so the administrator can cross-check the transfer in the bank or wallet account. */
export async function paymentProof(c: Context, body: Record<string, unknown>, amount: number) {
    const method = String(body.method || '');
    if (!PAYMENT_METHODS.includes(method))
        throw new MarketError('Choose how you paid: bank transfer, JazzCash, Easypaisa or other.');
    const reference = stringValue(body.reference, 4, 120);
    const senderName = stringValue(body.senderName, 2, 80);
    const senderAccount = stringValue(body.senderAccount, 4, 40);
    const paid = Number(body.paidAmount);
    if (!Number.isInteger(paid) || paid < 1 || paid > 10000000)
        throw new MarketError('Enter the amount you paid, in rupees.');
    if (paid < amount)
        throw new MarketError(`The amount you paid (Rs. ${paid.toLocaleString('en-PK')}) is less than the price (Rs. ${amount.toLocaleString('en-PK')}). Pay the full amount, then send the details.`);
    const paidOn = String(body.paidOn || '');
    const day = /^\d{4}-\d{2}-\d{2}$/.test(paidOn) ? Date.parse(paidOn + 'T00:00:00Z') : NaN;
    if (!Number.isFinite(day) || day > Date.now() + 86400000 || day < Date.now() - 90 * 86400000)
        throw new MarketError('Enter the date you paid (within the last 90 days).');
    const receipt = stringValue(body.receipt, 1, 300);
    if (!receipt.startsWith('/api/files/'))
        throw new MarketError('Upload a screenshot or photo of the payment receipt.');
    await uploadCheck(c, [receipt]);
    if (await one(c.db, "SELECT id FROM payment_requests WHERE reference=? AND status!='Rejected'", reference))
        throw new MarketError('This payment reference has already been submitted.', 409);
    return { reference, method, senderName, senderAccount, paid, paidOn, receipt };
}
export type PaymentProof = Awaited<ReturnType<typeof paymentProof>>;
/** The price of a promotion of the given length, or an error when that length is not offered. */
export function promotionAmount(conf: Awaited<ReturnType<typeof configuration>>, duration: number) {
    if (!conf.promotionDurations.includes(duration))
        throw new MarketError('Choose one of the configured promotion durations.');
    return [conf.promotion24h, conf.promotion3d, conf.promotion7d][conf.promotionDurations.indexOf(duration)];
}
/** The statement that stores a payment request with its proof. */
export const paymentInsert = (c: Context, key: string, owner: string, purpose: string, quantity: number, duration: number, listingId: string, amount: number, p: PaymentProof) =>
    stmt(c.db, "INSERT INTO payment_requests (id,owner,purpose,quantity,duration,listing_id,amount,reference,method,sender_name,sender_account,paid_amount,paid_on,receipt,status,created) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,'Pending',?) ON CONFLICT DO NOTHING RETURNING id",
        key, owner, purpose, quantity, duration, listingId, amount, p.reference, p.method, p.senderName, p.senderAccount, p.paid, p.paidOn, p.receipt, now());
export async function requestPayment(c: Context, body: Record<string, unknown>) { const u = permit(c, 'seller'), conf = await configuration(c.db); if (!conf.paymentInstructions.trim())
    throw new MarketError('The administrator has not configured payment instructions yet.', 409); const purpose = body.purpose; let quantity = 1, duration = 0, listingId = '', amount = 0; if (purpose === 'slots') {
    quantity = Number(body.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100)
        throw new MarketError('Choose 1–100 listing slots.');
    amount = conf.extraListingPrice * quantity;
}
else if (purpose === 'promotion') {
    duration = Number(body.duration);
    amount = promotionAmount(conf, duration);
    listingId = stringValue(body.listingId, 1, 160);
    const listing = await owned(c, 'listings', listingId);
    // A listing kept back until its Spotlight payment is verified may be promoted again (for example after a rejection).
    if (listing.owner !== u.userId || !['Active', AWAITING_PAYMENT].includes(listing.status))
        throw new MarketError('Choose your own active listing.');
}
else
    throw new MarketError('Choose a valid service.'); const proof = await paymentProof(c, body, amount); const key = id(); const [inserted] = await c.db.batch([paymentInsert(c, key, u.userId, String(purpose), quantity, duration, listingId, amount, proof)]); if (!(inserted as { results?: unknown[] }).results?.length)
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
    const listing = payment.purpose === 'promotion' ? await one(c.db, 'SELECT id,status FROM listings WHERE id=? AND owner=?', payment.listing_id, payment.owner) : null;
    const waiting = listing?.status === AWAITING_PAYMENT;
    if (body.status === 'Approved' && payment.purpose === 'promotion' && !(listing && ['Active', AWAITING_PAYMENT].includes(listing.status)))
        throw new MarketError('The listing is no longer active. Reject this request.');
    const token = id(), t = now();
    const previous = payment.purpose === 'promotion' ? await one(c.db, "SELECT MAX(expires) expiry FROM promotions WHERE listing_id=? AND status='Active'", payment.listing_id) : null;
    const start = previous?.expiry && previous.expiry > t ? previous.expiry : t;
    const expires = new Date(Date.parse(start) + payment.duration * 86400000).toISOString();
    const ops = [stmt(c.db, "UPDATE payment_requests SET status=?,note=?,verified_at=?,verified_by=?,approval_token=? WHERE id=? AND status='Pending' RETURNING id", body.status, note, t, u.userId, token, key)];
    if (body.status === 'Approved' && payment.purpose === 'slots')
        ops.push(stmt(c.db, 'UPDATE profiles SET extra_slots=extra_slots+? WHERE id=? AND EXISTS (SELECT 1 FROM payment_requests WHERE id=? AND approval_token=?)', payment.quantity, payment.owner, key, token));
    // A listing kept back for this payment goes live as soon as the payment is approved.
    if (body.status === 'Approved' && waiting)
        ops.push(stmt(c.db, "UPDATE listings SET status='Active',updated=? WHERE id=? AND status=? AND EXISTS (SELECT 1 FROM payment_requests WHERE id=? AND approval_token=?)", t, payment.listing_id, AWAITING_PAYMENT, key, token));
    if (body.status === 'Approved' && payment.purpose === 'promotion')
        ops.push(stmt(c.db, "INSERT INTO promotions (id,owner,listing_id,starts,expires,status) SELECT ?,?,?,?,?,'Active' WHERE EXISTS (SELECT 1 FROM payment_requests WHERE id=? AND approval_token=?) ON CONFLICT(id) DO NOTHING", key, payment.owner, payment.listing_id, start, expires, key, token));
    ops.push(stmt(c.db, "INSERT INTO notifications (id,owner,title,body,link_type,link_id,read,created) SELECT ?,?,?,?,'services',?,0,? WHERE EXISTS (SELECT 1 FROM payment_requests WHERE id=? AND approval_token=?) ON CONFLICT(id) DO NOTHING", 'payment:' + key, payment.owner, `Payment ${body.status.toLowerCase()}`, body.status === 'Approved' ? (payment.purpose === 'slots' ? `${payment.quantity} additional listing slots are available.` : (waiting ? 'Your listing is now live. ' : '') + `Promotion scheduled from ${start.slice(0, 10)} to ${expires.slice(0, 10)}.`) : note + (waiting ? ' Your listing is not published yet: send the payment again with Promote, or publish it as a free listing from your Seller Dashboard.' : ''), key, t, key, token), log(c, 'payment:' + body.status, key));
    const results = await c.db.batch(ops);
    if (!results[0].results?.length)
        throw new MarketError('Another administrator already reviewed this payment.', 409);
    return { ok: true };
}
