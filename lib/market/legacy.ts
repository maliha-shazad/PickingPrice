import { Context, Row, now, id } from './types';
import { one, rows, run, stmt } from './core';
// Bounded, idempotent data migration; original records are retained for administrator inspection.
export async function migrateLegacy(c: Context) {
    if (await one(c.db, "SELECT value FROM settings WHERE key='legacy_done'"))
        return;
    const pending = await rows(c.db, "SELECT r.* FROM records r WHERE NOT EXISTS (SELECT 1 FROM settings s WHERE s.key='legacy:'||r.id) ORDER BY CASE WHEN kind IN ('listing','request') THEN 0 WHEN kind='offer' THEN 1 ELSE 2 END,created LIMIT 100");
    for (const r of pending) {
        let d: Row;
        try {
            d = JSON.parse(r.data);
        }
        catch {
            d = {};
        }
        const owner = r.owner, t = r.created || now();
        await run(c.db, "INSERT INTO profiles (id,name,role,created) VALUES (?,?,'both',?) ON CONFLICT(id) DO NOTHING", owner, d.seller || 'Marketplace member', t);
        let result = 'Imported';
        try {
            if (r.kind === 'listing') {
                const images = d.image ? [d.image] : [];
                await c.db.batch([stmt(c.db, 'INSERT INTO listings (id,owner,title,description,category,subcategory,brand,price,quantity,condition,location,images,status,created,updated) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING', r.id, owner, d.title || 'Imported listing', d.description || '', d.category || 'Accessories', '', d.brand || '', Number(d.price) || 0, Number(d.quantity) || 1, d.condition || 'Used', d.location || '', JSON.stringify(images), images.length && d.description && d.location ? 'Active' : 'Hidden', t, t), stmt(c.db, "UPDATE profiles SET used_slots=(SELECT COUNT(*) FROM listings WHERE owner=? AND status!='Deleted') WHERE id=?", owner, owner)]);
            }
            else if (r.kind === 'request') {
                const valid = Number.isFinite(Date.parse(d.expiry));
                await run(c.db, 'INSERT INTO buyer_requests (id,owner,title,description,category,price,quantity,condition,location,image,expiry,status,created,updated) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING', r.id, owner, d.title || 'Imported request', d.description || '', d.category || 'Accessories', Number(d.price) || 0, Number(d.quantity) || 1, d.condition || 'Used', d.location || '', d.image || '', valid ? new Date(d.expiry).toISOString() : t, valid ? (d.status || 'Open') : 'Cancelled', t, t);
            }
            else if (r.kind === 'wishlist')
                await run(c.db, 'INSERT INTO favorites (id,owner,listing_id,created) VALUES (?,?,?,?) ON CONFLICT(id) DO NOTHING', owner + ':' + r.target, owner, r.target, t);
            else if (r.kind === 'offer') {
                if (await one(c.db, 'SELECT id FROM buyer_requests WHERE id=?', r.target))
                    await run(c.db, 'INSERT INTO seller_offers (id,request_id,owner,price,description,status,created,updated) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING', r.id, r.target, owner, Number(d.price) || 0, d.text || 'Imported offer', Number(d.price) > 0 ? 'Pending' : 'Withdrawn', t, t);
                else
                    result = 'Legacy offer retained: request missing';
            }
            else if (r.kind === 'message') {
                if (r.target && await one(c.db, 'SELECT id FROM profiles WHERE id=?', r.target)) {
                    const [a, b] = [owner, r.target].sort(), conv = a + ':' + b + ':legacy';
                    await c.db.batch([stmt(c.db, "INSERT INTO conversations (id,first_user,second_user,context_type,context_id,title,updated) VALUES (?,?,?,'legacy','','Earlier conversation',?) ON CONFLICT(id) DO NOTHING", conv, a, b, t), stmt(c.db, 'INSERT INTO chat_messages (id,conversation_id,owner,body,created) VALUES (?,?,?,?,?) ON CONFLICT(id) DO NOTHING', r.id, conv, owner, d.text || '', t)]);
                }
                else
                    result = 'Legacy message retained: recipient unavailable';
            }
            else if (r.kind === 'payment')
                await run(c.db, "INSERT INTO payment_requests (id,owner,purpose,quantity,duration,listing_id,amount,reference,status,note,created) VALUES (?,?,'slots',?,0,'',0,?,'Pending','Legacy enquiry: request a new priced payment submission.',?) ON CONFLICT(id) DO NOTHING", r.id, owner, Number(d.quantity) || 1, 'legacy:' + r.id + ':' + (d.reference || ''), t);
            else if (r.kind === 'report')
                await run(c.db, "INSERT INTO reports (id,owner,target_type,target_id,reason,status,created) VALUES (?,?,'listing',?,?,'Open',?) ON CONFLICT(id) DO NOTHING", r.id, owner, r.target, d.text || 'Legacy report', t);
            else
                result = 'Legacy record retained for review';
        }
        catch {
            result = 'Legacy record retained: import needs review';
        }
        await run(c.db, 'INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO NOTHING', 'legacy:' + r.id, result);
    }
    if (pending.length < 100)
        await run(c.db, "INSERT INTO settings (key,value) VALUES ('legacy_done','1') ON CONFLICT(key) DO NOTHING");
}
