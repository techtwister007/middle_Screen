import { eq } from "drizzle-orm";
import { z } from "zod";
import { devTools } from "@/config/env";
import { db } from "@/db";
import { agents } from "@/db/schema";
import { bad, json } from "@/lib/http";
import { normalizePhone } from "@/lib/phone";
import { startAgentSession } from "@/lib/auth/session";
import { createAgent, getAgentByPhone, uniqueHandle } from "@/modules/agents";

/** Development-only login (DEV_TOOLS=true): log in as any phone number without WhatsApp. */
export async function POST(req: Request) {
  if (!devTools) return bad("disabled", 404);
  const b = z.object({ phone: z.string(), name: z.string().optional() }).safeParse(await req.json().catch(() => null));
  const phone = normalizePhone(b.data?.phone);
  if (!b.success || !phone) return bad("Enter a valid phone");
  let a = await getAgentByPhone(phone);
  if (!a) {
    a = await createAgent(phone, b.data.name ?? "");
    const name = b.data.name?.trim() || `Agent ${phone.slice(-4)}`;
    await db.update(agents).set({ name, handle: await uniqueHandle(name, a.id), onboarded: true, promiseAcceptedAt: new Date(), botContext: {} }).where(eq(agents.id, a.id));
  }
  await startAgentSession(a.id);
  return json({ ok: true });
}
