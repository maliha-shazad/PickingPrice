import { googleReady } from '@/lib/auth/server';
export async function GET() { return Response.json({ google: googleReady(), email: true, recovery: false }, { headers: { 'Cache-Control': 'no-store' } }); }
