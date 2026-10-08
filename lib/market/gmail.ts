import { createHash, randomBytes } from 'node:crypto';
import { Database, id, now } from './types';
import { one, run, stmt } from './core';

// Sending from the site's own Gmail account through the Gmail API. It runs over HTTPS, so it works on
// hosts that block SMTP, and it needs no domain: the emails really come from the connected address.
// The administrator connects the account once in the admin panel. Google then gives the site a refresh
// token that allows sending mail and nothing else (no reading), and that is useless without the OAuth
// client secret kept in the server settings.
export type GmailClient = {
    clientId: string;
    clientSecret: string;
    /** Google's addresses; only tests change them. */
    endpoints?: { auth?: string; token?: string; profile?: string; send?: string; revoke?: string };
};
export type GmailAccount = { email: string; refreshToken: string; problem: string; connected: string };
export type GmailOutcome = 'connected' | 'invalid_state' | 'cancelled' | 'no_permission' | 'failed';
export const gmailCallbackPath = '/api/admin/mail/callback';
const SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';
const SENDER_NAME = 'Picking Price';
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const token = () => randomBytes(32).toString('base64url');
const form = { 'Content-Type': 'application/x-www-form-urlencoded' };
const wait = (ms: number) => AbortSignal.timeout(ms);
const prepared = new WeakSet<Database>();

async function store(db: Database) {
    if (prepared.has(db))
        return;
    await run(db, "CREATE TABLE IF NOT EXISTS mail_account (id INTEGER PRIMARY KEY CHECK (id = 1), email TEXT NOT NULL, refresh_token TEXT NOT NULL, problem TEXT NOT NULL DEFAULT '', connected TEXT NOT NULL)");
    prepared.add(db);
}

/** The connected Gmail account, or null when none is connected. */
export async function gmailAccount(db: Database): Promise<GmailAccount | null> {
    await store(db);
    const row = await one(db, 'SELECT email,refresh_token,problem,connected FROM mail_account WHERE id=1');
    return row ? { email: String(row.email), refreshToken: String(row.refresh_token), problem: String(row.problem || ''), connected: String(row.connected) } : null;
}

/** Step 1 of connecting: the Google page where the administrator allows the site to send from their Gmail. */
export async function gmailStart(db: Database, client: GmailClient, origin: string) {
    const state = token(), verifier = token();
    await run(db, 'INSERT INTO oauth_states (state_hash,verifier,expires) VALUES (?,?,?)', digest(state), verifier, new Date(Date.now() + 600000).toISOString());
    const url = new URL(client.endpoints?.auth || 'https://accounts.google.com/o/oauth2/v2/auth');
    // access_type=offline with prompt=consent makes Google return a refresh token every time.
    url.search = new URLSearchParams({ client_id: client.clientId, redirect_uri: origin + gmailCallbackPath, response_type: 'code', scope: 'openid email ' + SEND_SCOPE, state, code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256', access_type: 'offline', prompt: 'consent' }).toString();
    return { url: url.toString(), state };
}

/** Step 2: Google returns here. The state must match the one this browser was given in step 1. */
export async function gmailFinish(db: Database, client: GmailClient, origin: string, returned: { state: string; code: string; cookie: string }): Promise<GmailOutcome> {
    if (!returned.state || returned.state !== returned.cookie)
        return 'invalid_state';
    const saved = await one(db, 'DELETE FROM oauth_states WHERE state_hash=? AND expires>? RETURNING verifier', digest(returned.state), now());
    if (!saved || !returned.code)
        return 'cancelled';
    try {
        const response = await fetch(client.endpoints?.token || 'https://oauth2.googleapis.com/token', { method: 'POST', headers: form, body: new URLSearchParams({ client_id: client.clientId, client_secret: client.clientSecret, code: returned.code, code_verifier: String(saved.verifier), grant_type: 'authorization_code', redirect_uri: origin + gmailCallbackPath }), signal: wait(10000) });
        if (!response.ok)
            return 'failed';
        const tokens: { access_token?: string; refresh_token?: string; scope?: string; expires_in?: number } = await response.json();
        // Google lets the person untick a permission; without the sending one there is nothing to connect.
        if (!tokens.access_token || !tokens.refresh_token || !String(tokens.scope || '').split(' ').includes(SEND_SCOPE))
            return 'no_permission';
        const info = await fetch(client.endpoints?.profile || 'https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: 'Bearer ' + tokens.access_token }, signal: wait(10000) });
        const profile: { email?: string } = info.ok ? await info.json() : {};
        if (typeof profile.email !== 'string' || !single.test(profile.email))
            return 'failed';
        await store(db);
        await db.batch([
            stmt(db, "INSERT INTO mail_account (id,email,refresh_token,problem,connected) VALUES (1,?,?,'',?) ON CONFLICT(id) DO UPDATE SET email=excluded.email,refresh_token=excluded.refresh_token,problem='',connected=excluded.connected", profile.email.toLowerCase(), tokens.refresh_token, now()),
            stmt(db, 'INSERT INTO admin_audit (id,owner,action,target,created) VALUES (?,?,?,?,?)', id(), 'admin', 'admin:mail-connect', profile.email.toLowerCase(), now()),
        ]);
        access = { key: digest(tokens.refresh_token), token: tokens.access_token, expires: Date.now() + Number(tokens.expires_in || 3600) * 1000 };
        return 'connected';
    }
    catch {
        return 'failed';
    }
}

/** Forgets the account and tells Google to cancel the permission. */
export async function gmailDisconnect(db: Database, client: GmailClient | undefined) {
    const account = await gmailAccount(db);
    if (!account)
        return;
    await db.batch([
        stmt(db, 'DELETE FROM mail_account WHERE id=1'),
        stmt(db, 'INSERT INTO admin_audit (id,owner,action,target,created) VALUES (?,?,?,?,?)', id(), 'admin', 'admin:mail-disconnect', account.email, now()),
    ]);
    access = null;
    try {
        await fetch(client?.endpoints?.revoke || 'https://oauth2.googleapis.com/revoke', { method: 'POST', headers: form, body: new URLSearchParams({ token: account.refreshToken }), signal: wait(10000) });
    }
    catch {
        // The site no longer holds the token; the permission can also be removed in the Google account.
    }
}

// The short-lived access token Google gives in exchange for the refresh token, kept until it is about to expire.
let access: { key: string; token: string; expires: number } | null = null;
async function accessToken(db: Database, client: GmailClient, account: GmailAccount) {
    const key = digest(account.refreshToken);
    if (access && access.key === key && access.expires > Date.now() + 60000)
        return access.token;
    const response = await fetch(client.endpoints?.token || 'https://oauth2.googleapis.com/token', { method: 'POST', headers: form, body: new URLSearchParams({ client_id: client.clientId, client_secret: client.clientSecret, refresh_token: account.refreshToken, grant_type: 'refresh_token' }), signal: wait(10000) });
    if (!response.ok) {
        const reason = String(((await response.json().catch(() => ({}))) as { error?: string }).error || response.status);
        // invalid_grant: Google no longer accepts the permission (removed, expired, or the Google password
        // changed). Nothing can be sent until the administrator connects the account again.
        if (reason === 'invalid_grant')
            await run(db, "UPDATE mail_account SET problem='expired' WHERE id=1 AND refresh_token=?", account.refreshToken);
        console.error('Gmail did not renew the sending permission', reason);
        return '';
    }
    const tokens: { access_token: string; expires_in?: number } = await response.json();
    access = { key, token: tokens.access_token, expires: Date.now() + Number(tokens.expires_in || 3600) * 1000 };
    return tokens.access_token;
}

// One plain address only: anything that could add a second recipient or a second header is refused.
const single = /^[^\s<>()[\]\\,;:"@]+@[^\s<>()[\]\\,;:"@]+\.[^\s<>()[\]\\,;:"@]+$/;
const base64 = (text: string) => Buffer.from(text, 'utf8').toString('base64');
const lines = (text: string) => base64(text).replace(/(.{76})/g, '$1\r\n');
/** A header value as encoded words (RFC 2047), so any language is safe and nothing can break out of the header. */
function word(text: string) {
    const parts: string[] = [];
    let part = '';
    for (const ch of text.replace(/[\r\n]+/g, ' ')) {
        if (Buffer.byteLength(part + ch) > 45) {
            parts.push(part);
            part = '';
        }
        part += ch;
    }
    parts.push(part);
    return parts.map(p => '=?UTF-8?B?' + base64(p) + '?=').join('\r\n ');
}
function mime(from: string, message: { to: string; name?: string; subject: string; text: string; html: string }) {
    const boundary = 'pp-' + randomBytes(12).toString('hex');
    const part = (type: string, body: string) => `--${boundary}\r\nContent-Type: ${type}; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${lines(body)}\r\n`;
    return [
        `From: ${SENDER_NAME} <${from}>`,
        `To: ${message.name ? word(message.name) + ' ' : ''}<${message.to}>`,
        `Subject: ${word(message.subject)}`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/alternative; boundary="${boundary}"`,
        '',
        part('text/plain', message.text) + part('text/html', message.html) + `--${boundary}--`,
    ].join('\r\n');
}

/** Sends one email from the connected account. Returns whether Gmail accepted it. */
export async function gmailSend(db: Database, client: GmailClient, account: GmailAccount, message: { to: string; name?: string; subject: string; text: string; html: string }) {
    if (!single.test(message.to))
        return false;
    const raw = Buffer.from(mime(account.email, message), 'utf8').toString('base64url');
    try {
        for (let attempt = 0; attempt < 2; attempt++) {
            const bearer = await accessToken(db, client, account);
            if (!bearer)
                return false;
            const r = await fetch(client.endpoints?.send || 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send', { method: 'POST', headers: { Authorization: 'Bearer ' + bearer, 'Content-Type': 'application/json' }, body: JSON.stringify({ raw }), signal: wait(15000) });
            if (r.ok)
                return true;
            // 401: the access token was withdrawn early. Ask for a new one once.
            if (r.status === 401 && attempt === 0) {
                access = null;
                continue;
            }
            console.error('Email was refused by Gmail', r.status);
            return false;
        }
        return false;
    }
    catch (e) {
        console.error('Email could not be sent', e instanceof Error ? e.name : 'unknown');
        return false;
    }
}
