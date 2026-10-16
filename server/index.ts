import { Pool } from 'pg';
import { resolve } from 'node:path';
import { PgDatabase } from './database';
import { migrate } from './migrate';
import { createApp } from './app';
import { expireRequests } from '../lib/market/core';
import { afterRequest } from '../lib/market/email';
if (!process.env.DATABASE_URL)
    throw Error('Set DATABASE_URL to your PostgreSQL connection string.');
// Railway supplies its public domain and any attached volume; explicit settings still win.
const origin = process.env.APP_ORIGIN || (process.env.RAILWAY_PUBLIC_DOMAIN ? 'https://' + process.env.RAILWAY_PUBLIC_DOMAIN : 'http://localhost:3000');
const uploads = process.env.UPLOADS_DIR || (process.env.RAILWAY_VOLUME_MOUNT_PATH ? process.env.RAILWAY_VOLUME_MOUNT_PATH + '/uploads' : 'server/uploads');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10, ssl: process.env.PGSSL === 'require' ? { rejectUnauthorized: true } : undefined });
await migrate(pool);
const db = new PgDatabase(pool);
const app = createApp(db, { origin, uploadsDir: resolve(uploads), publicDir: resolve('server/public'), adminSetupCode: process.env.ADMIN_SETUP_CODE, googleClientId: process.env.GOOGLE_CLIENT_ID, googleClientSecret: process.env.GOOGLE_CLIENT_SECRET, googleSiteVerification: process.env.GOOGLE_SITE_VERIFICATION, gmailClientId: process.env.GMAIL_CLIENT_ID, gmailClientSecret: process.env.GMAIL_CLIENT_SECRET, resendKey: process.env.RESEND_API_KEY, emailFrom: process.env.EMAIL_FROM });
app.listen(Number(process.env.PORT || 3000), '0.0.0.0', () => console.log('Picking Price listening on ' + origin));
// Buyer requests end after a few days even when nobody visits; their owners get the notification and its email.
setInterval(() => { expireRequests(db).then(() => afterRequest(db)).catch(e => console.error('Request expiry failed', e instanceof Error ? e.message : e)); }, 10 * 60 * 1000).unref();
