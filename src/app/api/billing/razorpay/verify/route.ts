import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { currentAgent } from "@/lib/auth/session";
import { bad, json } from "@/lib/http";
import { confirmRazorpayOrder, verifyRazorpayCheckout } from "@/modules/billing";

/** Called by the browser after Razorpay checkout succeeds. The webhook is the backup path. */
export async function POST(req: Request) {
  const agent = await currentAgent();
  if (!agent) return bad("unauthorized", 401);
  const b = z.object({ razorpay_order_id: z.string(), razorpay_payment_id: z.string(), razorpay_signature: z.string() }).safeParse(await req.json().catch(() => null));
  if (!b.success) return bad("invalid");
  const { razorpay_order_id: o, razorpay_payment_id: p, razorpay_signature: s } = b.data;
  const own = await db.query.payments.findFirst({ where: and(eq(payments.orderId, o), eq(payments.agentId, agent.id)) });
  if (!own) return bad("order not found", 404);
  if (!verifyRazorpayCheckout(o, p, s)) return bad("signature mismatch", 400);
  await confirmRazorpayOrder(o, p);
  return json({ ok: true });
}
