import { env } from 'cloudflare:workers';
import { getMarketUser } from '@/lib/auth/server';
import { market } from '@/lib/market/router';
import { MarketError, Database } from '@/lib/market/types';
export const dynamic = 'force-dynamic';
export async function handle(req: Request, path: string[]) {
    try {
        if (req.method !== 'GET' && req.headers.get('origin') !== new URL(req.url).origin)
            return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
        const user = await getMarketUser();
        let body = {};
        if (!['GET', 'DELETE'].includes(req.method)) {
            const text = await req.text();
            if (text.length > 24000)
                throw new MarketError('This form is too large.', 413);
            try {
                body = JSON.parse(text);
            }
            catch {
                throw new MarketError('Invalid form.');
            }
        }
        const data = await market({ db: (env as {DB: Database}).DB, user }, req.method, path, new URL(req.url).searchParams, body);
        return Response.json(data, { headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
    }
    catch (e) {
        if (e instanceof MarketError)
            return Response.json({ error: e.message }, { status: e.status });
        console.error('Marketplace operation failed', e instanceof Error ? e.message : 'unknown');
        return Response.json({ error: 'This action could not be completed. Please retry.' }, { status: 503 });
    }
}
export async function GET(req: Request, { params }: { params: Promise<{path: string[]}> }) { return handle(req, (await params).path); }
export const POST = GET;
export const PATCH = GET;
export const PUT = GET;
export const DELETE = GET;
