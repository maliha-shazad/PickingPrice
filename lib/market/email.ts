import { Database, Row, now } from './types';
import { one, rows } from './core';
import { GmailClient, gmailAccount, gmailSend } from './gmail';

// Outgoing email: password reset codes, a welcome email, a password-changed notice and copies of in-app notifications.
// Two ways to send, both over HTTPS (hosts such as Railway block SMTP):
//   Gmail  - the site's own Gmail account, connected once in the admin panel (see gmail.ts). No domain needed.
//   Resend - RESEND_API_KEY; needs a verified domain to reach anyone but the account owner.
// A connected Gmail account is used first. Nothing is sent until one of the two is ready; the in-app
// notifications never depend on it.
export type Mailer = {
    /** The Google OAuth client the Gmail account is connected through. */
    gmail?: GmailClient;
    resendKey?: string;
    /** "Name <address>" for Resend. Gmail always sends from the connected address. */
    from: string;
    /** Public address of the site, for the link in each email. */
    site: string;
    /** Send notification copies after the response instead of before it (long-running servers). */
    background?: boolean;
    /** Where Resend emails are posted; only tests change it. */
    endpoint?: string;
};
export const defaultSender = 'Picking Price <onboarding@resend.dev>';
/** The email settings of this server; null when neither way of sending is configured. */
export function mailerFrom(v: { gmailClientId?: string; gmailClientSecret?: string; gmailEndpoints?: GmailClient['endpoints']; resendKey?: string; from?: string; site: string; background?: boolean; endpoint?: string }): Mailer | null {
    const gmail = v.gmailClientId && v.gmailClientSecret ? { clientId: v.gmailClientId, clientSecret: v.gmailClientSecret, endpoints: v.gmailEndpoints } : undefined;
    if (!gmail && !v.resendKey)
        return null;
    return { gmail, resendKey: v.resendKey || undefined, from: v.from || defaultSender, site: v.site, background: v.background, endpoint: v.endpoint };
}
let mailer: Mailer | null = null;
export const setMailer = (next: Mailer | null) => { mailer = next; };
export const activeMailer = () => mailer;
/** The Gmail account to send from, when one is connected and Google still accepts it. */
const usableGmail = async (db: Database, mail: Mailer) => { const account = mail.gmail ? await gmailAccount(db) : null; return account && !account.problem ? account : null; };
/** Which way an email would go right now: 'gmail', 'resend', or '' when nothing can be sent. */
export async function mailService(db: Database, mail: Mailer | null) {
    if (!mail)
        return '';
    return await usableGmail(db, mail) ? 'gmail' : mail.resendKey ? 'resend' : '';
}

const WINDOW_MINUTES = 60;        // older notifications are never emailed (no flood when email is first switched on)
const CHAT_GAP_MINUTES = 15;      // at most one "New message" email per conversation in this time
const BATCH = 20;
const ago = (minutes: number) => new Date(Date.now() - minutes * 60000).toISOString();
const escape = (s: string) => s.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!));
export const isEmail = (s: unknown): s is string => typeof s === 'string' && /^\S+@\S+\.\S+$/.test(s);
const pages: Record<string, string> = { conversation: '/#messages', services: '/#services', listing: '/#dashboard', request: '/#dashboard', offer: '/#dashboard', profile: '/#dashboard' };
// Every email (reset codes and notifications) is aligned to the left of the mail window.
const frame = (inner: string) => `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0;padding:8px 0;text-align:left;color:#1e3d2f">`
    + `<p style="font-size:20px;font-weight:700;margin:0 0 20px;color:#2d6a4f">Picking Price</p>${inner}</div>`;
const button = (href: string, label: string) => `<p style="margin:0 0 26px"><a href="${escape(href)}" style="background:#2d6a4f;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:11px 22px;border-radius:8px;display:inline-block">${label}</a></p>`;

/** Sends one email, from the connected Gmail account or else through Resend. Returns whether it was accepted. */
export async function sendMail(db: Database, mail: Mailer, message: { to: string; name?: string; subject: string; text: string; html: string }) {
    const account = await usableGmail(db, mail);
    if (account)
        return gmailSend(db, mail.gmail!, account, message);
    if (!mail.resendKey)
        return false;
    try {
        const r = await fetch(mail.endpoint || 'https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + mail.resendKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: mail.from, to: [message.to], subject: message.subject, text: message.text, html: message.html }) });
        if (!r.ok)
            console.error('Email was refused by the mail service', r.status);
        return r.ok;
    }
    catch (e) {
        console.error('Email could not be sent', e instanceof Error ? e.name : 'unknown');
        return false;
    }
}

export function emailFor(note: Row, site: string) {
    const link = site + (pages[String(note.link_type)] || '/#notifications');
    const title = String(note.title), body = String(note.body || '');
    const text = `Hello ${note.name || 'there'},\n\n${title}\n${body}\n\nOpen Picking Price: ${link}\n\nYou are receiving this email because you have an account on Picking Price.`;
    const html = frame(`<p style="font-size:15px;margin:0 0 12px">Hello ${escape(String(note.name || 'there'))},</p>`
        + `<p style="font-size:17px;font-weight:700;margin:0 0 6px">${escape(title)}</p>`
        + `<p style="font-size:15px;line-height:1.6;margin:0 0 22px;color:#3c5446">${escape(body)}</p>`
        + button(link, 'Open Picking Price')
        + `<p style="font-size:12px;color:#8aa08a;margin:0">You are receiving this email because you have an account on Picking Price.</p>`);
    return { subject: title + ' | Picking Price', text, html };
}

/** The email that carries a password reset code. */
export function resetEmail(name: string, code: string, minutes: number) {
    const text = `Hello ${name || 'there'},\n\nYour Picking Price password reset code is: ${code}\n\nEnter it on the Forgot Password page. It is valid for ${minutes} minutes and works once.\n\nIf you did not ask to reset your password, ignore this email; your password stays the same.`;
    const html = frame(`<p style="font-size:15px;margin:0 0 12px">Hello ${escape(name || 'there')},</p>`
        + `<p style="font-size:15px;line-height:1.6;margin:0 0 14px;color:#3c5446">Use this code to reset your Picking Price password:</p>`
        + `<p style="font-size:30px;font-weight:700;letter-spacing:6px;margin:0 0 14px;color:#1e3d2f;background:#eef5ea;border-radius:10px;padding:14px 18px;display:inline-block">${escape(code)}</p>`
        + `<p style="font-size:14px;line-height:1.6;margin:0 0 20px;color:#3c5446">Enter it on the Forgot Password page. It is valid for ${minutes} minutes and works once.</p>`
        + `<p style="font-size:12px;color:#8aa08a;margin:0">If you did not ask to reset your password, ignore this email; your password stays the same.</p>`);
    return { subject: `${code} is your Picking Price reset code`, text, html };
}


/** Sent once when a member creates an account (with a password or with Google). */
export function welcomeEmail(name: string, site: string) {
    const text = `Hello ${name || 'there'},\n\nWelcome to Picking Price. Your account is ready.\n\nWhat you can do now:\n- Browse new and pre-loved products from sellers across Pakistan.\n- Post a request for what you need and let sellers send you offers.\n- Sell your own items from Sell Now.\n\nOpen Picking Price: ${site}\n\nAlways inspect an item and meet in a safe public place before you pay.\n\nYou are receiving this email because you created an account on Picking Price.`;
    const step = (s: string) => `<li style="font-size:15px;line-height:1.6;margin:0 0 6px;color:#3c5446">${s}</li>`;
    const html = frame(`<p style="font-size:15px;margin:0 0 12px">Hello ${escape(name || 'there')},</p>`
        + `<p style="font-size:17px;font-weight:700;margin:0 0 6px">Welcome to Picking Price</p>`
        + `<p style="font-size:15px;line-height:1.6;margin:0 0 12px;color:#3c5446">Your account is ready. What you can do now:</p>`
        + `<ul style="margin:0 0 20px;padding-left:20px">${step('Browse new and pre-loved products from sellers across Pakistan.')}${step('Post a request for what you need and let sellers send you offers.')}${step('Sell your own items from <strong>Sell Now</strong>.')}</ul>`
        + button(site, 'Open Picking Price')
        + `<p style="font-size:13px;line-height:1.6;margin:0 0 14px;color:#3c5446">Always inspect an item and meet in a safe public place before you pay.</p>`
        + `<p style="font-size:12px;color:#8aa08a;margin:0">You are receiving this email because you created an account on Picking Price.</p>`);
    return { subject: 'Welcome to Picking Price', text, html };
}

/** Sent after a password has been reset, so the owner hears about a change they did not make. */
export function passwordChangedEmail(name: string, site: string) {
    const text = `Hello ${name || 'there'},\n\nThe password of your Picking Price account has just been changed, and every device was signed out. Log in with your new password: ${site}/login\n\nIf you did not change it, reset your password straight away from the Forgot Password page (${site}/forgot-password) and contact Picking Price support.`;
    const html = frame(`<p style="font-size:15px;margin:0 0 12px">Hello ${escape(name || 'there')},</p>`
        + `<p style="font-size:17px;font-weight:700;margin:0 0 6px">Your password was changed</p>`
        + `<p style="font-size:15px;line-height:1.6;margin:0 0 20px;color:#3c5446">The password of your Picking Price account has just been changed, and every device was signed out. Log in with your new password.</p>`
        + button(site + '/login', 'Log in')
        + `<p style="font-size:13px;line-height:1.6;margin:0 0 14px;color:#3c5446"><strong>Did not change it?</strong> Reset your password straight away from the <a href="${escape(site + '/forgot-password')}" style="color:#2d6a4f">Forgot Password</a> page and contact Picking Price support.</p>`
        + `<p style="font-size:12px;color:#8aa08a;margin:0">This is a security notice about your Picking Price account.</p>`);
    return { subject: 'Your Picking Price password was changed', text, html };
}

/** Sends an account email (welcome, password changed) when email is ready; never fails the request that caused it. */
export async function accountEmail(db: Database, to: string, name: string, message: { subject: string; text: string; html: string }) {
    const mail = mailer;
    if (!mail || !isEmail(to))
        return;
    const job = mailService(db, mail).then(ready => ready ? sendMail(db, mail, { to, name, ...message }) : false).catch(e => { console.error('Account email failed', e instanceof Error ? e.name : 'unknown'); return false; });
    if (!mail.background)
        await job;
}

/** What the admin panel's "Send test email" button sends. */
export function testEmail() {
    const text = 'This is a test email from Picking Price.\n\nIf you are reading it, the site can send password reset codes and notification emails.';
    const html = frame(`<p style="font-size:15px;line-height:1.6;margin:0 0 12px;color:#3c5446">This is a test email from Picking Price.</p>`
        + `<p style="font-size:15px;line-height:1.6;margin:0;color:#3c5446">If you are reading it, the site can send password reset codes and notification emails.</p>`);
    return { subject: 'Picking Price test email', text, html };
}

/** Emails the notifications created in the last hour that have not been emailed yet. Returns how many were sent. */
export async function deliverNotifications(db: Database, mail: Mailer) {
    const pending = await rows(db, 'SELECT n.id,n.owner,n.title,n.body,n.link_type,n.link_id,a.email,a.name FROM notifications n JOIN accounts a ON a.id=n.owner WHERE n.created>? AND NOT EXISTS (SELECT 1 FROM notification_emails e WHERE e.id=n.id) ORDER BY n.created LIMIT ?', ago(WINDOW_MINUTES), BATCH);
    let sent = 0;
    for (const note of pending) {
        const chat = note.link_type === 'conversation';
        const recent = chat ? await one(db, 'SELECT id FROM notification_emails WHERE owner=? AND link=? AND sent=1 AND created>?', note.owner, note.link_id, ago(CHAT_GAP_MINUTES)) : null;
        const send = isEmail(note.email) && !recent;
        // Claim it first: whichever request gets the row sends the email, so nobody receives it twice.
        const claimed = await one(db, 'INSERT INTO notification_emails (id,owner,link,sent,created) VALUES (?,?,?,?,?) ON CONFLICT(id) DO NOTHING RETURNING id', note.id, note.owner, chat ? note.link_id : '', send ? 1 : 0, now());
        if (!claimed || !send)
            continue;
        if (await sendMail(db, mail, { to: note.email, name: String(note.name || ''), ...emailFor(note, mail.site) }))
            sent++;
    }
    return sent;
}

/** Called after a marketplace request: sends any new notification emails, when email is ready. */
export async function afterRequest(db: Database) {
    const mail = mailer;
    if (!mail)
        return;
    const job = mailService(db, mail).then(ready => ready ? deliverNotifications(db, mail) : 0).catch(e => { console.error('Notification emails failed', e instanceof Error ? e.name : 'unknown'); return 0; });
    if (!mail.background)
        await job;
}
