import { authError, AuthError, checkOrigin, database, jsonBody, parseCredentials, sessionResponse, throttle } from '@/lib/auth/server';
import { hashPassword } from '@/lib/auth/password';
export async function POST(req: Request) {
    try {
        checkOrigin(req);
        const body = await jsonBody(req);
        const { email, password } = parseCredentials(body);
        const name = typeof body.name === 'string' ? body.name.trim() : '';
        if (name.length < 2 || name.length > 80)
            throw new AuthError('Enter your name (2–80 characters).');
        const role = body.role === 'seller' ? 'seller' : body.role === 'both' ? 'both' : 'buyer';
        await throttle(req, email);
        const id = crypto.randomUUID();
        const hash = await hashPassword(password);
        const inserted = await database().prepare('INSERT INTO accounts (id,email,name,password_hash,role,created) VALUES (?,?,?,?,?,?) ON CONFLICT(email) DO NOTHING RETURNING id').bind(id, email, name, hash, role, new Date().toISOString()).first();
        if (!inserted)
            throw new AuthError('Unable to register with these details. Try signing in or use another email.', 409);
        return await sessionResponse(id);
    }
    catch (e) {
        return authError(e);
    }
}
