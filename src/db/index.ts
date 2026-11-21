import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { env } from "@/config/env";

const globalForDb = globalThis as unknown as { __pgClient?: ReturnType<typeof postgres> };

// Reuse one connection pool across hot reloads / serverless invocations.
const client =
  globalForDb.__pgClient ??
  postgres(env.DATABASE_URL, {
    max: env.NODE_ENV === "production" ? 5 : 10,
    prepare: false, // required for Supabase transaction pooler
    onnotice: () => {},
  });
globalForDb.__pgClient = client;

export const db = drizzle(client, { schema });
export type DB = typeof db;
export { schema };
