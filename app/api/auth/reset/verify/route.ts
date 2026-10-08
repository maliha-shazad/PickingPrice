import { authError, AuthError, checkOrigin, database, jsonBody, throttle } from '@/lib/auth/server';
import { Database, MarketError } from '@/lib/market/types';
import { checkResetCode } from '@/lib/market/password-reset';

// Step 2 of Forgot Password: confirm the code before asking for the new password. The code is not used up here.
export async function POST(req: Request) {
    try {
        checkOrigin(req);
        const body = await jsonBody(req);
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        if (!email || email.length > 254) throw new AuthError('Enter the email address of your account.');
        await throttle(req, email);
        return Response.json(await checkResetCode(database() as unknown as Database, email, body.code), { headers: { 'Cache-Control': 'no-store' } });
    } catch (e) {
        if (e instanceof MarketError)
            return Response.json({ error: e.message }, { status: e.status, headers: { 'Cache-Control': 'no-store' } });
        return authError(e);
    }
}
