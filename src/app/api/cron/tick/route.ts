import { env } from "@/config/env";
import { bad, json } from "@/lib/http";
import { runDueJobs } from "@/modules/jobs";
import { tick } from "@/modules/job-handlers";

/**
 * Called every minute by Supabase pg_cron (or any cron pinger) with
 *   Authorization: Bearer CRON_SECRET
 * Runs due jobs (draft batching, matching) and periodic checks (visit reminders, daily tasks).
 */
async function handle(req: Request) {
  const auth = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? new URL(req.url).searchParams.get("key");
  if (auth !== env.CRON_SECRET) return bad("unauthorized", 401);
  await tick();
  const n = await runDueJobs(25);
  return json({ ok: true, jobs: n });
}
export const GET = handle;
export const POST = handle;
