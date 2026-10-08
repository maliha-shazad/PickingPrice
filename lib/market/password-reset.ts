import { createHash, randomInt } from 'node:crypto';
import { Context, Database, MarketError, now } from './types';
import { permit, one, stmt, log } from './core';
import { stringValue } from './validation';
import { hashPassword } from '../auth/password';

// A password is reset with a short-lived single-use code. The member normally receives it by email
// (requestResetCode); the administrator can also issue one from the admin panel (issueResetCode), which is
// the way for accounts registered with a phone number or when email is not set up.
// Knowing an email address alone resets nothing.
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I, so it can be read out over the phone
const validMinutes = 60;
export const emailCodeMinutes = 15;
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

/** Creates a 6-digit code for the account with this email. Returns null when there is no such account. */
export async function requestResetCode(db: Database, email: string) {
    const account = await one(db, 'SELECT id,email,name FROM accounts WHERE email=?', email);
    if (!account)
        return null;
    const code = String(randomInt(1000000)).padStart(6, '0');
    const expires = new Date(Date.now() + emailCodeMinutes * 60000).toISOString();
    await db.batch([
        stmt(db, "DELETE FROM email_tokens WHERE account_id=? AND purpose='reset'", account.id),
        stmt(db, "INSERT INTO email_tokens (hash,account_id,purpose,expires) VALUES (?,?,'reset',?)", digest(account.id, code), account.id, expires),
    ]);
    return { code, email: String(account.email), name: String(account.name || ''), minutes: emailCodeMinutes };
}
// A code as typed: the emailed one is six digits, the administrator's is ten letters and digits.
const typed = (code: unknown) => { const s = typeof code === 'string' ? code.toUpperCase().replace(/[^A-Z0-9]/g, '') : ''; return s.length === 10 || /^[0-9]{6}$/.test(s) ? s : ''; };
const invalidCode = () => new MarketError('That code is not valid for this email, or it has expired. Request a new code.');

/** Confirms a code is right without using it up, so the page can move on to the new password. */
export async function checkResetCode(db: Database, email: string, code: unknown) {
    const supplied = typed(code);
    const account = await one(db, 'SELECT id FROM accounts WHERE email=?', email);
    if (!account || !supplied)
        throw invalidCode();
    if (!await one(db, "SELECT hash FROM email_tokens WHERE hash=? AND account_id=? AND purpose='reset' AND expires>?", digest(account.id, supplied), account.id, now()))
        throw invalidCode();
    return { ok: true };
}

/** Sets the new password and returns the account id, or throws without changing anything. */
export async function redeemResetCode(db: Database, email: string, code: unknown, password: string) {
    const invalid = invalidCode;
    const supplied = typed(code);
    const account = await one(db, 'SELECT id FROM accounts WHERE email=?', email);
    if (!account || !supplied)
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
