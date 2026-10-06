import { Context, MarketError, Row, id, now, pageOf } from './types';
import { authenticated, permit, owned, rows, one, run, stmt, notice, categoryCheck, uploadCheck, configuration, parseImages, pagination } from './core';
import { listingSchema, requestSchema, validate } from './validation';
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
    const conf = await configuration(c.db);
    const promote = conf.promotionPlacement === 'featured-first' ? activePromo : '0';
    const where = ' WHERE ' + clauses.join(' AND ');
    let order = 'a.created DESC,a.id DESC';
    const sort = q.get('sort');
    const orderArgs: unknown[] = [];
    const orderPrefix = promote === '0' ? '' : `${promote} DESC,`;
    if (sort === 'low')
        order = 'a.price ASC,a.created DESC';
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
export async function detail(c: Context, kind: 'listings' | 'requests', key: string) { const table = kind === 'listings' ? 'listings' : 'buyer_requests'; const r = await one(c.db, `SELECT a.*,p.name seller,p.verified,p.suspended FROM ${table} a JOIN profiles p ON p.id=a.owner WHERE a.id=?`, key); if (!r || r.status === 'Deleted' || ((r.status === 'Hidden' || r.suspended) && r.owner !== c.user?.userId && c.user?.role !== 'admin'))
    throw new MarketError('This item is unavailable.', 404); if (kind === 'listings') {
    const promo = await one(c.db, "SELECT id FROM promotions WHERE listing_id=? AND status='Active' AND starts<=? AND expires>?", key, now(), now());
    r.featured = !!promo;
    return parseImages(r);
} if (['Open', 'Responses Received'].includes(r.status) && r.expiry <= now())
    r.status = 'Expired'; return r; }
export async function saveListing(c: Context, body: unknown, key?: string) {
    const u = permit(c, 'seller');
    const d = validate(listingSchema, body);
    await categoryCheck(c.db, d.category, d.subcategory);
    await uploadCheck(c, d.images);
    if (key) {
        const old = await owned(c, 'listings', key);
        if (old.status === 'Deleted')
            throw new MarketError('This listing was removed.');
        await run(c.db, 'UPDATE listings SET title=?,description=?,category=?,subcategory=?,brand=?,price=?,quantity=?,condition=?,location=?,phone=?,whatsapp=?,meetup_spot=?,delivery=?,images=?,negotiable=?,exchange=?,updated=? WHERE id=?', d.title, d.description, d.category, d.subcategory, d.brand, d.price, d.quantity, d.condition, d.location, d.phone, d.whatsapp, d.meetup_spot, JSON.stringify([...new Set(d.delivery)]), JSON.stringify(d.images), d.negotiable ? 1 : 0, d.exchange ? 1 : 0, now(), key);
        return { id: key };
    }
    const keyNew = id(), token = id(), t = now(), conf = await configuration(c.db);
    const [reservation] = await c.db.batch([
        stmt(c.db, 'UPDATE profiles SET used_slots=used_slots+1,slot_token=? WHERE id=? AND used_slots<?+extra_slots RETURNING id', token, u.userId, conf.freeListings),
        stmt(c.db, "INSERT INTO listings (id,owner,title,description,category,subcategory,brand,price,quantity,condition,location,phone,whatsapp,meetup_spot,delivery,images,negotiable,exchange,status,created,updated) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'Active',?,? FROM profiles WHERE id=? AND slot_token=?", keyNew, u.userId, d.title, d.description, d.category, d.subcategory, d.brand, d.price, d.quantity, d.condition, d.location, d.phone, d.whatsapp, d.meetup_spot, JSON.stringify([...new Set(d.delivery)]), JSON.stringify(d.images), d.negotiable ? 1 : 0, d.exchange ? 1 : 0, t, t, u.userId, token),
    ]);
    if (!reservation.results?.length) {
        await c.db.batch([notice(c.db, u.userId, 'Listing limit reached', 'Request additional listing slots from Seller services.', 'services', '', `limit:${u.userId}:${t.slice(0, 10)}`)]);
        throw new MarketError('Your listing slots are full. Request additional slots in Seller services.', 409);
    }
    return { id: keyNew };
}
export async function deleteListing(c: Context, key: string) { const r = await owned(c, 'listings', key); const token = id(); await c.db.batch([stmt(c.db, "UPDATE listings SET status='Deleted',delete_token=?,updated=? WHERE id=? AND status!='Deleted'", token, now(), key), stmt(c.db, 'UPDATE profiles SET used_slots=CASE WHEN used_slots>0 THEN used_slots-1 ELSE 0 END WHERE id=? AND EXISTS (SELECT 1 FROM listings WHERE id=? AND delete_token=?)', r.owner, key, token), stmt(c.db, "UPDATE promotions SET status='Cancelled' WHERE listing_id=? AND status='Active'", key)]); return { ok: true }; }
export async function saveRequest(c: Context, body: unknown, key?: string) { const u = permit(c, 'buyer'); const d = validate(requestSchema, body); await categoryCheck(c.db, d.category); await uploadCheck(c, [d.image || '']); if (key) {
    const r = await owned(c, 'buyer_requests', key);
    if (!['Open', 'Responses Received'].includes(r.status) || r.expiry <= now())
        throw new MarketError('Only active requests can be edited.');
    await run(c.db, 'UPDATE buyer_requests SET title=?,description=?,category=?,price=?,quantity=?,condition=?,location=?,image=?,expiry=?,updated=? WHERE id=?', d.title, d.description, d.category, d.price, d.quantity, d.condition, d.location, d.image, d.expiry, now(), key);
    return { id: key };
} const keyNew = id(); await run(c.db, "INSERT INTO buyer_requests (id,owner,title,description,category,price,quantity,condition,location,image,expiry,status,created,updated) VALUES (?,?,?,?,?,?,?,?,?,?,?,'Open',?,?)", keyNew, u.userId, d.title, d.description, d.category, d.price, d.quantity, d.condition, d.location, d.image, d.expiry, now(), now()); return { id: keyNew }; }
export async function favorite(c: Context, key: string, saved: boolean) { const u = authenticated(c); if (saved && !key.startsWith('sample-'))
    await detail(c, 'listings', key); const composite = u.userId + ':' + key; if (saved)
    await run(c.db, 'INSERT INTO favorites (id,owner,listing_id,created) VALUES (?,?,?,?) ON CONFLICT(id) DO NOTHING', composite, u.userId, key, now());
else
    await run(c.db, 'DELETE FROM favorites WHERE id=? AND owner=?', composite, u.userId); return { saved }; }
