import { z } from "zod";
import { currentAgent } from "@/lib/auth/session";
import { bad, json } from "@/lib/http";
import { createRazorpayOrder } from "@/modules/billing";

export async function POST(req: Request) {
  const agent = await currentAgent();
  if (!agent) return bad("unauthorized", 401);
  const b = z.object({ months: z.union([z.literal(1), z.literal(3), z.literal(12)]) }).safeParse(await req.json().catch(() => null));
  if (!b.success) return bad("Pick a plan");
  try {
    return json({ ok: true, ...(await createRazorpayOrder(agent.id, b.data.months)) });
  } catch (e) {
    return bad((e as Error).message, 502);
  }
}
