import { createHash } from 'node:crypto';
import { bindings, database, digest, googleReady, origin, randomToken, secureCookie } from '@/lib/auth/server';
export async function GET() {
    if (!googleReady())
        return Response.redirect(origin + '/?auth_error=google_not_configured', 303);
    try {
        const state = randomToken(), verifier = randomToken();
        await database().prepare('INSERT INTO oauth_states (state_hash,verifier,expires) VALUES (?,?,?)').bind(digest(state), verifier, new Date(Date.now() + 10 * 60000).toISOString()).run();
        const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        url.search = new URLSearchParams({ client_id: bindings().GOOGLE_CLIENT_ID!, redirect_uri: origin + '/api/auth/google/callback', response_type: 'code', scope: 'openid email profile', state, code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256', prompt: 'select_account' }).toString();
        return new Response(null, { status: 303, headers: { Location: url.toString(), 'Set-Cookie': secureCookie('__Host-pp_oauth', state, 600), 'Cache-Control': 'no-store' } });
    }
    catch {
        return Response.redirect(origin + '/?auth_error=unavailable', 303);
    }
}
