import { Context, MarketError, id, now } from './types';
import { permit, one, rows, run, stmt, log } from './core';
import { stringValue } from './validation';

// The slider on the home page, managed in the admin panel. A slide is an uploaded image, an uploaded video, or a
// YouTube video, with an optional title and an optional link that opens when it is pressed. An uploaded image or
// video may have a phone version (2 : 1) that phones show instead, so nothing is trimmed on small screens.
const MAX_SLIDES = 10;
const KINDS = ['image', 'video', 'youtube'] as const;
type Kind = typeof KINDS[number];

/** The 11-character id of a YouTube video, from any of its usual addresses; '' when it is not one. */
export function youtubeId(address: string) {
    let url: URL;
    try { url = new URL(address.trim()); } catch { return ''; }
    const host = url.hostname.replace(/^www\.|^m\./, '');
    let found = '';
    if (host === 'youtu.be')
        found = url.pathname.slice(1);
    else if (host === 'youtube.com' || host === 'youtube-nocookie.com')
        found = url.searchParams.get('v') || (/^\/(?:embed|shorts|live)\/([^/?#]+)/.exec(url.pathname)?.[1] ?? '');
    return /^[\w-]{11}$/.test(found) ? found : '';
}

/** Active slides in their order, for every visitor. */
export async function publicSlides(c: Context) {
    return { items: await rows(c.db, 'SELECT id,kind,url,mobile_url,title,link FROM slides WHERE active=1 ORDER BY sort_order,created') };
}
/** Every slide, for the admin panel. */
export async function adminSlides(c: Context) {
    permit(c, 'admin');
    return { items: await rows(c.db, 'SELECT * FROM slides ORDER BY sort_order,created'), max: MAX_SLIDES };
}

async function checkMedia(c: Context, kind: Kind, address: unknown) {
    const url = stringValue(address, 1, 500);
    if (kind === 'youtube') {
        const video = youtubeId(url);
        if (!video)
            throw new MarketError('Paste a YouTube video link, for example https://www.youtube.com/watch?v=...');
        return 'https://www.youtube.com/watch?v=' + video;
    }
    const file = /^\/api\/files\/([a-zA-Z0-9-]{1,80})$/.exec(url)?.[1];
    const upload = file ? await one(c.db, 'SELECT mime FROM uploads WHERE id=?', file) : null;
    if (!upload || !String(upload.mime).startsWith(kind + '/'))
        throw new MarketError(kind === 'video' ? 'Upload the video first.' : 'Upload the image first.');
    return url;
}
function checkLink(value: unknown) {
    const link = typeof value === 'string' ? value.trim() : '';
    if (!link)
        return '';
    if (link.length > 500 || !(/^\/(?!\/)/.test(link) || /^https:\/\/[^\s]+$/.test(link)))
        throw new MarketError('The link must be a page of this site (starting with /) or an https:// address.');
    return link;
}

/** Adds a slide (no key) or changes one. */
export async function saveSlide(c: Context, body: Record<string, unknown>, key?: string) {
    permit(c, 'admin');
    const old = key ? await one(c.db, 'SELECT * FROM slides WHERE id=?', key) : null;
    if (key && !old)
        throw new MarketError('This slide no longer exists.', 404);
    const kind = (old ? old.kind : body.kind) as Kind;
    if (!KINDS.includes(kind))
        throw new MarketError('Choose an image, a video or a YouTube link.');
    const url = old && body.url === undefined ? String(old.url) : await checkMedia(c, kind, body.url);
    // The phone version: kept when not sent, removed with '', otherwise an uploaded file of the same kind.
    let mobileUrl = body.mobileUrl === undefined ? String(old?.mobile_url ?? '') : '';
    if (body.mobileUrl !== undefined && body.mobileUrl !== '') {
        if (kind === 'youtube')
            throw new MarketError('A phone version can be added to uploaded images and videos only.');
        mobileUrl = await checkMedia(c, kind, body.mobileUrl);
    }
    const title = body.title === undefined && old ? String(old.title) : stringValue(body.title ?? '', 0, 120);
    const link = body.link === undefined && old ? String(old.link) : checkLink(body.link);
    const order = body.order === undefined ? Number(old?.sort_order ?? 0) : Number(body.order);
    if (!Number.isInteger(order) || order < 0 || order > 1000)
        throw new MarketError('Enter a position between 0 and 1000.');
    const active = body.active === undefined ? Number(old?.active ?? 1) : body.active ? 1 : 0;
    if (old) {
        await c.db.batch([stmt(c.db, 'UPDATE slides SET url=?,mobile_url=?,title=?,link=?,sort_order=?,active=? WHERE id=?', url, mobileUrl, title, link, order, active, key), log(c, 'slide:update', title || kind)]);
        return { id: key };
    }
    if (Number((await one(c.db, 'SELECT COUNT(*) n FROM slides'))!.n) >= MAX_SLIDES)
        throw new MarketError(`The slider holds up to ${MAX_SLIDES} slides. Remove one first.`, 409);
    const slide = id();
    await c.db.batch([stmt(c.db, 'INSERT INTO slides (id,kind,url,mobile_url,title,link,sort_order,active,created) VALUES (?,?,?,?,?,?,?,?,?)', slide, kind, url, mobileUrl, title, link, order, active, now()), log(c, 'slide:add', title || kind)]);
    return { id: slide };
}
export async function deleteSlide(c: Context, key: string) {
    permit(c, 'admin');
    const old = await one(c.db, 'SELECT title,kind FROM slides WHERE id=?', key);
    if (!old)
        throw new MarketError('This slide no longer exists.', 404);
    await run(c.db, 'DELETE FROM slides WHERE id=?', key);
    await c.db.batch([log(c, 'slide:delete', String(old.title || old.kind))]);
    return { ok: true };
}
