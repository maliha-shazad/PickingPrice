import { authError, AuthError, checkOrigin, database, jsonBody, parseCredentials, sessionResponse, throttle } from '@/lib/auth/server';
import { hashPassword } from '@/lib/auth/password';

export async function POST(req: Request) {
    try {
        checkOrigin(req);
        const body = await jsonBody(req);
        const { email, password } = parseCredentials(body);
        
        await throttle(req, email);
        
        const hash = await hashPassword(password);
        
        // Find user by email or phone. 
        // Note: parseCredentials validates if it's a valid email or phone number.
        const result = await database()
            .prepare('UPDATE accounts SET password_hash = ? WHERE email = ? RETURNING id')
            .bind(hash, email)
            .first<{id: string}>();
            
        if (!result)
            throw new AuthError('Account not found with this email/phone.', 404);
            
        return await sessionResponse(result.id);
    } catch (e) {
        return authError(e);
    }
}
