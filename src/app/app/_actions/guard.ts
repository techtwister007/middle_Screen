import "server-only";
import { requireAgent } from "@/lib/auth/session";
import { getAccess } from "@/modules/billing";

export type Result<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

/** Agent must be logged in AND have an active plan/trial (or grace) to change data. */
export async function activeAgent() {
  const agent = await requireAgent();
  const access = await getAccess(agent.id);
  if (!access.canUse) throw new Error("Your plan has ended. Renew from Settings → Billing to continue.");
  return agent;
}

export async function safe<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    // Next's redirect() throws — let it propagate.
    if (e && typeof e === "object" && "digest" in e && String((e as { digest: string }).digest).startsWith("NEXT_REDIRECT")) throw e;
    return { ok: false, error: (e as Error).message || "Something went wrong" };
  }
}
