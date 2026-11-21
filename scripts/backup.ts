import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";

/**
 * Cross-platform database backup (works on Windows without pg_dump):
 * exports every table to JSON in ./backups/<timestamp>/. Run weekly from your laptop:
 *   npm run backup
 * Media files live in Cloudflare R2 (durable); use `rclone sync r2:proppulse-media ./backups/media` if you want a copy.
 */
const url = process.env.BACKUP_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL not set");
const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
const dir = path.join("backups", new Date().toISOString().replace(/[:.]/g, "-"));
mkdirSync(dir, { recursive: true });
const tables = await sql<{ tablename: string }[]>`select tablename from pg_tables where schemaname = 'public' order by tablename`;
for (const { tablename } of tables) {
  const rows = await sql`select * from ${sql(tablename)}`;
  writeFileSync(path.join(dir, `${tablename}.json`), JSON.stringify(rows, null, 0));
  console.log(`✔ ${tablename}: ${rows.length} rows`);
}
await sql.end();
console.log(`Backup written to ${dir}`);
