import { Context, MarketError, Row, id, now, pageOf } from './types';
import { authenticated, permit, owned, one, run, stmt, notice, categoryCheck, uploadCheck, configuration, parseImages, pagination, AWAITING_PAYMENT, requestExpiry } from './core';
import { listingSchema, requestSchema, validate } from './validation';
import { paymentProof, promotionAmount, paymentInsert, type PaymentProof } from './services';
export async function listCatalogue(c: Context, kind: 'listings' | 'requests', q: URLSearchParams) {
    const { page, size, offset } = pageOf(q);
    const table = kind === 'listings' ? 'listings' : 'buyer_requests';
    const isListing = kind === 'listings';
    const mine = q.get('mine') === '1';
    if (mine)
        authenticated(c);
    const args: unknown[] = [];
    const clauses = [isListing ? "a.status!='Deleted'" : "a.status!='Deleted'"];
    if (mine) {
        clauses.push('a.owner=?');
        args.push(c.user!.userId);
    }
    else {
        clauses.push("p.suspended=0");
        if (isListing)
            clauses.push("a.status='Active'");
        else {
            clauses.push("a.status IN ('Open','Responses Received') AND a.expiry>?");
            args.push(now());
        }
    }
    const term = (q.get('q') || '').trim().slice(0, 120).toLowerCase();
    if (term) {
        clauses.push(`(LOWER(a.title) LIKE ? OR LOWER(a.description) LIKE ? OR LOWER(a.category) LIKE ?${isListing ? ' OR LOWER(a.brand) LIKE ?' : ''})`);
        args.push('%' + term + '%', '%' + term + '%', '%' + term + '%');
        if (isListing)
            args.push('%' + term + '%');
    }
    for (const key of ['category', 'condition']) {
        const value = q.get(key);
        if (value && value !== 'all') {
            clauses.push(`a.${key}=?`);
            args.push(value);
        }
    }
    // Location is typed freely by sellers and buyers ("Peshawar", "University Town, Peshawar"), so match inside it.
    const place = (q.get('location') || '').trim().slice(0, 80).toLowerCase();
    if (place && place !== 'all') {
        clauses.push('LOWER(a.location) LIKE ?');
        args.push('%' + place + '%');
    }
    // The city chosen in the header; it can be combined with a location (an area inside that city).
    const city = (q.get('city') || '').trim().slice(0, 80).toLowerCase();
    if (city && city !== 'all') {
        clauses.push('LOWER(a.location) LIKE ?');
        args.push('%' + city + '%');
    }
    if (q.get('type') === 'new')
        clauses.push("a.condition='New'");
    if (q.get('type') === 'preloved')
        clauses.push("a.condition!='New'");
    for (const [key, op] of [['min', '>='], ['max', '<=']]) {
        const v = q.get(key);
        if (v !== null && v !== '' && Number.isFinite(Number(v))) {
            clauses.push(`a.price${op}?`);
            args.push(Math.max(0, Number(v)));
        }
    }
    if (q.get('saved') === '1') {
        const u = authenticated(c);
        clauses.push('EXISTS (SELECT 1 FROM favorites f WHERE f.listing_id=a.id AND f.owner=?)');
        args.push(u.userId);
    }
    const activePromo = isListing ? `EXISTS (SELECT 1 FROM promotions z WHERE z.listing_id=a.id AND z.status='Active' AND z.starts<='${now()}' AND z.expires>'${now()}')` : '0';
    // Premium listings: only products with an active, approved promotion (the strip at the top of the site).
    if (isListing && q.get('premium') === '1')
        clauses.push(activePromo);
    const conf = await configuration(c.db);
    const promote = conf.promotionPlacement === 'featured-first' ? activePromo : '0';
    const where = ' WHERE ' + clauses.join(' AND ');
    let order = 'a.created DESC,a.id DESC';
    const sort = q.get('sort');
    const orderArgs: unknown[] = [];
    const orderPrefix = promote === '0' ? '' : `${promote} DESC,`;
    if (sort === 'low')
        order = 'a.price ASC,a.created DESC';
    else if (sort === 'popular')
        order = 'a.views DESC,a.created DESC,a.id DESC';
    else if (sort === 'high')
        order = 'a.price DESC,a.created DESC';
    else if (sort === 'relevance' && term) {
        order = orderPrefix + "CASE WHEN LOWER(a.title)=? THEN 0 WHEN LOWER(a.title) LIKE ? THEN 1 ELSE 2 END,a.created DESC";
        orderArgs.push(term, term + '%');
    }
    else if (sort !== 'newest')
        order = `${orderPrefix}a.created DESC,a.id DESC`;
    const join = ` FROM ${table} a JOIN profiles p ON p.id=a.owner`;
    // The seller's average rating and number of visible reviews, for the product cards.
    const sellerScore = isListing ? ',(SELECT AVG(v.rating) FROM reviews v WHERE v.seller_id=a.owner AND v.hidden=0) seller_rating,(SELECT COUNT(*) FROM reviews v WHERE v.seller_id=a.owner AND v.hidden=0) seller_reviews' : '';
    const data = await pagination(c.db, `SELECT a.*,p.name seller,p.verified,${activePromo} featured${sellerScore}${join}${where} ORDER BY ${order}`, `SELECT COUNT(*) n${join}${where}`, args, page, size, offset, orderArgs);
    data.items = data.items.map(isListing ? parseImages : r => r);
    return data;
}
export async function detail(c: Context, kind: 'listings' | 'requests', key: string) { const table = kind === 'listings' ? 'listings' : 'buyer_requests'; const r = await one(c.db, `SELECT a.*,p.name seller,p.verified,p.suspended FROM ${table} a JOIN profiles p ON p.id=a.owner WHERE a.id=?`, key); if (!r || r.status === 'Deleted' || ((r.status === 'Hidden' || r.status === AWAITING_PAYMENT || r.suspended) && r.owner !== c.user?.userId && c.user?.role !== 'admin'))
    throw new MarketError('This item is unavailable.', 404); if (kind === 'listings') {
    const promo = await one(c.db, "SELECT id FROM promotions WHERE listing_id=? AND status='Active' AND starts<=? AND expires>?", key, now(), now());
    r.featured = !!promo;
    return parseImages(r);
} if (['Open', 'Responses Received'].includes(r.status) && r.expiry <= now())
    r.status = 'Expired'; return r; }
/** Counts one view of an active product per visitor per day; the seller's own visits and the admin's are not counted. */
export async function recordView(c: Context, item: Row) {
    if (!c.visitor || item.status !== 'Active' || item.owner === c.user?.userId || c.user?.role === 'admin')
        return;
    const t = now(), key = item.id + ':' + c.visitor + ':' + t.slice(0, 10);
    await c.db.batch([
        stmt(c.db, 'INSERT INTO listing_views (id,listing_id,created) VALUES (?,?,?) ON CONFLICT(id) DO NOTHING', key, item.id, t),
        stmt(c.db, 'UPDATE listings SET views=views+1 WHERE id=? AND EXISTS (SELECT 1 FROM listing_views WHERE id=? AND created=?)', item.id, key, t),
        // Day-old view records are no longer needed to tell repeat visits apart.
        stmt(c.db, 'DELETE FROM listing_views WHERE created<?', new Date(Date.now() - 2 * 86400000).toISOString()),
    ]);
}
/** "About this item" (the description) is at most this long; a longer description from before the limit may stay as long as it was. */
export const DESCRIPTION_LIMIT = 1000;
const tooLong = () => new MarketError(`Keep "About this item" to ${DESCRIPTION_LIMIT} characters.`);
export async function saveListing(c: Context, body: unknown, key?: string) {
    const u = permit(c, 'seller');
    const d = validate(listingSchema, body);
    await categoryCheck(c.db, d.category, d.subcategory);
    await uploadCheck(c, d.images);
    if (key) {
        const old = await owned(c, 'listings', key);
        if (old.status === 'Deleted')
            throw new MarketError('This listing was removed.');
        if (d.description.length > Math.max(DESCRIPTION_LIMIT, String(old.description || '').length))
            throw tooLong();
        await run(c.db, 'UPDATE listings SET title=?,description=?,category=?,subcategory=?,brand=?,price=?,quantity=?,condition=?,location=?,phone=?,whatsapp=?,meetup_spot=?,delivery=?,images=?,negotiable=?,exchange=?,updated=? WHERE id=?', d.title, d.description, d.category, d.subcategory, d.brand, d.price, d.quantity, d.condition, d.location, d.phone, d.whatsapp, d.meetup_spot, JSON.stringify([...new Set(d.delivery)]), JSON.stringify(d.images), d.negotiable ? 1 : 0, d.exchange ? 1 : 0, now(), key);
        return { id: key };
    }
    if (d.description.length > DESCRIPTION_LIMIT)
        throw tooLong();
    const keyNew = id(), token = id(), t = now(), conf = await configuration(c.db);
    // Spotlight chosen on Sell Now: the payment details are checked first, and the listing then waits, seen only
    // by its seller, until the administrator verifies the payment (it goes live with the promotion).
    const spot = (body as Record<string, unknown>)?.spotlight;
    let spotlight: { duration: number; amount: number; proof: PaymentProof } | null = null;
    if (spot && typeof spot === 'object') {
        if (!conf.paymentInstructions.trim())
            throw new MarketError('Premium Listing is not available yet: the payment details have not been set up. Publish it as a free listing.', 409);
        const s = spot as Record<string, unknown>, duration = Number(s.duration), amount = promotionAmount(conf, duration);
        spotlight = { duration, amount, proof: await paymentProof(c, s, amount) };
    }
    const [reservation] = await c.db.batch([
        stmt(c.db, 'UPDATE profiles SET used_slots=used_slots+1,slot_token=? WHERE id=? AND used_slots<?+extra_slots RETURNING id', token, u.userId, conf.freeListings),
        stmt(c.db, "INSERT INTO listings (id,owner,title,description,category,subcategory,brand,price,quantity,condition,location,phone,whatsapp,meetup_spot,delivery,images,negotiable,exchange,status,created,updated) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,? FROM profiles WHERE id=? AND slot_token=?", keyNew, u.userId, d.title, d.description, d.category, d.subcategory, d.brand, d.price, d.quantity, d.condition, d.location, d.phone, d.whatsapp, d.meetup_spot, JSON.stringify([...new Set(d.delivery)]), JSON.stringify(d.images), d.negotiable ? 1 : 0, d.exchange ? 1 : 0, spotlight ? AWAITING_PAYMENT : 'Active', t, t, u.userId, token),
    ]);
    if (!reservation.results?.length) {
        // Extra slots bought but not yet verified: say so, rather than asking the seller to buy them again.
        if (await one(c.db, "SELECT id FROM payment_requests WHERE owner=? AND purpose='slots' AND status='Pending'", u.userId))
            throw new MarketError('Your payment for extra listing slots is waiting for verification. You can publish this listing once it is approved.', 409);
        await c.db.batch([notice(c.db, u.userId, 'Listing limit reached', 'Request additional listing slots from Seller services.', 'services', '', `limit:${u.userId}:${t.slice(0, 10)}`)]);
        throw new MarketError('Your listing slots are full. Request additional slots in Seller services.', 409);
    }
    if (spotlight) {
        const [payment] = await c.db.batch([paymentInsert(c, id(), u.userId, 'promotion', 1, spotlight.duration, keyNew, spotlight.amount, spotlight.proof)]) as { results?: unknown[] }[];
        if (!payment.results?.length) {
            // The same reference was sent a moment ago by another request: undo this listing and give its slot back.
            await deleteListing(c, keyNew);
            throw new MarketError('This payment reference has already been submitted.', 409);
        }
    }
    return { id: keyNew, status: spotlight ? AWAITING_PAYMENT : 'Active' };
}
/** Publishes a listing that was waiting for its Spotlight payment, without the Spotlight. */
export async function publishListing(c: Context, key: string) {
    const r = await owned(c, 'listings', key);
    if (r.status !== AWAITING_PAYMENT)
        throw new MarketError('This listing is already published.', 409);
    await run(c.db, "UPDATE listings SET status='Active',updated=? WHERE id=? AND status=?", now(), key, AWAITING_PAYMENT);
    return { ok: true };
}
export async function deleteListing(c: Context, key: string) { const r = await owned(c, 'listings', key); const token = id(); await c.db.batch([stmt(c.db, "UPDATE listings SET status='Deleted',delete_token=?,updated=? WHERE id=? AND status!='Deleted'", token, now(), key), stmt(c.db, 'UPDATE profiles SET used_slots=CASE WHEN used_slots>0 THEN used_slots-1 ELSE 0 END WHERE id=? AND EXISTS (SELECT 1 FROM listings WHERE id=? AND delete_token=?)', r.owner, key, token), stmt(c.db, "UPDATE promotions SET status='Cancelled' WHERE listing_id=? AND status='Active'", key)]); return { ok: true }; }
export async function saveRequest(c: Context, body: unknown, key?: string) { const u = permit(c, 'buyer'); const d = validate(requestSchema, body); await categoryCheck(c.db, d.category); await uploadCheck(c, [d.image || '']); if (key) {
    const r = await owned(c, 'buyer_requests', key);
    if (!['Open', 'Responses Received'].includes(r.status) || r.expiry <= now())
        throw new MarketError('Only active requests can be edited.');
    // Editing keeps the request's end date: every request runs for REQUEST_DAYS from when it was posted.
    await run(c.db, 'UPDATE buyer_requests SET title=?,description=?,category=?,price=?,quantity=?,condition=?,location=?,image=?,updated=? WHERE id=?', d.title, d.description, d.category, d.price, d.quantity, d.condition, d.location, d.image, now(), key);
    return { id: key };
} const keyNew = id(); await run(c.db, "INSERT INTO buyer_requests (id,owner,title,description,category,price,quantity,condition,location,image,expiry,status,created,updated) VALUES (?,?,?,?,?,?,?,?,?,?,?,'Open',?,?)", keyNew, u.userId, d.title, d.description, d.category, d.price, d.quantity, d.condition, d.location, d.image, requestExpiry(), now(), now()); return { id: keyNew }; }
/** The owner removes a request for good; sellers with an open offer on it are told. */
export async function deleteRequest(c: Context, key: string) {
    permit(c, 'buyer');
    const r = await owned(c, 'buyer_requests', key);
    if (r.status === 'Deleted')
        return { ok: true };
    const t = now();
    await c.db.batch([
        stmt(c.db, "UPDATE buyer_requests SET status='Deleted',updated=? WHERE id=?", t, key),
        stmt(c.db, "INSERT INTO notifications (id,owner,title,body,link_type,link_id,read,created) SELECT 'request-deleted:'||id,owner,'Request removed',?,'','',0,? FROM seller_offers WHERE request_id=? AND status='Pending' ON CONFLICT(id) DO NOTHING", 'The buyer removed "' + r.title + '", so your offer on it is closed.', t, key),
        stmt(c.db, "UPDATE seller_offers SET status='Not selected',updated=? WHERE request_id=? AND status='Pending'", t, key),
    ]);
    return { ok: true };
}
/** Posts an ended request (expired, closed or cancelled) again as a new request with a fresh REQUEST_DAYS run. */
export async function repostRequest(c: Context, key: string) {
    const u = permit(c, 'buyer');
    const r = await owned(c, 'buyer_requests', key);
    const live = ['Open', 'Responses Received'].includes(r.status) && r.expiry > now();
    if (live || ['Hidden', 'Deleted', 'Seller Selected'].includes(r.status))
        throw new MarketError(live ? 'This request is still live.' : 'This request cannot be posted again.', 409);
    const keyNew = id();
    await run(c.db, "INSERT INTO buyer_requests (id,owner,title,description,category,price,quantity,condition,location,image,expiry,status,created,updated) VALUES (?,?,?,?,?,?,?,?,?,?,?,'Open',?,?)", keyNew, u.userId, r.title, r.description, r.category, r.price, r.quantity, r.condition, r.location, r.image || '', requestExpiry(), now(), now());
    return { id: keyNew };
}
export async function favorite(c: Context, key: string, saved: boolean) { const u = authenticated(c); if (saved && !key.startsWith('sample-'))
    await detail(c, 'listings', key); const composite = u.userId + ':' + key; if (saved)
    await run(c.db, 'INSERT INTO favorites (id,owner,listing_id,created) VALUES (?,?,?,?) ON CONFLICT(id) DO NOTHING', composite, u.userId, key, now());
else
    await run(c.db, 'DELETE FROM favorites WHERE id=? AND owner=?', composite, u.userId); return { saved }; }
