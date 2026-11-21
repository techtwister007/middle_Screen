import { z } from "zod";
import { db } from "@/db";
import { bad, buyerSid, json } from "@/lib/http";
import { normalizePhone } from "@/lib/phone";
import { getShare } from "@/modules/shares";
import { askQuestion, currentLeadForSession, identifyBuyer, requestVisit, setBuyerAction } from "@/modules/buyer";
import { getAccess } from "@/modules/billing";
import type { ShareCtx } from "@/modules/tracking";

const Body = z.object({
  code: z.string().min(3).max(16),
  action: z.enum(["save", "unsave", "react", "rank", "ask", "visit", "identify"]),
  listingId: z.string().max(40).optional(),
  reaction: z.enum(["like", "dislike"]).nullable().optional(),
  rank: z.number().int().min(1).max(50).nullable().optional(),
  text: z.string().max(1000).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  slot: z.enum(["morning", "afternoon", "evening"]).optional(),
  name: z.string().max(80).optional(),
  phone: z.string().max(20).optional(),
});

/** Buyer actions on property/collection pages. Identity is only required for ask & visit. */
export async function POST(req: Request) {
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return bad("invalid request");
  const b = p.data;
  const share = await getShare(b.code);
  if (!share) return bad("unknown link", 404);
  const access = await getAccess(share.agentId);
  if (!access.pagesLive) return bad("link inactive", 410);
  const ctx: ShareCtx = { code: share.code, agentId: share.agentId, listingId: share.listingId, collectionId: share.collectionId, leadId: share.leadId };
  const sid = await buyerSid();

  // listingId must belong to this link
  let listingId = share.listingId;
  if (share.collectionId) {
    const c = await db.query.collections.findFirst({ where: (c, { eq }) => eq(c.id, share.collectionId!) });
    listingId = b.listingId && c?.listingIds.includes(b.listingId) ? b.listingId : null;
  }

  if (b.action === "identify") {
    const phone = normalizePhone(b.phone);
    if (!phone) return bad("Please enter a valid mobile number");
    if (!b.name || b.name.trim().length < 2) return bad("Please enter your name");
    await identifyBuyer(sid, ctx, { name: b.name.trim(), phone });
    return json({ ok: true, lead: { name: b.name.trim() } });
  }
  if (!listingId) return bad("invalid property");

  if (b.action === "save" || b.action === "unsave") {
    await setBuyerAction(sid, ctx, listingId, { saved: b.action === "save" });
    return json({ ok: true });
  }
  if (b.action === "react") {
    await setBuyerAction(sid, ctx, listingId, { reaction: b.reaction ?? null });
    return json({ ok: true });
  }
  if (b.action === "rank") {
    await setBuyerAction(sid, ctx, listingId, { rank: b.rank ?? null });
    return json({ ok: true });
  }

  const lead = await currentLeadForSession(sid, ctx);
  if (!lead?.phone) return json({ ok: false, needIdentity: true });
  if (b.action === "ask") {
    if (!b.text?.trim()) return bad("Type your question");
    await askQuestion(sid, ctx, listingId, b.text.trim(), lead.id);
    return json({ ok: true });
  }
  if (b.action === "visit") {
    if (!b.date || !b.slot) return bad("Pick a date and time");
    await requestVisit(sid, ctx, listingId, lead.id, { date: b.date, slot: b.slot, message: b.text });
    return json({ ok: true });
  }
  return bad("unsupported");
}
