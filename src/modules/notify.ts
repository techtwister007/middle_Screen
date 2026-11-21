import "server-only";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { id } from "@/lib/ids";
import { pushToAgent } from "@/lib/push";

export type NotifyInput = { kind: string; title: string; body?: string; href?: string; important?: boolean };

/**
 * Record an activity item for the agent (in-app activity centre) and, for important ones,
 * send a free web-push notification. We deliberately do NOT send WhatsApp for alerts (paid templates).
 */
export async function notifyAgent(agentId: string, n: NotifyInput) {
  await db.insert(notifications).values({ id: id(), agentId, kind: n.kind, title: n.title, body: n.body ?? "", href: n.href, important: !!n.important });
  if (n.important) await pushToAgent(agentId, { title: n.title, body: n.body ?? "", href: n.href });
}
