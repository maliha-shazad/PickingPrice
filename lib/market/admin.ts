import { Context, MarketError, id, now, pageOf } from './types';
import { permit, one, rows, run, stmt, notice, configuration, pagination, log, parseImages } from './core';
import { stringValue } from './validation';
export async function adminData(c: Context, section: string, q: URLSearchParams) { permit(c, 'admin'); if (section === 'stats') {
    const [users, listings, requests, payments, reports, promotions] = await Promise.all(['SELECT COUNT(*) n FROM profiles', "SELECT COUNT(*) n FROM listings WHERE status!='Deleted'", "SELECT COUNT(*) n FROM buyer_requests WHERE status IN ('Open','Responses Received')", "SELECT COUNT(*) n FROM payment_requests WHERE status='Pending'", "SELECT COUNT(*) n FROM reports WHERE status='Open'", "SELECT COUNT(*) n FROM promotions WHERE status='Active' AND expires>'" + now() + "'"].map(sql => one(c.db, sql)));
    return { users: users!.n, listings: listings!.n, requests: requests!.n, payments: payments!.n, reports: reports!.n, promotions: promotions!.n };
} if (section === 'settings')
    return { settings: await configuration(c.db), categories: (await rows(c.db, 'SELECT * FROM categories ORDER BY name')).map(r => ({ ...r, subcategories: JSON.parse(r.subcategories) })) }; const tables: Record<string, string> = { users: 'profiles', listings: 'listings', requests: 'buyer_requests', payments: 'payment_requests', reports: 'reports', promotions: 'promotions', audit: 'admin_audit', legacy: 'records', reviews: 'reviews' }; const table = tables[section]; if (!table)
    throw new MarketError('Unknown admin section.', 404); const { page, size, offset } = pageOf(q); let where = ''; const args: unknown[] = []; if (q.get('q')) {
    const col = section === 'users' ? 'name' : ['listings', 'requests'].includes(section) ? 'title' : section === 'payments' ? 'reference' : null;
    if (col) {
        where = ` WHERE LOWER(${col}) LIKE ?`;
        args.push('%' + q.get('q')!.toLowerCase() + '%');
    }
} const order = section === 'promotions' ? 'expires' : 'created'; const result = await pagination(c.db, `SELECT * FROM ${table}${where} ORDER BY ${order} DESC`, `SELECT COUNT(*) n FROM ${table}${where}`, args, page, size, offset); if (section === 'reports') {
    for (const item of result.items) {
        const targets: Record<string, string> = { listing: 'listings', request: 'buyer_requests', message: 'chat_messages', user: 'profiles', review: 'reviews' };
        const target = targets[item.target_type];
        item.target = target ? await one(c.db, `SELECT * FROM ${target} WHERE id=?`, item.target_id) : null;
    }
} if (section === 'listings') result.items = result.items.map(parseImages); return result; }
export async function saveSettings(c: Context, body: Record<string, unknown>) { permit(c, 'admin'); const d: Record<string, unknown> = {}; for (const key of ['freeListings', 'extraListingPrice', 'promotion24h', 'promotion3d', 'promotion7d']) {
    const value = body[key];
    if (!Number.isInteger(value) || value < (key === 'freeListings' ? 0 : 1) || value > 1000000)
        throw new MarketError('Enter valid listing limits and service prices.');
    d[key] = value;
} if (!Array.isArray(body.promotionDurations) || body.promotionDurations.length !== 3 || body.promotionDurations.some((v: unknown) => !Number.isInteger(v) || Number(v) < 1 || Number(v) > 365) || new Set(body.promotionDurations).size !== 3)
    throw new MarketError('Provide three distinct promotion durations from 1 to 365 days.'); d.promotionDurations = body.promotionDurations; if (!['featured-first', 'badge-only'].includes(body.promotionPlacement))
    throw new MarketError('Choose a valid promotion placement.'); d.promotionPlacement = body.promotionPlacement; d.paymentInstructions = stringValue(body.paymentInstructions || '', 0, 3000); await c.db.batch([stmt(c.db, "UPDATE settings SET value=? WHERE key='market'", JSON.stringify(d)), log(c, 'settings:update', 'market')]); return { ok: true }; }
export async function saveCategory(c: Context, body: Record<string, unknown>) { permit(c, 'admin'); const name = stringValue(body.name, 2, 80), key = body.id ? stringValue(body.id, 1, 160) : id(); if (!Array.isArray(body.subcategories) || body.subcategories.length > 30)
    throw new MarketError('Provide up to 30 subcategories.'); const subs = [...new Set(body.subcategories.map((x: unknown) => stringValue(x, 1, 80)))]; const old = await one(c.db, 'SELECT name FROM categories WHERE id=?', key); await c.db.batch([stmt(c.db, 'INSERT INTO categories (id,name,subcategories,active) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,subcategories=excluded.subcategories,active=excluded.active', key, name, JSON.stringify(subs), body.active === false ? 0 : 1), ...(old && old.name !== name ? [stmt(c.db, 'UPDATE listings SET category=? WHERE category=?', name, old.name), stmt(c.db, 'UPDATE buyer_requests SET category=? WHERE category=?', name, old.name)] : []), log(c, 'category:update', key)]); return { ok: true }; }
export async function moderate(c: Context, body: Record<string, unknown>) {
    const u = permit(c, 'admin'), type = body.type, key = stringValue(body.id, 1, 400), action = body.action, reason = stringValue(body.reason || '', 5, 1000);
    const table = ({ user: 'profiles', listing: 'listings', request: 'buyer_requests', review: 'reviews', promotion: 'promotions', report: 'reports' } as Record<string, string>)[String(type)];
    if (!table)
        throw new MarketError('Choose a valid moderation target.');
    const record = await one(c.db, `SELECT * FROM ${table} WHERE id=?`, key);
    if (!record)
        throw new MarketError('Item not found.', 404);
    const ops = [];
    const owner = record.owner || record.id;
    if (type === 'user') {
        if (key === u.userId)
            throw new MarketError('You cannot suspend or change the administrator account.');
        if (action === 'suspend' || action === 'restore')
            ops.push(stmt(c.db, 'UPDATE profiles SET suspended=? WHERE id=?', action === 'suspend' ? 1 : 0, key));
        else if (action === 'verify' || action === 'unverify')
            ops.push(stmt(c.db, 'UPDATE profiles SET verified=? WHERE id=?', action === 'verify' ? 1 : 0, key));
        else if (action !== 'warn')
            throw new MarketError('Invalid user action.');
        if (action === 'suspend')
            ops.push(stmt(c.db, 'DELETE FROM sessions WHERE account_id=?', key));
    }
    else if (type === 'listing' || type === 'request') {
        if (!['hide', 'restore'].includes(action))
            throw new MarketError('Choose hide or restore.');
        if (record.status === 'Deleted')
            throw new MarketError('Deleted content cannot be restored.');
        if (type === 'request') {
            const saved = await one(c.db, 'SELECT value FROM settings WHERE key=?', 'moderated-request:' + key);
            if (action === 'hide' && record.status !== 'Hidden')
                ops.push(stmt(c.db, 'INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', 'moderated-request:' + key, record.status));
            const prior = record.status==='Hidden'?(saved?.value || 'Open'):record.status;
            const restored = ['Open', 'Responses Received'].includes(prior) && record.expiry <= now() ? 'Expired' : prior;
            ops.push(stmt(c.db, 'UPDATE buyer_requests SET status=?,updated=? WHERE id=?', action === 'hide' ? 'Hidden' : restored, now(), key));
        }
        else
            ops.push(stmt(c.db, "UPDATE listings SET status=?,updated=? WHERE id=?", action === 'hide' ? 'Hidden' : 'Active', now(), key));
    }
    else if (type === 'review') {
        if (!['hide', 'restore'].includes(action))
            throw new MarketError('Choose hide or restore.');
        ops.push(stmt(c.db, 'UPDATE reviews SET hidden=? WHERE id=?', action === 'hide' ? 1 : 0, key));
    }
    else if (type === 'promotion') {
        if (action !== 'cancel')
            throw new MarketError('Choose cancel.');
        ops.push(stmt(c.db, "UPDATE promotions SET status='Cancelled' WHERE id=?", key));
    }
    else {
        if (action !== 'resolve' && action !== 'dismiss')
            throw new MarketError('Choose resolve or dismiss.');
        ops.push(stmt(c.db, 'UPDATE reports SET status=?,resolution=? WHERE id=?', action === 'resolve' ? 'Resolved' : 'Dismissed', reason, key));
    }
    ops.push(notice(c.db, owner, type === 'report' ? 'Report reviewed' : 'Account / content update', reason, type === 'user' ? 'profile' : type, key), log(c, type + ':' + action, key));
    await c.db.batch(ops);
    return { ok: true };
}
