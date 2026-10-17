import express, { Request, Response, NextFunction } from 'express';
import { randomBytes, createHash } from 'node:crypto';
import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { market } from '../lib/market/router';
import { Database, MarketError, User, Context, now, id } from '../lib/market/types';
import { one, run, ensureProfile, initialize } from '../lib/market/core';
import { imageMime, mediaMime } from '../lib/market/files';
import { hashPassword, verifyPassword } from '../lib/auth/password';
import { redeemResetCode, requestResetCode, checkResetCode } from '../lib/market/password-reset';
import { legalHtml, legalTitle } from '../app/legal-content';
import { setMailer, mailerFrom, activeMailer, mailService, sendMail, resetEmail, isEmail, accountEmail, welcomeEmail, passwordChangedEmail, confirmCodeEmail } from '../lib/market/email';
import { newConfirmCode, confirmEmail, confirmMinutes } from '../lib/market/email-confirm';
import type { GmailClient } from '../lib/market/gmail';
import { adminStatus, adminSetup, adminLogin, adminLogout, adminChangePassword, adminMarket, adminMail, adminSessionSeconds, adminUser } from '../lib/market/admin-auth';
export type Config = {
    origin: string;
    uploadsDir: string;
    publicDir: string;
    adminSetupCode?: string;
    googleClientId?: string;
    googleClientSecret?: string;
    /** Google Search Console "HTML tag" code, proving to Google that we own this website. */
    googleSiteVerification?: string;
    /** Google OAuth client for sending from the site's Gmail account, which the administrator connects in the admin panel. */
    gmailClientId?: string;
    gmailClientSecret?: string;
    /** Google's addresses; only tests change them. */
    gmailEndpoints?: GmailClient['endpoints'];
    /** Resend, as the other way to send (needs a verified domain), with its sender address. */
    resendKey?: string;
    emailFrom?: string;
    /** Where Resend emails are posted; only tests change it. */
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
    setMailer(mailerFrom({ gmailClientId: config.gmailClientId, gmailClientSecret: config.gmailClientSecret, gmailEndpoints: config.gmailEndpoints, resendKey: config.resendKey, from: config.emailFrom, site: config.origin, background: true, endpoint: config.emailEndpoint }));
    const sessionName = secure ? '__Host-pp_session' : 'pp_session';
    const oauthName = secure ? '__Host-pp_oauth' : 'pp_oauth';
    const googleReady = () => !!(config.googleClientId && config.googleClientSecret);
    const setCookie = (res: Response, name: string, value: string, age: number) => res.append('Set-Cookie', `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${secure ? '; Secure' : ''}`);
    // No other site may show these pages in a frame (clickjacking); over HTTPS browsers are told to stay on HTTPS.
    app.use((req, res, next) => { res.set('X-Content-Type-Options', 'nosniff'); res.set('Referrer-Policy', 'strict-origin-when-cross-origin'); res.set('X-Frame-Options', 'DENY'); res.set('Content-Security-Policy', "frame-ancestors 'none'"); if (secure) res.set('Strict-Transport-Security', 'max-age=15552000'); if (req.path.startsWith('/api/'))
        res.set('Cache-Control', 'no-store'); if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin !== config.origin)
        return res.status(403).json({ error: 'Invalid request origin.' }); next(); });
    app.use('/api/files', express.raw({ type: () => true, limit: '5mb' }));
    // The administrator's slider uploads: images up to 10 MB and videos up to 50 MB.
    app.use('/api/admin/files', express.raw({ type: () => true, limit: '51mb' }));
    app.use(express.json({ limit: '24kb' }));
    async function user(req: Request): Promise<User | null> { const t = cookie(req, sessionName); if (!t)
        return null; const r = await one(db, 'SELECT a.id,a.email,a.name,a.role,a.google_sub FROM sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token_hash=? AND s.expires>?', digest(t), now()); return r ? { userId: r.id, email: r.email, displayName: r.name, role: r.role === 'admin' ? 'both' : r.role, provider: r.google_sub ? 'google' : 'email' } : null; } // administrator rights exist only in the separate /admin panel
    async function context(req: Request) { const u = await user(req); const c: Context = { db, user: u, visitor: u ? 'member:' + u.userId : 'guest:' + digest((req.ip || '') + '|' + (req.get('user-agent') || '')).slice(0, 32) }; await initialize(db); await ensureProfile(c); return c; }
    async function session(res: Response, account: string) { const profile = await one(db, 'SELECT suspended FROM profiles WHERE id=?', account); if (profile?.suspended) throw new MarketError('Your account is suspended.', 403); const t = token(); await run(db, 'INSERT INTO sessions (token_hash,account_id,expires) VALUES (?,?,?)', digest(t), account, new Date(Date.now() + 7 * 86400000).toISOString()); setCookie(res, sessionName, t, 7 * 86400); }
    async function limit(req: Request, email: string) { for (const [key, max] of [[digest('ip:' + (req.ip || 'unknown')), 30], [digest('email:' + email), 8]] as const) {
        const until = new Date(Date.now() + 900000).toISOString(), t = now();
        const r = await one(db, "INSERT INTO auth_attempts (key,count,expires) VALUES (?,'1',?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN auth_attempts.expires<? THEN '1' ELSE CAST(CAST(auth_attempts.count AS INTEGER)+1 AS TEXT) END,expires=CASE WHEN auth_attempts.expires<? THEN excluded.expires ELSE auth_attempts.expires END RETURNING count", key, until, t, t);
        if (Number(r!.count) > max)
            throw new MarketError('Too many attempts. Try again in 15 minutes.', 429);
    } }
    // Sign-up and sign-in rules: an email (or phone number) and a password of 8 to 128 characters.
    const credentials = (body: Record<string, unknown> = {}) => { const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '', password = typeof body.password === 'string' ? body.password : ''; if (email.length > 254 || (!/^\S+@\S+\.\S+$/.test(email) && !/^\+?\d{7,15}$/.test(email.replace(/[\s-]/g, ''))))
        throw new MarketError('Enter a valid email address or phone number.'); if (password.length < 8 || password.length > 128)
        throw new MarketError('Use a password between 8 and 128 characters.'); return { email, password }; };
    app.get('/api/auth/options', (_req, res) => res.json({ email: true, google: googleReady(), recovery: false }));
    // A Pakistani mobile number, typed with or without 0 / 92 / +92 in front, kept as +923001234567.
    const mobile = (value: unknown) => { const m = /^(?:\+?92|0)?(3\d{9})$/.exec(String(value ?? '').replace(/[\s-]/g, '')); if (!m)
        throw new MarketError('Enter a valid mobile number, for example 3001234567.'); return '+92' + m[1]; };
    // Email confirmation: asked for whenever the site can send email. Without email (or for a phone-number login)
    // the account works straight away, as before.
    const canConfirm = async (email: string) => { const mail = activeMailer(); return isEmail(email) && !!mail && !!await mailService(db, mail); };
    /** Emails a new code: 'sent', 'failed', or 'none' when there is no account waiting for confirmation. */
    const sendConfirmCode = async (email: string) => { const mail = activeMailer(); const issued = await newConfirmCode(db, email); if (!issued || !mail)
        return 'none'; return await sendMail(db, mail, { to: issued.email, name: issued.name, ...confirmCodeEmail(issued.name, issued.code, issued.minutes) }) ? 'sent' : 'failed'; };
    app.post('/api/auth/signup', async (req, res) => { const { email, password } = credentials(req.body); const name = typeof req.body.name === 'string' ? req.body.name.trim() : ''; if (name.length < 2 || name.length > 80)
        throw new MarketError('Enter a name between 2 and 80 characters.'); const phone = mobile(req.body.phone); if (req.body.accepted !== true)
        throw new MarketError('Accept the Privacy Policy and Terms of Service to create an account.'); await limit(req, email); const role = ['buyer', 'seller', 'both'].includes(req.body.role) ? req.body.role : 'buyer', key = id(), hash = await hashPassword(password), confirming = await canConfirm(email); const inserted = await one(db, 'INSERT INTO accounts (id,email,name,password_hash,role,created,email_verified) VALUES (?,?,?,?,?,?,?) ON CONFLICT(email) DO NOTHING RETURNING id', key, email, name, hash, role, now(), confirming ? 0 : 1); if (!inserted)
        throw new MarketError('Unable to register with these details. Try signing in.', 409);
        // The number goes straight into the member's profile, where they can see and change it.
        await initialize(db); await run(db, 'INSERT INTO profiles (id,name,role,phone,created) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET phone=excluded.phone', key, name, role, phone, now());
        if (confirming)
            return res.json({ ok: true, confirm: true, email, sent: await sendConfirmCode(email) === 'sent', minutes: confirmMinutes });
        await session(res, key); await accountEmail(db, email, name, welcomeEmail(name, config.origin)); res.json({ ok: true }); });
    app.post('/api/auth/login', async (req, res) => { const { email, password } = credentials(req.body); await limit(req, email); const a = await one(db, 'SELECT id,password_hash,email_verified FROM accounts WHERE email=?', email); if (!await verifyPassword(password, a?.password_hash || null))
        throw new MarketError('Email or password is incorrect.', 401); const p = await one(db, 'SELECT suspended FROM profiles WHERE id=?', a!.id); if (p?.suspended)
        throw new MarketError('Your account is suspended.', 403); if (Number(a!.email_verified) === 0 && await canConfirm(email))
        return res.json({ ok: false, confirm: true, email, sent: await sendConfirmCode(email) === 'sent', minutes: confirmMinutes }); await session(res, a!.id); res.json({ ok: true }); });
    app.post('/api/auth/logout', async (req, res) => { const t = cookie(req, sessionName); if (t)
        await run(db, 'DELETE FROM sessions WHERE token_hash=?', digest(t)); setCookie(res, sessionName, '', 0); res.json({ ok: true }); });
    // Forgot password: a code is emailed, checked, then exchanged for a new password. The member signs in afterwards.
    const identity = (body: Record<string, unknown> = {}) => { const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''; if (!email || email.length > 254) throw new MarketError('Enter the email address of your account.'); return email; };
    app.post('/api/auth/forgot', async (req, res) => { const email = identity(req.body); await limit(req, email); if (!isEmail(email))
        throw new MarketError('Reset codes are sent by email. For an account registered with a phone number, contact support for a code.'); const mail = activeMailer(); if (!mail || !await mailService(db, mail))
        throw new MarketError('Password reset by email is not set up on this site yet. Contact support for a reset code.', 503); const issued = await requestResetCode(db, email); if (issued && !await sendMail(db, mail, { to: issued.email, name: issued.name, ...resetEmail(issued.name, issued.code, issued.minutes) }))
        throw new MarketError('The email could not be sent. Try again in a minute, or contact support for a reset code.', 502); res.json({ ok: true, minutes: 15 }); });
    app.post('/api/auth/reset/verify', async (req, res) => { const email = identity(req.body); await limit(req, email); res.json(await checkResetCode(db, email, req.body.code)); });
    app.post('/api/auth/reset', async (req, res) => { const { email, password } = credentials(req.body); await limit(req, email); const key = await redeemResetCode(db, email, req.body.code, password);
        // Tell the owner, so a change they did not make does not go unnoticed.
        const owner = await one(db, 'SELECT name FROM accounts WHERE id=?', key); await accountEmail(db, email, String(owner?.name || ''), passwordChangedEmail(String(owner?.name || ''), config.origin)); res.json({ ok: true }); });
    // The code from the confirmation email: the account is confirmed, signed in, and welcomed.
    app.post('/api/auth/confirm', async (req, res) => { const email = identity(req.body); await limit(req, email); const key = await confirmEmail(db, email, req.body.code); await session(res, key);
        const owner = await one(db, 'SELECT name FROM accounts WHERE id=?', key); await accountEmail(db, email, String(owner?.name || ''), welcomeEmail(String(owner?.name || ''), config.origin)); res.json({ ok: true }); });
    app.post('/api/auth/confirm/resend', async (req, res) => { const email = identity(req.body); await limit(req, email); if (!await canConfirm(email))
        throw new MarketError('Email cannot be sent from this site right now. Try again later.', 503); if (await sendConfirmCode(email) === 'failed')
        throw new MarketError('The email could not be sent. Try again in a minute.', 502); res.json({ ok: true, minutes: confirmMinutes }); });
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
        let a = await one(db, 'SELECT id FROM accounts WHERE google_sub=?', p.sub), created = false;
        if (!a) {
            if (await one(db, 'SELECT id FROM accounts WHERE email=?', p.email.toLowerCase()))
                return fail('existing_email');
            const key = id();
            a = await one(db, "INSERT INTO accounts (id,email,name,google_sub,role,created) VALUES (?,?,?,?,'both',?) ON CONFLICT DO NOTHING RETURNING id", key, p.email.toLowerCase(), typeof p.name === 'string' ? p.name.slice(0, 80) : p.email, p.sub, now());
            if (!a)
                return fail('existing_email');
            created = true;
        }
        await session(res, a.id);
        if (created) {
            const name = typeof p.name === 'string' ? p.name.slice(0, 80) : '';
            await accountEmail(db, p.email.toLowerCase(), name, welcomeEmail(name, config.origin));
        }
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
        throw new MarketError('Photo not found.', 404); res.set('Cache-Control', 'public,max-age=86400'); res.sendFile(resolve(config.uploadsDir, key), { headers: { 'Content-Type': file.mime } }); });
    const adminName = secure ? '__Host-pp_admin' : 'pp_admin';
    const adminCookie = (res: Response, value: string, age: number) => res.append('Set-Cookie', `${adminName}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secure ? '; Secure' : ''}`);
    const ip = (req: Request) => req.ip || 'unknown';
    app.get('/api/admin/session', async (req, res) => { res.json(await adminStatus(db, cookie(req, adminName), config.adminSetupCode)); });
    app.post('/api/admin/login', async (req, res) => { adminCookie(res, await adminLogin(db, req.body, ip(req)), adminSessionSeconds); res.json({ ok: true }); });
    app.post('/api/admin/setup', async (req, res) => { adminCookie(res, await adminSetup(db, req.body, config.adminSetupCode, ip(req)), adminSessionSeconds); res.json({ ok: true }); });
    app.post('/api/admin/logout', async (req, res) => { await adminLogout(db, cookie(req, adminName)); adminCookie(res, '', 0); res.json({ ok: true }); });
    app.post('/api/admin/files', async (req, res) => { if (!await adminUser(db, cookie(req, adminName)))
        throw new MarketError('Sign in to continue.', 401); if (!Buffer.isBuffer(req.body))
        throw new MarketError('Upload an image or a video.'); const mime = mediaMime(req.body); if (mime.startsWith('image/') && req.body.length > 10 * 1024 * 1024)
        throw new MarketError('Images can be up to 10 MB.', 413); if (req.body.length > 50 * 1024 * 1024)
        throw new MarketError('Videos can be up to 50 MB.', 413); const key = id(); await mkdir(config.uploadsDir, { recursive: true }); await writeFile(resolve(config.uploadsDir, key), req.body); try {
        await run(db, 'INSERT INTO uploads (id,owner,mime,size,created) VALUES (?,?,?,?,?)', key, 'admin', mime, req.body.length, now());
    }
    catch (e) {
        await unlink(resolve(config.uploadsDir, key));
        throw e;
    } res.json({ url: '/api/files/' + key, mime }); });
    app.post('/api/admin/password', async (req, res) => { res.json(await adminChangePassword(db, cookie(req, adminName), req.body, ip(req))); });
    // The Gmail account the site sends from: status, connect (Google returns to /callback), disconnect, test email.
    const mailOauth = secure ? '__Host-pp_mail_oauth' : 'pp_mail_oauth';
    app.use('/api/admin/mail', async (req, res) => { const action = req.path.split('/').filter(Boolean)[0] || ''; const out = await adminMail(db, cookie(req, adminName), req.method, action, req.body || {}, activeMailer(), config.origin, { cookie: cookie(req, mailOauth), query: new URL(req.originalUrl, config.origin).searchParams }); if (out.state !== undefined)
        setCookie(res, mailOauth, out.state, out.state ? 600 : 0); if (out.redirect)
        return res.redirect(out.redirect); res.json(out.json); });
    app.use('/api/admin/market', async (req, res) => { const path = req.path.split('/').filter(Boolean).map(decodeURIComponent); res.json(await adminMarket(db, cookie(req, adminName), req.method, path, new URL(req.originalUrl, config.origin).searchParams, req.body || {})); });
    app.use('/api/market', async (req, res) => { const c = await context(req); const path = req.path.split('/').filter(Boolean).map(decodeURIComponent); const result = await market(c, req.method, path, new URL(req.originalUrl, config.origin).searchParams, req.body || {}); res.json(result); });
    app.use(express.static(config.publicDir, { index: false }));
    // The page shell, read once. Google's ownership check looks for its tag in the home page's <head>.
    let shell: Promise<string> | undefined;
    // One or more Search Console tokens, separated by commas; old tokens stay so earlier verifications keep working.
    const verification = (config.googleSiteVerification || '').split(/[\s,]+/).map(v => v.replace(/[^\w-]/g, '')).filter(Boolean).map(v => '<meta name="google-site-verification" content="' + v + '"/>').join('');
    const indexHtml = () => shell ??= readFile(resolve(config.publicDir, 'index.html'), 'utf8').then(html => verification ? html.replace('</head>', verification + '</head>') : html);
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
