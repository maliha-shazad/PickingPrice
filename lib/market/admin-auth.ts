import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { Database, MarketError, User, id, now } from './types';
import { one, run, stmt } from './core';
import { market } from './router';
import { hashPassword, verifyPassword } from '../auth/password';

// The administrator is deliberately not a marketplace account: it lives in its own
// single-row table with its own sessions, so member sign-up, sign-in and password
// reset can never create or take over the administrator.
export const adminSessionSeconds = 12 * 3600;
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const ipKey = (ip: string) => digest('admin-ip:' + ip);
const prepared = new WeakSet<Database>();
type Body = Record<string, unknown>;

async function store(db: Database) {
    if (prepared.has(db))
        return;
    await db.batch([
        stmt(db, 'CREATE TABLE IF NOT EXISTS admin_auth (id INTEGER PRIMARY KEY CHECK (id = 1), email TEXT NOT NULL, password_hash TEXT NOT NULL, updated TEXT NOT NULL)'),
        stmt(db, 'CREATE TABLE IF NOT EXISTS admin_sessions (token_hash TEXT PRIMARY KEY, expires TEXT NOT NULL)'),
    ]);
    prepared.add(db);
}
const input = (body: unknown): Body => body && typeof body === 'object' && !Array.isArray(body) ? body as Body : {};
function emailOf(body: Body) {
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (email.length > 254 || !/^\S+@\S+\.\S+$/.test(email))
        throw new MarketError('Enter a valid email address.');
    return email;
}
function newPassword(value: unknown) {
    if (typeof value !== 'string' || value.length < 12 || value.length > 128)
        throw new MarketError('Use a password between 12 and 128 characters.');
    return value;
}
const usableCode = (code?: string): code is string => typeof code === 'string' && code.length >= 16;
async function limit(db: Database, ip: string) {
    const until = new Date(Date.now() + 900000).toISOString(), t = now();
    for (const [key, max] of [[ipKey(ip), 10], [digest('admin-all'), 60]] as const) {
        const r = await one(db, "INSERT INTO auth_attempts (key,count,expires) VALUES (?,'1',?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN auth_attempts.expires<? THEN '1' ELSE CAST(CAST(auth_attempts.count AS INTEGER)+1 AS TEXT) END,expires=CASE WHEN auth_attempts.expires<? THEN excluded.expires ELSE auth_attempts.expires END RETURNING count", key, until, t, t);
        if (Number(r!.count) > max)
            throw new MarketError('Too many attempts. Try again in 15 minutes.', 429);
    }
}
async function issue(db: Database) {
    const token = randomBytes(32).toString('base64url');
    await run(db, 'INSERT INTO admin_sessions (token_hash,expires) VALUES (?,?)', digest(token), new Date(Date.now() + adminSessionSeconds * 1000).toISOString());
    return token;
}

export async function adminUser(db: Database, token: string): Promise<User | null> {
    if (!token)
        return null;
    await store(db);
    const row = await one(db, 'SELECT a.email FROM admin_sessions s JOIN admin_auth a ON a.id=1 WHERE s.token_hash=? AND s.expires>?', digest(token), now());
    return row ? { userId: 'admin', displayName: 'Administrator', email: String(row.email), role: 'admin', provider: 'admin-panel' } : null;
}
export async function adminStatus(db: Database, token: string, setupCode?: string) {
    await store(db);
    const configured = !!await one(db, 'SELECT id FROM admin_auth WHERE id=1');
    const user = configured ? await adminUser(db, token) : null;
    return { configured, setupAvailable: !configured && usableCode(setupCode), signedIn: !!user, email: user?.email || '' };
}
/** Creates the one administrator. Returns false, changing nothing, when one already exists. */
export async function adminCreate(db: Database, email: string, password: string) {
    await store(db);
    const inserted = await one(db, 'INSERT INTO admin_auth (id,email,password_hash,updated) VALUES (1,?,?,?) ON CONFLICT(id) DO NOTHING RETURNING id', emailOf({ email }), await hashPassword(newPassword(password)), now());
    return !!inserted;
}
export async function adminSetup(db: Database, raw: unknown, setupCode: string | undefined, ip: string) {
    const body = input(raw);
    await store(db);
    if (await one(db, 'SELECT id FROM admin_auth WHERE id=1'))
        throw new MarketError('The administrator account already exists. Sign in instead.', 409);
    if (!usableCode(setupCode))
        throw new MarketError('Administrator setup is not enabled on this server.', 403);
    await limit(db, ip);
    const supplied = typeof body.code === 'string' ? body.code : '';
    if (!timingSafeEqual(Buffer.from(digest(supplied)), Buffer.from(digest(setupCode))))
        throw new MarketError('The setup code is incorrect.', 403);
    if (!await adminCreate(db, emailOf(body), newPassword(body.password)))
        throw new MarketError('The administrator account already exists. Sign in instead.', 409);
    return issue(db);
}
export async function adminLogin(db: Database, raw: unknown, ip: string) {
    const body = input(raw);
    await store(db);
    await limit(db, ip);
    const email = emailOf(body), password = typeof body.password === 'string' ? body.password : '';
    const admin = await one(db, 'SELECT email,password_hash FROM admin_auth WHERE id=1');
    const valid = await verifyPassword(password, admin ? String(admin.password_hash) : null);
    if (!valid || admin!.email !== email)
        throw new MarketError('Email or password is incorrect.', 401);
    await db.batch([stmt(db, 'DELETE FROM admin_sessions WHERE expires<=?', now()), stmt(db, 'DELETE FROM auth_attempts WHERE key=?', ipKey(ip))]);
    return issue(db);
}
export async function adminLogout(db: Database, token: string) {
    if (!token)
        return;
    await store(db);
    await run(db, 'DELETE FROM admin_sessions WHERE token_hash=?', digest(token));
}
export async function adminChangePassword(db: Database, token: string, raw: unknown, ip: string) {
    const body = input(raw);
    if (!await adminUser(db, token))
        throw new MarketError('Sign in to continue.', 401);
    await limit(db, ip);
    const admin = await one(db, 'SELECT password_hash FROM admin_auth WHERE id=1');
    // 403, not 401: the session is valid, only the confirmation of the old password failed.
    if (!await verifyPassword(typeof body.current === 'string' ? body.current : '', String(admin!.password_hash)))
        throw new MarketError('Your current password is incorrect.', 403);
    const next = newPassword(body.next);
    if (next === body.current)
        throw new MarketError('Choose a password that differs from the current one.');
    await db.batch([
        stmt(db, 'UPDATE admin_auth SET password_hash=?,updated=? WHERE id=1', await hashPassword(next), now()),
        stmt(db, 'DELETE FROM admin_sessions WHERE token_hash!=?', digest(token)),
        stmt(db, 'DELETE FROM auth_attempts WHERE key=?', ipKey(ip)),
        stmt(db, 'INSERT INTO admin_audit (id,owner,action,target,created) VALUES (?,?,?,?,?)', id(), 'admin', 'admin:password', 'admin', now()),
    ]);
    return { ok: true };
}
/** Marketplace access for the admin panel: every admin operation, plus read-only record views. */
export async function adminMarket(db: Database, token: string, method: string, path: string[], q: URLSearchParams, body: Body = {}) {
    const user = await adminUser(db, token);
    if (!user)
        throw new MarketError('Sign in to continue.', 401);
    const [area, key] = path;
    const view = method === 'GET' && (area === 'offers' || (['listings', 'requests', 'profiles'].includes(area) && !!key));
    if (area !== 'admin' && !view)
        throw new MarketError('This action is not available in the admin panel.', 404);
    return market({ db, user }, method, path, q, body);
}
