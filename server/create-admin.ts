import { Pool } from 'pg';
import { migrate } from './migrate';
import { PgDatabase } from './database';
import { adminCreate } from '../lib/market/admin-auth';
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase(), password = process.env.ADMIN_PASSWORD;
if (!process.env.DATABASE_URL || !email || !password || password.length < 16)
    throw Error('Set DATABASE_URL, ADMIN_EMAIL and a unique ADMIN_PASSWORD of at least 16 characters.');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
await migrate(pool);
if (!await adminCreate(new PgDatabase(pool), email, password))
    throw Error('An administrator already exists. Nothing was changed. Sign in at /admin and change the password there.');
console.log('Administrator created. Sign in at /admin.');
await pool.end();
