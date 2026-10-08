import { env } from 'cloudflare:workers';
import { cookies } from 'next/headers';
import { MarketError, Database } from '@/lib/market/types';
import { mailSettings } from '@/lib/auth/server';
import { setMailer } from '@/lib/market/email';
import { adminStatus, adminSetup, adminLogin, adminLogout, adminChangePassword, adminMarket, adminMail, adminSessionSeconds } from '@/lib/market/admin-auth';
export const dynamic = 'force-dynamic';
const cookieName = '__Host-pp_admin';
const mailOauth = '__Host-pp_mail_oauth';
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const withCookie = (value: string, maxAge: number) => ({ ...headers, 'Set-Cookie': `${cookieName}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}` });
async function handle(req: Request, path: string[]) {
    try {
        if (req.method !== 'GET' && req.headers.get('origin') !== new URL(req.url).origin)
            return Response.json({ error: 'Invalid request origin.' }, { status: 403, headers });
        const { DB: db, ADMIN_SETUP_CODE: setupCode } = env as unknown as { DB: Database; ADMIN_SETUP_CODE?: string };
        const token = (await cookies()).get(cookieName)?.value || '';
        const ip = req.headers.get('cf-connecting-ip') || 'private-site';
        let body: Record<string, unknown> = {};
        if (!['GET', 'DELETE'].includes(req.method)) {
            const text = await req.text();
            if (text.length > 24000)
                throw new MarketError('This form is too large.', 413);
            try {
                body = JSON.parse(text);
            }
            catch {
                throw new MarketError('Invalid form.');
            }
        }
        const [area, ...rest] = path;
        if (area === 'market') {
            setMailer(mailSettings(req));
            return Response.json(await adminMarket(db, token, req.method, rest, new URL(req.url).searchParams, body), { headers });
        }
        // The Gmail account the site sends from: status, connect (Google returns to /callback), disconnect, test email.
        if (area === 'mail') {
            const url = new URL(req.url);
            const out = await adminMail(db, token, req.method, rest[0] || '', body, mailSettings(req), url.origin, { cookie: (await cookies()).get(mailOauth)?.value || '', query: url.searchParams });
            const reply = new Headers(headers);
            if (out.state !== undefined)
                reply.append('Set-Cookie', `${mailOauth}=${out.state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${out.state ? 600 : 0}`);
            if (out.redirect) {
                reply.set('Location', url.origin + out.redirect);
                return new Response(null, { status: 303, headers: reply });
            }
            return Response.json(out.json, { headers: reply });
        }
        if (req.method === 'GET' && area === 'session')
            return Response.json(await adminStatus(db, token, setupCode), { headers });
        if (req.method === 'POST' && area === 'login')
            return Response.json({ ok: true }, { headers: withCookie(await adminLogin(db, body, ip), adminSessionSeconds) });
        if (req.method === 'POST' && area === 'setup')
            return Response.json({ ok: true }, { headers: withCookie(await adminSetup(db, body, setupCode, ip), adminSessionSeconds) });
        if (req.method === 'POST' && area === 'logout') {
            await adminLogout(db, token);
            return Response.json({ ok: true }, { headers: withCookie('', 0) });
        }
        if (req.method === 'POST' && area === 'password')
            return Response.json(await adminChangePassword(db, token, body, ip), { headers });
        throw new MarketError('This action is not available.', 404);
    }
    catch (e) {
        if (e instanceof MarketError)
            return Response.json({ error: e.message }, { status: e.status, headers });
        console.error('Admin operation failed', e instanceof Error ? e.message : 'unknown');
        return Response.json({ error: 'This action could not be completed. Please retry.' }, { status: 503, headers });
    }
}
export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) { return handle(req, (await params).path); }
export const POST = GET;
export const PATCH = GET;
export const PUT = GET;
export const DELETE = GET;
