import { handle } from './[...path]/route';
export const dynamic = 'force-dynamic';
export async function GET(req: Request) { return handle(req, ['bootstrap']); }
export async function POST() { return Response.json({ error: 'Please refresh the page to use the updated marketplace.' }, { status: 410 }); }
