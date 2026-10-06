import { Context, Database, MarketError, Row, User, id, now, Statement } from './types';
export const defaults = { freeListings: 10, extraListingPrice: 50, promotion24h: 150, promotion3d: 350, promotion7d: 700, paymentInstructions: '', promotionDurations: [1, 3, 7], promotionPlacement: 'featured-first' };
export const initialCategories = [['Clothes', []], ['Electronics', []], ['Furniture', []], ['Sports', []], ['Books', []], ['Cameras', []], ['Automobiles', []], ['Kitchen', []], ['Jewelry', []], ['Kids', []], ['Art', []], ['Accessories', []]] as const;
export const one = (db: Database, sql: string, ...args: unknown[]) => db.prepare(sql).bind(...args).first<Row>();
export const rows = async (db: Database, sql: string, ...args: unknown[]) => (await db.prepare(sql).bind(...args).all<Row>()).results;
export const run = (db: Database, sql: string, ...args: unknown[]) => db.prepare(sql).bind(...args).run();
export const stmt = (db: Database, sql: string, ...args: unknown[]) => db.prepare(sql).bind(...args);
const list = (v: unknown) => { if (Array.isArray(v)) return v; try { const parsed = JSON.parse(String(v || '[]')); return Array.isArray(parsed) ? parsed : []; } catch { return []; } };
export const parseImages = (r: Row) => ({ ...r, images: typeof r.images === 'string' ? JSON.parse(r.images) : r.images || [], delivery: list(r.delivery), featured: !!r.featured, negotiable: !!r.negotiable, exchange: !!r.exchange });
export function authenticated(c: Context) { if (!c.user)
    throw new MarketError('Sign in to continue.', 401); return c.user; }
export function permit(c: Context, role: 'buyer' | 'seller' | 'admin') { const u = authenticated(c); if (u.role !== 'admin' && u.role !== 'both' && u.role !== role)
    throw new MarketError(role === 'admin' ? 'Administrator access required.' : `Enable ${role === 'seller' ? 'selling' : 'buying'} in your profile to use this feature.`, 403); if (role === 'admin' && u.role !== 'admin')
    throw new MarketError('Administrator access required.', 403); return u; }
export async function owned(c: Context, table: string, key: string) { const u = authenticated(c); const r = await one(c.db, `SELECT * FROM ${table} WHERE id=?`, key); if (!r)
    throw new MarketError('This item is no longer available.', 404); if (r.owner !== u.userId && u.role !== 'admin')
    throw new MarketError('You cannot change another member’s item.', 403); return r; }
export const notice = (db: Database, owner: string, title: string, body: string, type = '', target = '', key = id()) => stmt(db, 'INSERT INTO notifications (id,owner,title,body,link_type,link_id,read,created) VALUES (?,?,?,?,?,?,0,?) ON CONFLICT(id) DO NOTHING', key, owner, title, body, type, target, now());
export const log = (c: Context, action: string, target: string) => stmt(c.db, 'INSERT INTO admin_audit (id,owner,action,target,created) VALUES (?,?,?,?,?)', id(), authenticated(c).userId, action, target, now());
export async function configuration(db: Database) { const row = await one(db, "SELECT value FROM settings WHERE key='market'"); return { ...defaults, ...(row ? JSON.parse(row.value) : {}) }; }
export async function ensureProfile(c: Context) { if (!c.user || c.user.provider === 'admin-panel') // the panel administrator is not a marketplace member
    return; const u = c.user; await run(c.db, 'INSERT INTO profiles (id,name,role,created) VALUES (?,?,?,?) ON CONFLICT(id) DO NOTHING', u.userId, u.displayName, u.role === 'admin' ? 'both' : u.role, now()); const p = await one(c.db, 'SELECT * FROM profiles WHERE id=?', u.userId); if (p?.suspended && u.role !== 'admin')
    throw new MarketError('Your account is suspended. Contact the marketplace administrator.', 403); if (u.role !== 'admin')
    u.role = p!.role; u.displayName = p!.name; }
export async function categoryCheck(db: Database, category: string, subcategory = '') { const r = await one(db, 'SELECT * FROM categories WHERE name=? AND active=1', category); if (!r)
    throw new MarketError('Choose an active category.'); if (subcategory && !JSON.parse(r.subcategories).includes(subcategory))
    throw new MarketError('Choose a valid subcategory.'); }
export async function uploadCheck(c: Context, urls: string[]) { for (const url of urls.filter(x => x.startsWith('/api/files/'))) {
    const file = await one(c.db, 'SELECT owner FROM uploads WHERE id=?', url.split('/').pop());
    if (!file || (file.owner !== authenticated(c).userId && c.user?.role !== 'admin'))
        throw new MarketError('Use photos uploaded to your own account.');
} }
const initialized = new WeakSet<Database>();
export async function initialize(db: Database) {
    if (initialized.has(db))
        return;
    await db.batch([stmt(db, "INSERT INTO settings (key,value) VALUES ('market',?) ON CONFLICT(key) DO NOTHING", JSON.stringify(defaults)), stmt(db, "INSERT INTO settings (key,value) VALUES ('initialized','1') ON CONFLICT(key) DO NOTHING")]);
    // One-time move to the current category list and free-listing default. It must not repeat,
    // or it would undo the categories and limits the administrator sets afterwards.
    if (!await one(db, "SELECT value FROM settings WHERE key='catalogue:v2'")) {
        await db.batch([stmt(db, 'UPDATE categories SET active=0'), ...initialCategories.map(([name, subs]) => stmt(db, 'INSERT INTO categories (id,name,subcategories,active) VALUES (?,?,?,1) ON CONFLICT(id) DO UPDATE SET name=excluded.name, subcategories=excluded.subcategories, active=1', name.toLowerCase(), name, JSON.stringify(subs))), stmt(db, "INSERT INTO settings (key,value) VALUES ('catalogue:v2','1') ON CONFLICT(key) DO NOTHING")]);
        const row = await one(db, "SELECT value FROM settings WHERE key='market'");
        const parsed = row ? JSON.parse(row.value) : null;
        if (parsed && [25, 2, 100].includes(parsed.freeListings)) {
            parsed.freeListings = 10;
            await run(db, "UPDATE settings SET value=? WHERE key='market'", JSON.stringify(parsed));
        }
    }
    // Add contact columns to profiles and listings if missing
    for (const col of ['phone', 'whatsapp', 'meetup_spot']) {
        try { await run(db, `ALTER TABLE profiles ADD COLUMN ${col} TEXT NOT NULL DEFAULT ''`); } catch {}
        if (col !== 'meetup_spot') { try { await run(db, `ALTER TABLE listings ADD COLUMN ${col} TEXT NOT NULL DEFAULT ''`); } catch {} }
        else { try { await run(db, `ALTER TABLE listings ADD COLUMN meetup_spot TEXT NOT NULL DEFAULT ''`); } catch {} }
    }
    // Delivery and pickup options the seller offers, stored as a JSON list.
    try { await run(db, "ALTER TABLE listings ADD COLUMN delivery TEXT NOT NULL DEFAULT '[]'"); } catch {}
    // The seller's two deal switches: open to price offers, open to an exchange.
    try { await run(db, 'ALTER TABLE listings ADD COLUMN negotiable INTEGER NOT NULL DEFAULT 0'); } catch {}
    try { await run(db, 'ALTER TABLE listings ADD COLUMN exchange INTEGER NOT NULL DEFAULT 0'); } catch {}
    // Buyer requests saved as drafts from the Post a Request page (the form's fields as JSON).
    await run(db, "CREATE TABLE IF NOT EXISTS request_drafts (id TEXT PRIMARY KEY, owner TEXT NOT NULL, title TEXT NOT NULL DEFAULT '', data TEXT NOT NULL, updated TEXT NOT NULL)");
    await run(db, 'CREATE INDEX IF NOT EXISTS request_drafts_owner ON request_drafts (owner)');
    // Which notifications have already been handled by the email sender (see email.ts).
    await run(db, "CREATE TABLE IF NOT EXISTS notification_emails (id TEXT PRIMARY KEY, owner TEXT NOT NULL, link TEXT NOT NULL DEFAULT '', sent INTEGER NOT NULL DEFAULT 0, created TEXT NOT NULL)");
    await run(db, 'CREATE INDEX IF NOT EXISTS notification_emails_owner ON notification_emails (owner, link)');
    initialized.add(db);
}
export async function expireForUser(c: Context) {
    if (!c.user)
        return;
    const uid = c.user.userId, t = now();
    await c.db.batch([
        stmt(c.db, "INSERT INTO notifications (id,owner,title,body,link_type,link_id,read,created) SELECT 'request-expired:'||id,owner,'Request expired',title,'request',id,0,? FROM buyer_requests WHERE owner=? AND status IN ('Open','Responses Received') AND expiry<=? ON CONFLICT(id) DO NOTHING", t, uid, t),
        stmt(c.db, "UPDATE buyer_requests SET status='Expired',updated=? WHERE owner=? AND status IN ('Open','Responses Received') AND expiry<=?", t, uid, t),
        stmt(c.db, "INSERT INTO notifications (id,owner,title,body,link_type,link_id,read,created) SELECT 'promotion-expired:'||id,owner,'Promotion expired','Your featured listing period has ended.','listing',listing_id,0,? FROM promotions WHERE owner=? AND status='Active' AND expires<=? ON CONFLICT(id) DO NOTHING", t, uid, t),
        stmt(c.db, "UPDATE promotions SET status='Expired' WHERE owner=? AND status='Active' AND expires<=?", uid, t),
    ]);
}
export async function bootstrap(c: Context) { await initialize(c.db); await ensureProfile(c); await expireForUser(c); let avatar = null; if (c.user) { const p = await one(c.db, 'SELECT avatar FROM profiles WHERE id=?', c.user.userId); if (p) avatar = p.avatar; } return { user: c.user ? { id: c.user.userId, name: c.user.displayName, role: c.user.role, provider: c.user.provider, email: c.user.email, avatar } : null, categories: (await rows(c.db, 'SELECT * FROM categories WHERE active=1 ORDER BY name')).map(r => ({ ...r, subcategories: JSON.parse(r.subcategories) })), settings: await configuration(c.db), unread: c.user ? Number((await one(c.db, 'SELECT COUNT(*) n FROM notifications WHERE owner=? AND read=0', c.user.userId))!.n) : 0, openRequests: Number((await one(c.db, "SELECT COUNT(*) n FROM buyer_requests a JOIN profiles p ON p.id=a.owner WHERE a.status IN ('Open','Responses Received') AND a.expiry>? AND p.suspended=0", now()))!.n), legacyRemaining: !!await one(c.db, "SELECT id FROM records WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key='legacy:'||records.id) LIMIT 1") }; }
export async function pagination(db: Database, sql: string, countSql: string, args: unknown[], page: number, size: number, offset: number, orderArgs: unknown[] = []) { const [items, total] = await Promise.all([rows(db, sql + ' LIMIT ? OFFSET ?', ...args, ...orderArgs, size, offset), one(db, countSql, ...args)]); return { items, total: Number(total?.n || 0), page, size, pages: Math.ceil(Number(total?.n || 0) / size) }; }
