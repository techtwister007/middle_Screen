import { z } from "zod";
import { bad, buyerSid, deviceOf, json } from "@/lib/http";
import { getShare } from "@/modules/shares";
import { after } from "next/server";
import { recordEvent } from "@/modules/tracking";

const Body = z.object({
  code: z.string().min(3).max(16),
  type: z.enum(["open", "gallery", "video", "map", "call", "whatsapp", "share", "compare", "place", "dwell"]),
  meta: z.record(z.string(), z.unknown()).optional(),
  listingId: z.string().max(40).optional(),
});

/** First-party event tracking from buyer pages. */
export async function POST(req: Request) {
  const device = deviceOf(req.headers.get("user-agent"));
  if (device === "bot") return json({ ok: true });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad("invalid");
  const { code, type, meta = {}, listingId } = parsed.data;
  const share = await getShare(code);
  if (!share) return bad("unknown link", 404);
  // A collection link may track any of its listings; a listing link only its own.
  let lid = share.listingId;
  if (share.collectionId && listingId) {
    const { db } = await import("@/db");
    const c = await db.query.collections.findFirst({ where: (c, { eq }) => eq(c.id, share.collectionId!) });
    lid = c?.listingIds.includes(listingId) ? listingId : null;
  }
  const safeMeta = Object.fromEntries(Object.entries(meta).slice(0, 8).map(([k, v]) => [k.slice(0, 24), typeof v === "string" ? v.slice(0, 120) : v]));
  const sid = await buyerSid();
  const rec = () => recordEvent(sid, { code: share.code, agentId: share.agentId, listingId: share.listingId, collectionId: share.collectionId, leadId: share.leadId }, type, safeMeta, { listingId: lid, device });
  // "open" drives the agent's instant alert → record before responding. Frequent minor events (gallery, dwell…) after.
  if (type === "open") await rec();
  else after(() => rec().then(() => {}));
  return json({ ok: true });
}
