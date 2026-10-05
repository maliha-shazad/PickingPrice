import { authError, checkOrigin, database, jsonBody, parseCredentials, sessionResponse, throttle } from '@/lib/auth/server';
import { Database, MarketError } from '@/lib/market/types';
import { redeemResetCode } from '@/lib/market/password-reset';

// A new password is accepted only with a single-use code the administrator issued for that account.
export async function POST(req: Request) {
    try {
        checkOrigin(req);
        const body = await jsonBody(req);
        const { email, password } = parseCredentials(body);
        await throttle(req, email);
        const account = await redeemResetCode(database() as unknown as Database, email, body.code, password);
        return await sessionResponse(account);
    } catch (e) {
        if (e instanceof MarketError)
            return Response.json({ error: e.message }, { status: e.status, headers: { 'Cache-Control': 'no-store' } });
        return authError(e);
    }
}
