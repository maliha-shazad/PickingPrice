import { authError, AuthError, checkOrigin, database, jsonBody, parseCredentials, sessionResponse, throttle } from '@/lib/auth/server';
import { verifyPassword } from '@/lib/auth/password';
export async function POST(req: Request) {
    try {
        checkOrigin(req);
        const { email, password } = parseCredentials(await jsonBody(req));
        await throttle(req, email);
        const account = await database().prepare('SELECT id,password_hash FROM accounts WHERE email=?').bind(email).first<{id: string; password_hash: string}>();
        if (!await verifyPassword(password, account?.password_hash || null))
            throw new AuthError('Email or password is incorrect.', 401);
        const profile = await database().prepare('SELECT suspended FROM profiles WHERE id=?').bind(account.id).first<{
            suspended: number;
        }>();
        if (profile?.suspended)
            throw new AuthError('Your account is suspended.', 403);
        return await sessionResponse(account.id);
    }
    catch (e) {
        return authError(e);
    }
}
