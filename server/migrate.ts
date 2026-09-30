import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Pool } from 'pg';
export async function migrate(pool: Pool) { await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)'); for (const file of (await readdir(resolve('drizzle'))).filter(f => f.endsWith('.sql')).sort()) {
    const exists = await pool.query('SELECT name FROM schema_migrations WHERE name=$1', [file]);
    if (exists.rows.length)
        continue;
    const sql = (await readFile(resolve('drizzle', file), 'utf8')).replaceAll('`', '"');
    const c = await pool.connect();
    try {
        await c.query('BEGIN');
        for (const statement of sql.split('--> statement-breakpoint').map(x => x.trim()).filter(Boolean))
            await c.query(statement);
        await c.query('INSERT INTO schema_migrations (name,applied_at) VALUES ($1,$2)', [file, new Date().toISOString()]);
        await c.query('COMMIT');
    }
    catch (e) {
        await c.query('ROLLBACK');
        throw e;
    }
    finally {
        c.release();
    }
} }
