import { env } from 'cloudflare:workers';
export async function GET(_req: Request, { params }: { params: Promise<{id: string}> }) { const { id } = await params; if (!/^[a-zA-Z0-9-]{1,80}$/.test(id))
    return new Response(null, { status: 404 }); const object = await (env as {BUCKET: {get: (key: string) => Promise<{body: ReadableStream; httpMetadata?: {contentType?: string}} | null>}}).BUCKET.get(id); if (!object)
    return new Response(null, { status: 404 }); return new Response(object.body, { headers: { 'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream', 'Cache-Control': 'public,max-age=86400', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'" } }); }
