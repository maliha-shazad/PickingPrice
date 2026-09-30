import { secureCookie, sessionCookie, checkOrigin, authError } from '@/lib/auth/server';
export async function POST(req: Request) { try {
    checkOrigin(req);
    const headers = new Headers({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    headers.append('Set-Cookie', secureCookie(sessionCookie, '', 0));
    headers.append('Set-Cookie', secureCookie('__Host-pp_signed_out', '', 0));
    return new Response(JSON.stringify({ ok: true }), { headers });
}
catch (e) {
    return authError(e);
} }
