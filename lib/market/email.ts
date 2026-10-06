import { Database, Row, now } from './types';
import { one, rows } from './core';

// Email copies of in-app notifications, sent through Resend (https://resend.com).
// Nothing is sent until an API key is configured (RESEND_API_KEY); the in-app notifications never depend on it.
export type Mailer = {
    key: string;
    /** "Name <address>" on a domain verified in Resend. */
    from: string;
    /** Public address of the site, for the link in each email. */
    site: string;
    /** Send after the response instead of before it (long-running servers). */
    background?: boolean;
    /** Where emails are posted; only tests change it. */
    endpoint?: string;
};
export const defaultSender = 'Picking Price <onboarding@resend.dev>';
let mailer: Mailer | null = null;
export const setMailer = (next: Mailer | null) => { mailer = next?.key ? next : null; };

const WINDOW_MINUTES = 60;        // older notifications are never emailed (no flood when the key is first added)
const CHAT_GAP_MINUTES = 15;      // at most one "New message" email per conversation in this time
const BATCH = 20;
const ago = (minutes: number) => new Date(Date.now() - minutes * 60000).toISOString();
const escape = (s: string) => s.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!));
const isEmail = (s: unknown): s is string => typeof s === 'string' && /^\S+@\S+\.\S+$/.test(s);
const pages: Record<string, string> = { conversation: '/#messages', services: '/#services', listing: '/#dashboard', request: '/#dashboard', offer: '/#dashboard', profile: '/#dashboard' };

export function emailFor(note: Row, site: string) {
    const link = site + (pages[String(note.link_type)] || '/#notifications');
    const title = String(note.title), body = String(note.body || '');
    const text = `Hello ${note.name || 'there'},\n\n${title}\n${body}\n\nOpen Picking Price: ${link}\n\nYou are receiving this email because you have an account on Picking Price.`;
    const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1e3d2f">`
        + `<p style="font-size:20px;font-weight:700;margin:0 0 20px;color:#2d6a4f">Picking Price</p>`
        + `<p style="font-size:15px;margin:0 0 12px">Hello ${escape(String(note.name || 'there'))},</p>`
        + `<p style="font-size:17px;font-weight:700;margin:0 0 6px">${escape(title)}</p>`
        + `<p style="font-size:15px;line-height:1.6;margin:0 0 22px;color:#3c5446">${escape(body)}</p>`
        + `<p style="margin:0 0 26px"><a href="${escape(link)}" style="background:#2d6a4f;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:11px 22px;border-radius:8px;display:inline-block">Open Picking Price</a></p>`
        + `<p style="font-size:12px;color:#8aa08a;margin:0">You are receiving this email because you have an account on Picking Price.</p></div>`;
    return { subject: title + ' | Picking Price', text, html };
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
        try {
            const r = await fetch(mail.endpoint || 'https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + mail.key, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: mail.from || defaultSender, to: [note.email], ...emailFor(note, mail.site) }) });
            if (r.ok)
                sent++;
            else
                console.error('Notification email was refused', r.status);
        }
        catch (e) {
            console.error('Notification email could not be sent', e instanceof Error ? e.name : 'unknown');
        }
    }
    return sent;
}

/** Called after a marketplace request: sends any new notification emails, when email is configured. */
export async function afterRequest(db: Database) {
    const mail = mailer;
    if (!mail)
        return;
    const job = deliverNotifications(db, mail).catch(e => { console.error('Notification emails failed', e instanceof Error ? e.name : 'unknown'); return 0; });
    if (!mail.background)
        await job;
}
