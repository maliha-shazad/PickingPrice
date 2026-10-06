// Creates the local database tables the first time the Workers edition is started.
// `wrangler dev` does not apply the SQL migrations in drizzle/ by itself, so a fresh copy of the
// project would start with an empty database. A database that already has its tables is left alone.
import { readFile, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const { Miniflare } = createRequire(require.resolve("wrangler/package.json"))("miniflare");

// Must match the database id in vite.config.ts and the folder `npm start` keeps its data in.
const LOCAL_DATABASE_ID = "00000000-0000-4000-8000-000000000000";
const mf = new Miniflare({
  modules: true,
  script: "export default { fetch() { return new Response('ok'); } }",
  compatibilityDate: "2026-05-15",
  d1Databases: { DB: LOCAL_DATABASE_ID },
  d1Persist: path.join(root, ".wrangler/state/v3/d1"),
});

try {
  const db = await mf.getD1Database("DB");
  const ready = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='accounts'").first();
  if (!ready) {
    const folder = path.join(root, "drizzle");
    for (const file of (await readdir(folder)).filter((name) => name.endsWith(".sql")).sort()) {
      const sql = await readFile(path.join(folder, file), "utf8");
      for (const statement of sql.split("--> statement-breakpoint").map((part) => part.trim()).filter(Boolean)) {
        try {
          await db.prepare(statement).run();
        } catch (error) {
          // A table the server already made for itself on an earlier start is fine.
          if (!/already exists|duplicate column/i.test(String(error?.message))) throw error;
        }
      }
    }
    console.log("Local database created.");
  }
} finally {
  await mf.dispose();
}
