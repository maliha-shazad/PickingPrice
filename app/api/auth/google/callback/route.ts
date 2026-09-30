import { cookies } from 'next/headers';
import { bindings, database, digest, googleReady, origin, secureCookie, sessionResponse } from '@/lib/auth/server';
const failure = (code: string) => new Response(null, { status: 303, headers: { Location: origin + '/?auth_error=' + code, 'Set-Cookie': secureCookie('__Host-pp_oauth', '', 0), 'Cache-Control': 'no-store' } });
export async function GET(req: Request) {
    if (!googleReady())
        return failure('google_not_configured');
    try {
        const url = new URL(req.url), state = url.searchParams.get('state'), code = url.searchParams.get('code');
        const expected = (await cookies()).get('__Host-pp_oauth')?.value;
        if (!state || !expected || state !== expected)
            return failure('invalid_state');
        const saved = await database().prepare('DELETE FROM oauth_states WHERE state_hash=? AND expires>? RETURNING verifier').bind(digest(state), new Date().toISOString()).first<{verifier: string}>();
        if (!saved || !code || url.searchParams.has('error'))
            return failure('cancelled');
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: bindings().GOOGLE_CLIENT_ID!, client_secret: bindings().GOOGLE_CLIENT_SECRET!, code, code_verifier: saved.verifier, grant_type: 'authorization_code', redirect_uri: origin + '/api/auth/google/callback' }), signal: AbortSignal.timeout(10000) });
        if (!tokenResponse.ok)
            return failure('google_failed');
        const tokens: {access_token: string} = await tokenResponse.json();
        if (typeof tokens.access_token !== 'string')
            return failure('google_failed');
        const info = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: 'Bearer ' + tokens.access_token }, signal: AbortSignal.timeout(10000) });
        if (!info.ok)
            return failure('google_failed');
        const profile: {sub: string; email: string; email_verified: boolean; name?: string} = await info.json();
        if (typeof profile.sub !== 'string' || typeof profile.email !== 'string' || profile.email_verified !== true)
            return failure('unverified');
        const email = profile.email.toLowerCase();
        let account = await database().prepare('SELECT id FROM accounts WHERE google_sub=?').bind(profile.sub).first<{id: string}>();
        if (!account) {
            // Do not automatically link an unverified email/password account to Google.
            const collision = await database().prepare('SELECT id FROM accounts WHERE email=?').bind(email).first();
            if (collision)
                return failure('existing_email');
            const id = crypto.randomUUID(), name = typeof profile.name === 'string' ? profile.name.slice(0, 80) : email.split('@')[0];
            const inserted = await database().prepare('INSERT INTO accounts (id,email,name,google_sub,role,created) VALUES (?,?,?,?,?,?) ON CONFLICT DO NOTHING RETURNING id').bind(id, email, name, profile.sub, 'buyer', new Date().toISOString()).first();
            account = inserted || await database().prepare('SELECT id FROM accounts WHERE google_sub=?').bind(profile.sub).first();
            if (!account)
                return failure('existing_email');
        }
        const response = await sessionResponse(account.id, true);
        response.headers.append('Set-Cookie', secureCookie('__Host-pp_oauth', '', 0));
        return response;
    }
    catch {
        return failure('unavailable');
    }
}
