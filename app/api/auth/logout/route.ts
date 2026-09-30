import { cookies } from 'next/headers';
import { authError, checkOrigin, database, digest, sessionCookie, secureCookie } from '@/lib/auth/server';
export async function POST(req: Request) {
    try {
        checkOrigin(req);
        const token = (await cookies()).get(sessionCookie)?.value;
        if (token)
            await database().prepare('DELETE FROM sessions WHERE token_hash=?').bind(digest(token)).run();
        const headers = new Headers({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        headers.append('Set-Cookie', secureCookie(sessionCookie, '', 0));
        headers.append('Set-Cookie', secureCookie('__Host-pp_signed_out', '1', 7 * 86400));
        return new Response(JSON.stringify({ ok: true }), { headers });
    }
    catch (e) {
        return authError(e);
    }
}
