import { env } from 'cloudflare:workers';
import { getMarketUser } from '@/lib/auth/server';
import { ensureProfile, one, run } from '@/lib/market/core';
import { imageMime } from '@/lib/market/files';
import { MarketError, id, now, Context } from '@/lib/market/types';
export async function POST(req: Request) { try {
    if (req.headers.get('origin') !== new URL(req.url).origin)
        return new Response(null, { status: 403 });
    const user = await getMarketUser();
    if (!user)
        return Response.json({ error: 'Sign in to upload photos.' }, { status: 401 });
    const c: Context = { db: (env as {DB: import('../../../lib/market/types').Database}).DB, user };
    await ensureProfile(c);
    const max = 5 * 1024 * 1024;
    if (Number(req.headers.get('content-length') || 0) > max)
        throw new MarketError('Each photo must be under 5 MB.', 413);
    const bytes = new Uint8Array(await req.arrayBuffer());
    if (bytes.byteLength > max)
        throw new MarketError('Each photo must be under 5 MB.', 413);
    const mime = imageMime(bytes);
    const count = await one(c.db, 'SELECT COUNT(*) n FROM uploads WHERE owner=? AND created>?', user.userId, new Date(Date.now() - 86400000).toISOString());
    if (Number(count!.n) >= 100)
        throw new MarketError('Daily photo upload limit reached.', 429);
    const key = id();
    await (env as {BUCKET: {put: (key: string, body: Uint8Array, opts: {httpMetadata: {contentType: string}}) => Promise<void>}}).BUCKET.put(key, bytes, { httpMetadata: { contentType: mime } });
    try {
        await run(c.db, 'INSERT INTO uploads (id,owner,mime,size,created) VALUES (?,?,?,?,?)', key, user.userId, mime, bytes.length, now());
    }
    catch (e) {
        await (env as {BUCKET: {delete: (key: string) => Promise<void>}}).BUCKET.delete(key);
        throw e;
    }
    return Response.json({ url: '/api/files/' + key }, { headers: { 'Cache-Control': 'no-store' } });
}
catch (e) {
    return Response.json({ error: e instanceof MarketError ? e.message : 'Photo upload failed. Please retry.' }, { status: e instanceof MarketError ? e.status : 503 });
} }
