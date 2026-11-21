import { z } from "zod";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { currentAgent } from "@/lib/auth/session";
import { bad, json } from "@/lib/http";

const Sub = z.object({ endpoint: z.string().url().max(1000), keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }) });

export async function POST(req: Request) {
  const agent = await currentAgent();
  if (!agent) return bad("unauthorized", 401);
  const s = Sub.safeParse(await req.json().catch(() => null));
  if (!s.success) return bad("invalid");
  await db
    .insert(pushSubscriptions)
    .values({ endpoint: s.data.endpoint, agentId: agent.id, p256dh: s.data.keys.p256dh, auth: s.data.keys.auth })
    .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { agentId: agent.id, p256dh: s.data.keys.p256dh, auth: s.data.keys.auth } });
  return json({ ok: true });
}
