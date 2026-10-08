import { authError, checkOrigin, database, jsonBody, parseCredentials, throttle } from '@/lib/auth/server';
import { Database, MarketError } from '@/lib/market/types';
import { redeemResetCode } from '@/lib/market/password-reset';

// A new password is accepted only with the single-use code emailed to the account (or issued by the
// administrator). The member signs in with the new password afterwards.
export async function POST(req: Request) {
    try {
        checkOrigin(req);
        const body = await jsonBody(req);
        const { email, password } = parseCredentials(body);
        await throttle(req, email);
        await redeemResetCode(database() as unknown as Database, email, body.code, password);
        return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (e) {
        if (e instanceof MarketError)
            return Response.json({ error: e.message }, { status: e.status, headers: { 'Cache-Control': 'no-store' } });
        return authError(e);
    }
}
