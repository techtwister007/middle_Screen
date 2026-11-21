import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import postgres from "postgres";
import { E2E_ENV } from "../../playwright.config";

/** Fresh, migrated test database + empty storage before every E2E run. */
export default async function globalSetup() {
  const sql = postgres(E2E_ENV.DATABASE_URL, { max: 1, onnotice: () => {} });
  await sql`drop schema if exists public cascade`;
  await sql`drop schema if exists drizzle cascade`;
  await sql`create schema public`;
  await sql.end();
  execSync("npx tsx scripts/migrate.ts", { env: { ...process.env, DATABASE_URL: E2E_ENV.DATABASE_URL }, stdio: "inherit" });
  rmSync(E2E_ENV.LOCAL_STORAGE_DIR, { recursive: true, force: true });
}
