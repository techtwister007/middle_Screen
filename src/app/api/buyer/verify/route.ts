import { z } from "zod";
import { bad, buyerSid, json } from "@/lib/http";
import { waLink } from "@/lib/phone";
import { botNumber } from "@/lib/wa";
import { getShare } from "@/modules/shares";
import { consumeVerification, createVerification, verificationText } from "@/modules/verify";
import { identifyBuyer } from "@/modules/buyer";

/** Start "Confirm with WhatsApp": returns a wa.me link carrying a one-time code. */
export async function POST(req: Request) {
  const b = z.object({ code: z.string().min(3).max(16) }).safeParse(await req.json().catch(() => null));
  if (!b.success) return bad("invalid");
  const share = await getShare(b.data.code);
  if (!share) return bad("unknown link", 404);
  const sid = await buyerSid();
  const vcode = await createVerification("buyer_verify", { sessionId: sid, shareCode: share.code });
  return json({ ok: true, vcode, waUrl: waLink(botNumber(), verificationText("buyer_verify", vcode)) });
}

/** Poll: once the bot saw the code, link the verified number to this buyer session. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const v = u.searchParams.get("v") ?? "";
  const name = (u.searchParams.get("name") ?? "").slice(0, 80);
  const r = await consumeVerification(v, "buyer_verify");
  if (r.status !== "verified") return json({ status: r.status });
  const sid = await buyerSid();
  if (r.sessionId !== sid || !r.shareCode) return json({ status: "expired" });
  const share = await getShare(r.shareCode);
  if (!share) return json({ status: "expired" });
  await identifyBuyer(sid, { code: share.code, agentId: share.agentId, listingId: share.listingId, collectionId: share.collectionId, leadId: share.leadId }, { name, phone: r.phone, verified: true });
  return json({ status: "verified", name });
}
