export type Row = Record<string, unknown>;
export interface Statement {
    bind(...args: unknown[]): Statement;
    first<T = Row>(): Promise<T | null>;
    all<T = Row>(): Promise<{
        results: T[];
    }>;
    run(): Promise<unknown>;
}
export interface Database {
    prepare(sql: string): Statement;
    batch(statements: Statement[]): Promise<unknown[]>;
}
export interface User {
    userId: string;
    displayName: string;
    email: string;
    role: string;
    provider?: string;
}
export interface Context {
    db: Database;
    user: User | null;
    ownerEmail?: string;
    /** Who is looking, for counting product views: the member, or a hash of a guest's address and browser. */
    visitor?: string;
}
export class MarketError extends Error {
    status: number;
    constructor(message: string, status = 400) { super(message); this.status = status; }
}
export const now = () => new Date().toISOString();
export const id = () => crypto.randomUUID();
export const pageOf = (q: URLSearchParams) => { const page = Math.max(1, Math.min(100000, Math.floor(Number(q.get('page'))) || 1)); const size = Math.max(1, Math.min(60, Math.floor(Number(q.get('size'))) || 12)); return { page, size, offset: (page - 1) * size }; };
