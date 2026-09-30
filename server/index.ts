import { Pool } from 'pg';
import { resolve } from 'node:path';
import { PgDatabase } from './database';
import { migrate } from './migrate';
import { createApp } from './app';
if (!process.env.DATABASE_URL)
    throw Error('Set DATABASE_URL to your PostgreSQL connection string.');
const origin = process.env.APP_ORIGIN || 'http://localhost:3000';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10, ssl: process.env.PGSSL === 'require' ? { rejectUnauthorized: true } : undefined });
await migrate(pool);
const app = createApp(new PgDatabase(pool), { origin, uploadsDir: resolve(process.env.UPLOADS_DIR || 'server/uploads'), publicDir: resolve('server/public'), googleClientId: process.env.GOOGLE_CLIENT_ID, googleClientSecret: process.env.GOOGLE_CLIENT_SECRET, resendKey: process.env.RESEND_API_KEY, emailFrom: process.env.EMAIL_FROM });
app.listen(Number(process.env.PORT || 3000), '0.0.0.0', () => console.log('Picking Price listening on ' + origin));
