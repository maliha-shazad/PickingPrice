import { Pool, PoolClient } from 'pg';
import type { Database, Statement } from '../lib/market/types';
export function postgresSQL(sql: string) { let index = 0; let quoted = false; let out = ''; for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    if (char === "'") {
        if (quoted && sql[i + 1] === "'") {
            out += "''";
            i++;
            continue;
        }
        quoted = !quoted;
    }
    out += char === '?' && !quoted ? '$' + (++index) : char;
} return out; }
export class PgDatabase implements Database {
    pool: Pool;
    constructor(pool: Pool) { this.pool = pool; }
    prepare(sql: string) { return new PgStatement(this, sql, []); }
    async batch(statements: Statement[]) { const client = await this.pool.connect(); try {
        await client.query('BEGIN');
        const result = [];
        for (const s of statements as PgStatement[])
            result.push(await s.execute(client));
        await client.query('COMMIT');
        return result;
    }
    catch (e) {
        await client.query('ROLLBACK');
        throw e;
    }
    finally {
        client.release();
    } }
}
class PgStatement implements Statement {
    db: PgDatabase;
    sql: string;
    args: unknown[];
    constructor(db: PgDatabase, sql: string, args: unknown[]) { this.db = db; this.sql = sql; this.args = args; }
    bind(...args: unknown[]) { return new PgStatement(this.db, this.sql, args); }
    async execute(client: Pool | PoolClient = this.db.pool) { const result = await client.query(postgresSQL(this.sql), this.args); return { results: result.rows, meta: { changes: result.rowCount } }; }
    async first<T = unknown>() { return (await this.execute()).results[0] as T || null; }
    async all<T = unknown>() { return { results: (await this.execute()).results as T[] }; }
    async run() { return this.execute(); }
}
