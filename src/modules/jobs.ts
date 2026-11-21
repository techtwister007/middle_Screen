import "server-only";
import { and, eq, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { jobs } from "@/db/schema";
import { id } from "@/lib/ids";

/**
 * Tiny Postgres-backed job queue.
 * - enqueue() inserts a row; runDueJobs() is called right after requests (via `after()`)
 *   and every minute by Supabase pg_cron → /api/cron/tick.
 * - Handlers are registered in src/modules/job-handlers.ts.
 */
export type JobHandler = (payload: Record<string, unknown>) => Promise<void>;
const handlers = new Map<string, JobHandler>();

export function registerJob(type: string, fn: JobHandler) {
  handlers.set(type, fn);
}

export async function enqueue(type: string, payload: Record<string, unknown> = {}, runAt = new Date()) {
  const jobId = id();
  await db.insert(jobs).values({ id: jobId, type, payload, runAt });
  return jobId;
}

export async function runDueJobs(limit = 10): Promise<number> {
  await import("./job-handlers"); // ensure registration
  // Claim jobs atomically (skip locked so parallel runners don't collide). Re-claim stale running jobs after 5 min.
  const claimed = await db.execute<{ id: string; type: string; payload: Record<string, unknown>; attempts: number }>(sql`
    UPDATE jobs SET status = 'running', locked_at = now(), attempts = attempts + 1
    WHERE id IN (
      SELECT id FROM jobs
      WHERE (status = 'pending' AND run_at <= now()) OR (status = 'running' AND locked_at < now() - interval '5 minutes')
      ORDER BY run_at LIMIT ${limit} FOR UPDATE SKIP LOCKED
    )
    RETURNING id, type, payload, attempts`);
  let n = 0;
  for (const j of claimed) {
    const fn = handlers.get(j.type);
    try {
      if (!fn) throw new Error(`no handler for ${j.type}`);
      await fn(j.payload);
      await db.update(jobs).set({ status: "done", error: null }).where(eq(jobs.id, j.id));
      n++;
    } catch (e) {
      const failed = j.attempts >= 3;
      await db
        .update(jobs)
        .set({ status: failed ? "failed" : "pending", error: String(e).slice(0, 1000), runAt: new Date(Date.now() + 60000 * j.attempts) })
        .where(eq(jobs.id, j.id));
      console.error(`[jobs] ${j.type} failed`, e);
    }
  }
  return n;
}

export async function cleanupJobs() {
  await db.delete(jobs).where(and(eq(jobs.status, "done"), lt(jobs.createdAt, new Date(Date.now() - 7 * 86400000))));
}

