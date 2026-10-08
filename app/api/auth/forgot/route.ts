import { authError, AuthError, checkOrigin, database, jsonBody, mailSettings, throttle } from '@/lib/auth/server';
import { Database, MarketError } from '@/lib/market/types';
import { requestResetCode } from '@/lib/market/password-reset';
import { isEmail, mailService, resetEmail, sendMail } from '@/lib/market/email';

// Step 1 of Forgot Password: email a reset code to the address the account was registered with.
export async function POST(req: Request) {
    try {
        checkOrigin(req);
        const body = await jsonBody(req);
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        if (!email || email.length > 254) throw new AuthError('Enter the email address of your account.');
        await throttle(req, email);
        if (!isEmail(email)) throw new AuthError('Reset codes are sent by email. For an account registered with a phone number, contact support for a code.');
        const db = database() as unknown as Database;
        const mail = mailSettings(req);
        if (!mail || !await mailService(db, mail)) throw new AuthError('Password reset by email is not set up on this site yet. Contact support for a reset code.', 503);
        // The answer is the same whether or not the address has an account.
        const issued = await requestResetCode(db, email);
        if (issued && !await sendMail(db, mail, { to: issued.email, name: issued.name, ...resetEmail(issued.name, issued.code, issued.minutes) }))
            throw new AuthError('The email could not be sent. Try again in a minute, or contact support for a reset code.', 502);
        return Response.json({ ok: true, minutes: 15 }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (e) {
        if (e instanceof MarketError)
            return Response.json({ error: e.message }, { status: e.status, headers: { 'Cache-Control': 'no-store' } });
        return authError(e);
    }
}
