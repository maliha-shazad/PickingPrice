// Starts the project's own PostgreSQL server for local development (`npm run dev`) when it is not
// running yet. Its data lives in .postgres/data and it listens on port 5433, so it never touches a
// PostgreSQL that is installed system-wide on 5432. Set PG_BIN if PostgreSQL is installed elsewhere.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const data = path.join(root, ".postgres", "data");
const bin = process.env.PG_BIN || (process.platform === "win32" ? "C:\\Program Files\\PostgreSQL\\17\\bin" : "");
const pgCtl = bin ? path.join(bin, "pg_ctl") : "pg_ctl";

if (!existsSync(data)) {
  console.error("No local database in .postgres/data. See README.md, \"Local PostgreSQL\".");
  process.exit(1);
}
try {
  execFileSync(pgCtl, ["status", "-D", data], { stdio: "ignore" });
} catch {
  execFileSync(pgCtl, ["start", "-w", "-D", data, "-l", path.join(root, ".postgres", "server.log")], { stdio: "inherit" });
}
