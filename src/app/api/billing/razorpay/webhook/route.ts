import { bad, json } from "@/lib/http";
import { confirmRazorpayOrder, verifyRazorpayWebhook } from "@/modules/billing";

/** Razorpay webhook (payment.captured / order.paid). Configure URL: /api/billing/razorpay/webhook */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyRazorpayWebhook(raw, req.headers.get("x-razorpay-signature"))) return bad("bad signature", 401);
  const evt = JSON.parse(raw) as { event: string; payload?: { payment?: { entity?: { id: string; order_id: string } } } };
  const p = evt.payload?.payment?.entity;
  if ((evt.event === "payment.captured" || evt.event === "order.paid") && p?.order_id) await confirmRazorpayOrder(p.order_id, p.id);
  return json({ ok: true });
}
