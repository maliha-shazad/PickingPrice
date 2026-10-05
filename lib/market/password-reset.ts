import { createHash, randomInt } from 'node:crypto';
import { Context, Database, MarketError, now } from './types';
import { permit, one, stmt, log } from './core';
import { stringValue } from './validation';
import { hashPassword } from '../auth/password';

// There is no email delivery, so a member proves who they are to the administrator,
// who issues a short-lived single-use code. Knowing an email address alone resets nothing.
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I, so it can be read out over the phone
const validMinutes = 60;
const digest = (accountId: unknown, code: string) => createHash('sha256').update(accountId + ':' + code).digest('hex');

export async function issueResetCode(c: Context, body: Record<string, unknown>) {
    permit(c, 'admin');
    const key = stringValue(body.id, 1, 400);
    const account = await one(c.db, 'SELECT id,email,password_hash FROM accounts WHERE id=?', key);
    if (!account?.password_hash)
        throw new MarketError('This member does not sign in with a password, so there is nothing to reset.', 409);
    const code = Array.from({ length: 10 }, () => alphabet[randomInt(alphabet.length)]).join('');
    const expires = new Date(Date.now() + validMinutes * 60000).toISOString();
    await c.db.batch([
        stmt(c.db, "DELETE FROM email_tokens WHERE account_id=? AND purpose='reset'", key),
        stmt(c.db, "INSERT INTO email_tokens (hash,account_id,purpose,expires) VALUES (?,?,'reset',?)", digest(key, code), key, expires),
        log(c, 'user:reset-code', key),
    ]);
    return { code: code.slice(0, 5) + '-' + code.slice(5), email: account.email, expires, minutes: validMinutes };
}

/** Sets the new password and returns the account id, or throws without changing anything. */
export async function redeemResetCode(db: Database, email: string, code: unknown, password: string) {
    const invalid = () => new MarketError('That email or reset code is not valid, or the code has expired. Ask the admin for a new code.');
    const supplied = typeof code === 'string' ? code.toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
    const account = await one(db, 'SELECT id FROM accounts WHERE email=?', email);
    if (!account || supplied.length !== 10)
        throw invalid();
    // Deleting while checking makes the code single-use even under concurrent attempts.
    const used = await one(db, "DELETE FROM email_tokens WHERE hash=? AND account_id=? AND purpose='reset' AND expires>? RETURNING hash", digest(account.id, supplied), account.id, now());
    if (!used)
        throw invalid();
    await db.batch([
        stmt(db, 'UPDATE accounts SET password_hash=? WHERE id=?', await hashPassword(password), account.id),
        stmt(db, 'DELETE FROM sessions WHERE account_id=?', account.id),
    ]);
    return String(account.id);
}
