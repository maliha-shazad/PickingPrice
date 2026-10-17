import { createHash, randomInt } from 'node:crypto';
import { Database, MarketError, now } from './types';
import { one, run, stmt } from './core';

// A member who signs up with an email address confirms it with a 6-digit code before the account can be used.
// Accounts made before this, and Google accounts (Google has confirmed the address), count as confirmed.
export const confirmMinutes = 15;
const digest = (accountId: unknown, code: string) => createHash('sha256').update('confirm:' + accountId + ':' + code).digest('hex');
const invalidCode = () => new MarketError('That code is not right, or it has expired. Request a new code.');

/** A new code for an account whose email is not confirmed yet; earlier codes stop working. Null when there is no such account. */
export async function newConfirmCode(db: Database, email: string) {
    const account = await one(db, 'SELECT id,email,name FROM accounts WHERE email=? AND email_verified=0', email);
    if (!account)
        return null;
    const code = String(randomInt(1000000)).padStart(6, '0');
    const expires = new Date(Date.now() + confirmMinutes * 60000).toISOString();
    await db.batch([
        stmt(db, "DELETE FROM email_tokens WHERE account_id=? AND purpose='confirm'", account.id),
        stmt(db, "INSERT INTO email_tokens (hash,account_id,purpose,expires) VALUES (?,?,'confirm',?)", digest(account.id, code), account.id, expires),
    ]);
    return { code, email: String(account.email), name: String(account.name || ''), minutes: confirmMinutes };
}

/** Uses up a right code and marks the email confirmed. Returns the account id, or throws without changing anything. */
export async function confirmEmail(db: Database, email: string, code: unknown) {
    const supplied = typeof code === 'string' ? code.replace(/\D/g, '') : '';
    const account = await one(db, 'SELECT id,email_verified FROM accounts WHERE email=?', email);
    if (account && Number(account.email_verified) === 1)
        throw new MarketError('This email is already confirmed. Log in instead.', 409);
    if (!account || !/^\d{6}$/.test(supplied))
        throw invalidCode();
    // Deleting while checking makes the code single-use even under concurrent attempts.
    const used = await one(db, "DELETE FROM email_tokens WHERE hash=? AND account_id=? AND purpose='confirm' AND expires>? RETURNING hash", digest(account.id, supplied), account.id, now());
    if (!used)
        throw invalidCode();
    await run(db, 'UPDATE accounts SET email_verified=1 WHERE id=?', account.id);
    return String(account.id);
}
