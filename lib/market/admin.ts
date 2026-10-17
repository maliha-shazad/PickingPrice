import { Context, MarketError, Row, id, now, pageOf } from './types';
import { permit, one, rows, stmt, notice, configuration, pagination, log, parseImages } from './core';
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
} if (section === 'users')
    // Members who signed up but have not typed in their email code yet.
    for (const item of result.items) {
        const account = await one(c.db, 'SELECT email_verified FROM accounts WHERE id=?', item.id);
        item.email_confirmed = !account || Number(account.email_verified) === 1;
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
    throw new MarketError('Provide up to 30 subcategories.'); const subs = [...new Set(body.subcategories.map((x: unknown) => stringValue(x, 1, 80)))]; const taken = await one(c.db, 'SELECT id,active FROM categories WHERE LOWER(name)=LOWER(?) AND id!=?', name, key); if (taken)
    throw new MarketError('A category named "' + name + '" already exists' + (taken.active ? '.' : ' (it is switched off).') + ' Edit that one instead.', 409); const old = await one(c.db, 'SELECT name FROM categories WHERE id=?', key); await c.db.batch([stmt(c.db, 'INSERT INTO categories (id,name,subcategories,active) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,subcategories=excluded.subcategories,active=excluded.active', key, name, JSON.stringify(subs), body.active === false ? 0 : 1), ...(old && old.name !== name ? [stmt(c.db, 'UPDATE listings SET category=? WHERE category=?', name, old.name), stmt(c.db, 'UPDATE buyer_requests SET category=? WHERE category=?', name, old.name)] : []), log(c, 'category:update', key)]); return { ok: true }; }
export async function deleteCategory(c: Context, key: string) {
    permit(c, 'admin');
    const cat = await one(c.db, 'SELECT id,name FROM categories WHERE id=?', key);
    if (!cat)
        throw new MarketError('Category not found.', 404);
    const used = Number((await one(c.db, "SELECT (SELECT COUNT(*) FROM listings WHERE category=? AND status!='Deleted') + (SELECT COUNT(*) FROM buyer_requests WHERE category=? AND status!='Deleted') n", cat.name, cat.name))!.n);
    if (used > 0)
        throw new MarketError('"' + cat.name + '" is still used by ' + used + (used === 1 ? ' product or request' : ' products or requests') + '. Switch it off with Edit instead of deleting it.', 409);
    await c.db.batch([stmt(c.db, 'DELETE FROM categories WHERE id=?', key), log(c, 'category:delete', cat.name)]);
    return { ok: true };
}
/** What the member is told after a moderation action: a title naming the action and a body naming the item, what
 * happened and the administrator's reason. The same text goes out as the notification email. */
async function moderationNotice(c: Context, type: string, action: string, record: Row, reason: string) {
    const quote = (v: unknown) => '"' + String(v || '').slice(0, 80) + '"';
    const team = 'by the Picking Price support team';
    const why = ' Reason: ' + reason;
    const appeal = ' If you think this is a mistake, contact us from the Contact Us page.';
    if (type === 'report')
        return { title: action === 'resolve' ? 'Your report was resolved' : 'Your report was reviewed', body: (action === 'resolve' ? 'Thank you: we reviewed your report about a ' + record.target_type + ' and took action.' : 'We reviewed your report about a ' + record.target_type + ' and found nothing that needs action.') + ' Note from the team: ' + reason, linkType: '', linkId: '' };
    if (type === 'user') {
        const titles: Record<string, string> = { warn: 'A warning about your account', suspend: 'Your account was suspended', restore: 'Your account was restored', verify: 'Your account is now verified', unverify: 'Your verified badge was removed' };
        const bodies: Record<string, string> = { warn: 'The support team sent you a warning about how the site is used.', suspend: 'Your account was suspended ' + team + ' and you cannot sign in for now.', restore: 'Your account was restored ' + team + ' and you can use the site again.', verify: 'Your account was verified ' + team + ' and now shows the Verified badge.', unverify: 'The Verified badge was removed from your account ' + team + '.' };
        return { title: titles[action], body: bodies[action] + why + (action === 'suspend' || action === 'unverify' || action === 'warn' ? appeal : ''), linkType: 'profile', linkId: String(record.id) };
    }
    if (type === 'promotion') {
        const listing = await one(c.db, 'SELECT title FROM listings WHERE id=?', record.listing_id);
        return { title: 'Your Premium Listing was cancelled', body: 'The Premium Listing for ' + quote(listing?.title) + ' was cancelled ' + team + '; the product stays listed as a free listing.' + why + appeal, linkType: 'listing', linkId: String(record.listing_id) };
    }
    if (type === 'review') {
        const seller = await one(c.db, 'SELECT name FROM profiles WHERE id=?', record.seller_id);
        const done: Record<string, string> = { hide: 'was hidden', restore: 'is visible again', delete: 'was removed' };
        return { title: action === 'restore' ? 'Your review is visible again' : action === 'delete' ? 'Your review was removed' : 'Your review was hidden', body: 'Your review of ' + String(seller?.name || 'a seller') + ' ' + done[action] + ' ' + team + '.' + why + (action === 'restore' ? '' : appeal), linkType: 'profile', linkId: String(record.seller_id) };
    }
    const what = (type === 'listing' ? 'Your listing ' : 'Your request ') + quote(record.title);
    const titles: Record<string, string> = { hide: type === 'listing' ? 'Your listing was hidden' : 'Your request was hidden', restore: type === 'listing' ? 'Your listing is visible again' : 'Your request is visible again', delete: type === 'listing' ? 'Your listing was removed' : 'Your request was removed', cancel: 'Your request was cancelled' };
    const done: Record<string, string> = { hide: ' was hidden from the site ', restore: ' is visible again, restored ', delete: ' was removed ', cancel: ' was cancelled ' };
    const gone = action === 'delete';
    return { title: titles[action], body: what + done[action] + team + '.' + why + (action === 'restore' ? '' : appeal), linkType: gone ? '' : type, linkId: gone ? '' : String(record.id) };
}
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
        const allowed = type === 'request' ? ['hide', 'restore', 'cancel', 'delete'] : ['hide', 'restore', 'delete'];
        if (!allowed.includes(String(action)))
            throw new MarketError(type === 'request' ? 'Choose hide, restore, cancel or delete.' : 'Choose hide, restore or delete.');
        if (record.status === 'Deleted')
            throw new MarketError('This item has already been deleted.');
        if (action === 'delete' || action === 'cancel') {
            const t = now();
            if (type === 'listing')
                ops.push(stmt(c.db, "UPDATE listings SET status='Deleted',updated=? WHERE id=?", t, key), stmt(c.db, 'UPDATE profiles SET used_slots=CASE WHEN used_slots>0 THEN used_slots-1 ELSE 0 END WHERE id=?', record.owner), stmt(c.db, "UPDATE promotions SET status='Cancelled' WHERE listing_id=? AND status='Active'", key));
            else {
                if (action === 'cancel' && !['Open', 'Responses Received', 'Hidden'].includes(String(record.status)))
                    throw new MarketError('Only a live or hidden request can be cancelled.');
                // Sellers with an open offer are told the request is gone, and their offers are closed.
                ops.push(stmt(c.db, 'UPDATE buyer_requests SET status=?,updated=? WHERE id=?', action === 'delete' ? 'Deleted' : 'Cancelled', t, key),
                    stmt(c.db, "INSERT INTO notifications (id,owner,title,body,link_type,link_id,read,created) SELECT 'request-removed:'||id,owner,'Request closed by the support team',?,'','',0,? FROM seller_offers WHERE request_id=? AND status='Pending' ON CONFLICT(id) DO NOTHING", 'The buyer request "' + record.title + '" was ' + (action === 'delete' ? 'removed' : 'cancelled') + ' by the Picking Price support team, so your offer on it is closed.', t, key),
                    stmt(c.db, "UPDATE seller_offers SET status='Not selected',updated=? WHERE request_id=? AND status='Pending'", t, key));
            }
        }
        else if (type === 'request') {
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
        if (!['hide', 'restore', 'delete'].includes(action))
            throw new MarketError('Choose hide, restore or delete.');
        ops.push(action === 'delete' ? stmt(c.db, 'DELETE FROM reviews WHERE id=?', key) : stmt(c.db, 'UPDATE reviews SET hidden=? WHERE id=?', action === 'hide' ? 1 : 0, key));
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
    const message = await moderationNotice(c, String(type), String(action), record, reason);
    ops.push(notice(c.db, owner, message.title, message.body, message.linkType, message.linkId), log(c, type + ':' + action, key));
    await c.db.batch(ops);
    return { ok: true };
}
