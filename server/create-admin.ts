import { Pool } from 'pg';
import { migrate } from './migrate';
import { hashPassword } from '../lib/auth/password';
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase(), password = process.env.ADMIN_PASSWORD;
if (!process.env.DATABASE_URL || !email || !password || password.length < 16)
    throw Error('Set DATABASE_URL, ADMIN_EMAIL and a unique ADMIN_PASSWORD of at least 16 characters.');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
await migrate(pool);
const id = crypto.randomUUID();
const result = await pool.query("INSERT INTO accounts (id,email,name,password_hash,role,created) VALUES ($1,$2,$3,$4,'admin',$5) ON CONFLICT(email) DO NOTHING RETURNING id", [id, email, 'Marketplace administrator', await hashPassword(password), new Date().toISOString()]);
if (!result.rows.length)
    throw Error('An account already uses this email. No account was modified.');
console.log('Administrator account created.');
await pool.end();
