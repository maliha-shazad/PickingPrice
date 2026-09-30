import { googleReady } from '@/lib/auth/server';
export async function GET() { return Response.json({ google: googleReady(), email: true, recovery: false, workspace: true }, { headers: { 'Cache-Control': 'no-store' } }); }
