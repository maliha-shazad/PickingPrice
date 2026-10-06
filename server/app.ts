import express, { Request, Response, NextFunction } from 'express';
import { randomBytes, createHash } from 'node:crypto';
import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { market } from '../lib/market/router';
import { Database, MarketError, User, Context, now, id } from '../lib/market/types';
import { one, run, stmt, ensureProfile, initialize } from '../lib/market/core';
import { imageMime } from '../lib/market/files';
import { hashPassword, verifyPassword } from '../lib/auth/password';
import { redeemResetCode } from '../lib/market/password-reset';
import { legalHtml, legalTitle } from '../app/legal-content';
import { setMailer, defaultSender } from '../lib/market/email';
import { adminStatus, adminSetup, adminLogin, adminLogout, adminChangePassword, adminMarket, adminSessionSeconds } from '../lib/market/admin-auth';
export type Config = {
    origin: string;
    uploadsDir: string;
    publicDir: string;
    adminSetupCode?: string;
    googleClientId?: string;
    googleClientSecret?: string;
    /** Google Search Console "HTML tag" code, proving to Google that we own this website. */
    googleSiteVerification?: string;
    /** Resend API key; notification emails are sent only when it is set. */
    resendKey?: string;
    emailFrom?: string;
    /** Where emails are posted; only tests change it. */
    emailEndpoint?: string;
};
const digest = (v: string) => createHash('sha256').update(v).digest('hex');
const token = () => randomBytes(32).toString('base64url');
function cookie(req: Request, name: string) { const item = (req.headers.cookie || '').split(';').find(x => x.trim().startsWith(name + '=')); return item ? decodeURIComponent(item.trim().slice(name.length + 1)) : ''; }
export function createApp(db: Database, config: Config) {
    const app = express();
    app.disable('x-powered-by');
    app.set('trust proxy', 1);
    const secure = config.origin.startsWith('https:');
    setMailer(config.resendKey ? { key: config.resendKey, from: config.emailFrom || defaultSender, site: config.origin, background: true, endpoint: config.emailEndpoint } : null);
    const sessionName = secure ? '__Host-pp_session' : 'pp_session';
    const oauthName = secure ? '__Host-pp_oauth' : 'pp_oauth';
    const googleReady = () => !!(config.googleClientId && config.googleClientSecret);
    const setCookie = (res: Response, name: string, value: string, age: number) => res.append('Set-Cookie', `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${secure ? '; Secure' : ''}`);
    app.use((req, res, next) => { res.set('X-Content-Type-Options', 'nosniff'); res.set('Referrer-Policy', 'strict-origin-when-cross-origin'); if (req.path.startsWith('/api/'))
        res.set('Cache-Control', 'no-store'); if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin !== config.origin)
        return res.status(403).json({ error: 'Invalid request origin.' }); next(); });
    app.use('/api/files', express.raw({ type: () => true, limit: '5mb' }));
    app.use(express.json({ limit: '24kb' }));
    async function user(req: Request): Promise<User | null> { const t = cookie(req, sessionName); if (!t)
        return null; const r = await one(db, 'SELECT a.id,a.email,a.name,a.role,a.google_sub FROM sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token_hash=? AND s.expires>?', digest(t), now()); return r ? { userId: r.id, email: r.email, displayName: r.name, role: r.role === 'admin' ? 'both' : r.role, provider: r.google_sub ? 'google' : 'email' } : null; } // administrator rights exist only in the separate /admin panel
    async function context(req: Request) { const c: Context = { db, user: await user(req) }; await initialize(db); await ensureProfile(c); return c; }
    async function session(res: Response, account: string) { const profile = await one(db, 'SELECT suspended FROM profiles WHERE id=?', account); if (profile?.suspended) throw new MarketError('Your account is suspended.', 403); const t = token(); await run(db, 'INSERT INTO sessions (token_hash,account_id,expires) VALUES (?,?,?)', digest(t), account, new Date(Date.now() + 7 * 86400000).toISOString()); setCookie(res, sessionName, t, 7 * 86400); }
    async function limit(req: Request, email: string) { for (const [key, max] of [[digest('ip:' + (req.ip || 'unknown')), 30], [digest('email:' + email), 8]] as const) {
        const until = new Date(Date.now() + 900000).toISOString(), t = now();
        const r = await one(db, "INSERT INTO auth_attempts (key,count,expires) VALUES (?,'1',?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN auth_attempts.expires<? THEN '1' ELSE CAST(CAST(auth_attempts.count AS INTEGER)+1 AS TEXT) END,expires=CASE WHEN auth_attempts.expires<? THEN excluded.expires ELSE auth_attempts.expires END RETURNING count", key, until, t, t);
        if (Number(r!.count) > max)
            throw new MarketError('Too many attempts. Try again in 15 minutes.', 429);
    } }
    // Same rules as the Workers edition, so an account behaves identically on either.
    const credentials = (body: Record<string, unknown> = {}) => { const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '', password = typeof body.password === 'string' ? body.password : ''; if (email.length > 254 || (!/^\S+@\S+\.\S+$/.test(email) && !/^\+?\d{7,15}$/.test(email.replace(/[\s-]/g, ''))))
        throw new MarketError('Enter a valid email address or phone number.'); if (password.length < 8 || password.length > 128)
        throw new MarketError('Use a password between 8 and 128 characters.'); return { email, password }; };
    app.get('/api/auth/options', (_req, res) => res.json({ email: true, google: googleReady(), recovery: false }));
    app.post('/api/auth/signup', async (req, res) => { const { email, password } = credentials(req.body); const name = typeof req.body.name === 'string' ? req.body.name.trim() : ''; if (name.length < 2 || name.length > 80)
        throw new MarketError('Enter a name between 2 and 80 characters.'); await limit(req, email); const role = ['buyer', 'seller', 'both'].includes(req.body.role) ? req.body.role : 'buyer', key = id(), hash = await hashPassword(password); const inserted = await one(db, 'INSERT INTO accounts (id,email,name,password_hash,role,created) VALUES (?,?,?,?,?,?) ON CONFLICT(email) DO NOTHING RETURNING id', key, email, name, hash, role, now()); if (!inserted)
        throw new MarketError('Unable to register with these details. Try signing in.', 409); await session(res, key); res.json({ ok: true }); });
    app.post('/api/auth/login', async (req, res) => { const { email, password } = credentials(req.body); await limit(req, email); const a = await one(db, 'SELECT id,password_hash FROM accounts WHERE email=?', email); if (!await verifyPassword(password, a?.password_hash || null))
        throw new MarketError('Email or password is incorrect.', 401); const p = await one(db, 'SELECT suspended FROM profiles WHERE id=?', a!.id); if (p?.suspended)
        throw new MarketError('Your account is suspended.', 403); await session(res, a!.id); res.json({ ok: true }); });
    app.post('/api/auth/logout', async (req, res) => { const t = cookie(req, sessionName); if (t)
        await run(db, 'DELETE FROM sessions WHERE token_hash=?', digest(t)); setCookie(res, sessionName, '', 0); res.json({ ok: true }); });
    app.post('/api/auth/reset', async (req, res) => { const { email, password } = credentials(req.body); await limit(req, email); await session(res, await redeemResetCode(db, email, req.body.code, password)); res.json({ ok: true }); });
    app.get('/api/auth/google', async (_req, res) => { if (!googleReady())
        return res.redirect('/?auth_error=google_not_configured'); const state = token(), verifier = token(); await run(db, 'INSERT INTO oauth_states (state_hash,verifier,expires) VALUES (?,?,?)', digest(state), verifier, new Date(Date.now() + 600000).toISOString()); setCookie(res, oauthName, state, 600); const url = new URL('https://accounts.google.com/o/oauth2/v2/auth'); url.search = new URLSearchParams({ client_id: config.googleClientId!, redirect_uri: config.origin + '/api/auth/google/callback', response_type: 'code', scope: 'openid email profile', state, code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256', prompt: 'select_account' }).toString(); res.redirect(url.toString()); });
    app.get('/api/auth/google/callback', async (req, res) => { const fail = (code: string) => { setCookie(res, oauthName, '', 0); return res.redirect('/?auth_error=' + code); }; if (!googleReady())
        return fail('google_not_configured'); const state = typeof req.query.state === 'string' ? req.query.state : ''; if (!state || state !== cookie(req, oauthName))
        return fail('invalid_state'); const saved = await one(db, 'DELETE FROM oauth_states WHERE state_hash=? AND expires>? RETURNING verifier', digest(state), now()); if (!saved || typeof req.query.code !== 'string')
        return fail('cancelled'); try {
        const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: config.googleClientId!, client_secret: config.googleClientSecret!, code: req.query.code, code_verifier: saved.verifier, grant_type: 'authorization_code', redirect_uri: config.origin + '/api/auth/google/callback' }), signal: AbortSignal.timeout(10000) });
        if (!response.ok)
            return fail('google_failed');
        const tokens: {access_token: string} = await response.json();
        const info = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: 'Bearer ' + tokens.access_token }, signal: AbortSignal.timeout(10000) });
        const p: {sub: string; email: string; email_verified: boolean; name?: string} = await info.json();
        if (!info.ok || typeof p.sub !== 'string' || typeof p.email !== 'string' || p.email_verified !== true)
            return fail('unverified');
        let a = await one(db, 'SELECT id FROM accounts WHERE google_sub=?', p.sub);
        if (!a) {
            if (await one(db, 'SELECT id FROM accounts WHERE email=?', p.email.toLowerCase()))
                return fail('existing_email');
            const key = id();
            a = await one(db, "INSERT INTO accounts (id,email,name,google_sub,role,created) VALUES (?,?,?,?,'both',?) ON CONFLICT DO NOTHING RETURNING id", key, p.email.toLowerCase(), typeof p.name === 'string' ? p.name.slice(0, 80) : p.email, p.sub, now());
            if (!a)
                return fail('existing_email');
        }
        await session(res, a.id);
        setCookie(res, oauthName, '', 0);
        res.redirect('/?welcome=1');
    }
    catch {
        return fail('unavailable');
    } });
    app.post('/api/files', async (req, res) => { const c = await context(req); if (!c.user)
        throw new MarketError('Sign in to upload.', 401); if (!Buffer.isBuffer(req.body))
        throw new MarketError('Upload a photo.'); const mime = imageMime(req.body); const uploaded = await one(db, 'SELECT COUNT(*) n FROM uploads WHERE owner=? AND created>?', c.user.userId, new Date(Date.now() - 86400000).toISOString()); if (Number(uploaded!.n) >= 100)
        throw new MarketError('Daily photo upload limit reached.', 429); const key = id(); await mkdir(config.uploadsDir, { recursive: true }); await writeFile(resolve(config.uploadsDir, key), req.body); try {
        await run(db, 'INSERT INTO uploads (id,owner,mime,size,created) VALUES (?,?,?,?,?)', key, c.user.userId, mime, req.body.length, now());
    }
    catch (e) {
        await unlink(resolve(config.uploadsDir, key));
        throw e;
    } res.json({ url: '/api/files/' + key }); });
    app.get('/api/files/:id', async (req, res) => { const key = String(req.params.id); if (!/^[a-zA-Z0-9-]{1,80}$/.test(key))
        throw new MarketError('Photo not found.', 404); const file = await one(db, 'SELECT mime FROM uploads WHERE id=?', key); if (!file)
        throw new MarketError('Photo not found.', 404); res.set('Content-Type', file.mime); res.set('Cache-Control', 'public,max-age=86400'); res.send(await readFile(resolve(config.uploadsDir, key))); });
    const adminName = secure ? '__Host-pp_admin' : 'pp_admin';
    const adminCookie = (res: Response, value: string, age: number) => res.append('Set-Cookie', `${adminName}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secure ? '; Secure' : ''}`);
    const ip = (req: Request) => req.ip || 'unknown';
    app.get('/api/admin/session', async (req, res) => { res.json(await adminStatus(db, cookie(req, adminName), config.adminSetupCode)); });
    app.post('/api/admin/login', async (req, res) => { adminCookie(res, await adminLogin(db, req.body, ip(req)), adminSessionSeconds); res.json({ ok: true }); });
    app.post('/api/admin/setup', async (req, res) => { adminCookie(res, await adminSetup(db, req.body, config.adminSetupCode, ip(req)), adminSessionSeconds); res.json({ ok: true }); });
    app.post('/api/admin/logout', async (req, res) => { await adminLogout(db, cookie(req, adminName)); adminCookie(res, '', 0); res.json({ ok: true }); });
    app.post('/api/admin/password', async (req, res) => { res.json(await adminChangePassword(db, cookie(req, adminName), req.body, ip(req))); });
    app.use('/api/admin/market', async (req, res) => { const path = req.path.split('/').filter(Boolean).map(decodeURIComponent); res.json(await adminMarket(db, cookie(req, adminName), req.method, path, new URL(req.originalUrl, config.origin).searchParams, req.body || {})); });
    app.use('/api/market', async (req, res) => { const c = await context(req); const path = req.path.split('/').filter(Boolean).map(decodeURIComponent); const result = await market(c, req.method, path, new URL(req.originalUrl, config.origin).searchParams, req.body || {}); res.json(result); });
    app.use(express.static(config.publicDir, { index: false }));
    // The page shell, read once. Google's ownership check looks for its tag in the home page's <head>.
    let shell: Promise<string> | undefined;
    const verification = (config.googleSiteVerification || '').replace(/[^\w-]/g, '');
    const indexHtml = () => shell ??= readFile(resolve(config.publicDir, 'index.html'), 'utf8').then(html => verification ? html.replace('</head>', '<meta name="google-site-verification" content="' + verification + '"/></head>') : html);
    // Privacy Policy and Terms of Service are sent with their full text in the HTML, so they can be read
    // without JavaScript (Google's app review reads them that way); the page script then draws the same thing.
    app.get(['/privacy', '/terms'], async (req, res) => { const kind = req.path.startsWith('/privacy') ? 'privacy' : 'terms';
        res.type('html').send((await indexHtml()).replace(/<title>[^<]*<\/title>/, () => '<title>' + legalTitle(kind) + '</title>').replace('<div id="root"></div>', () => '<div id="root"><div class="pp-legal-page">' + legalHtml(kind) + '</div></div>')); });
    app.get('/{*path}', async (_req, res) => { res.type('html').send(await indexHtml()); });
    app.use((e: unknown, _req: Request, res: Response, _next: NextFunction) => { if (e instanceof MarketError)
        return res.status(e.status).json({ error: e.message }); const err = e as {type?: string; message?: string}; if (err?.type === 'entity.parse.failed')
        return res.status(400).json({ error: 'Invalid JSON form.' }); if (err?.type === 'entity.too.large')
        return res.status(413).json({ error: 'Upload or form is too large.' }); console.error('Server error', err?.message); res.status(503).json({ error: 'This action could not be completed. Please retry.' }); });
    return app;
}
