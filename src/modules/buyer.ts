import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { buyerActions, buyerSessions, questions, visits, leads, listings, buyerSessions as bs } from "@/db/schema";
import { id } from "@/lib/ids";
import { notifyAgent } from "./notify";
import { findOrCreateLead, refreshLeadIntent } from "./leads";
import { ensureBuyerSession, recordEvent, sessionKey, type ShareCtx } from "./tracking";

/** Attach an identity (name + phone) to the current buyer session for this agent. */
export async function identifyBuyer(cookieSid: string, share: ShareCtx, v: { name?: string; phone: string; verified?: boolean }) {
  await ensureBuyerSession(cookieSid, share);
  const sid = sessionKey(cookieSid, share.agentId);
  let leadId = share.leadId;
  if (leadId) {
    // Personal link: enrich the known lead (phone may differ if forwarded — then create a new lead).
    const lead = await db.query.leads.findFirst({ where: eq(leads.id, leadId) });
    if (lead && lead.phone && lead.phone !== v.phone) leadId = null;
    else if (lead) {
      await db
        .update(leads)
        .set({ phone: v.phone, name: lead.name || v.name || "", phoneVerified: lead.phoneVerified || !!v.verified })
        .where(eq(leads.id, lead.id));
    }
  }
  if (!leadId) {
    const lead = await findOrCreateLead(share.agentId, { name: v.name, phone: v.phone, source: "page", verified: v.verified });
    leadId = lead.id;
    const isNew = Date.now() - new Date(lead.createdAt).getTime() < 5000;
    if (isNew)
      await notifyAgent(share.agentId, { kind: "new_lead", title: `New buyer: ${v.name || v.phone}`, body: "Identified from your property link", href: `/app/leads/${leadId}`, important: true });
  }
  await db.update(bs).set({ leadId }).where(eq(bs.id, sid));
  // Attribute this session's earlier anonymous activity & actions to the lead.
  await db.execute(sql`update events set lead_id = ${leadId} where session_id = ${sid} and lead_id is null`);
  await db.update(buyerActions).set({ leadId }).where(eq(buyerActions.sessionId, sid));
  await refreshLeadIntent(leadId);
  return leadId;
}

export async function currentLeadForSession(cookieSid: string | undefined, share: ShareCtx) {
  if (share.leadId) return db.query.leads.findFirst({ where: eq(leads.id, share.leadId) });
  if (!cookieSid) return null;
  const s = await db.query.buyerSessions.findFirst({ where: eq(buyerSessions.id, sessionKey(cookieSid, share.agentId)) });
  return s?.leadId ? db.query.leads.findFirst({ where: eq(leads.id, s.leadId) }) : null;
}

export async function setBuyerAction(
  cookieSid: string,
  share: ShareCtx,
  listingId: string,
  patch: { saved?: boolean; reaction?: "like" | "dislike" | null; rank?: number | null },
) {
  const session = await ensureBuyerSession(cookieSid, share);
  const leadId = share.leadId ?? session.leadId;
  await db
    .insert(buyerActions)
    .values({ sessionId: session.id, listingId, agentId: share.agentId, leadId, saved: !!patch.saved, reaction: patch.reaction ?? null, rank: patch.rank ?? null })
    .onConflictDoUpdate({ target: [buyerActions.sessionId, buyerActions.listingId], set: { ...patch, leadId, updatedAt: new Date() } });
  const type = patch.saved !== undefined ? (patch.saved ? "save" : "unsave") : patch.reaction !== undefined ? "react" : "rank";
  await recordEvent(cookieSid, share, type, patch as Record<string, unknown>, { listingId });
  if (leadId) {
    const before = (await db.query.leads.findFirst({ where: eq(leads.id, leadId), columns: { intentScore: true, name: true } }))!;
    const intent = await refreshLeadIntent(leadId);
    if (patch.saved) {
      const l = await db.query.listings.findFirst({ where: eq(listings.id, listingId), columns: { title: true } });
      await notifyAgent(share.agentId, { kind: "save", title: `${before.name || "Your buyer"} saved a property ♥`, body: l?.title ?? "", href: `/app/leads/${leadId}`, important: true });
    } else if (before.intentScore < 45 && intent.score >= 45) {
      await notifyAgent(share.agentId, { kind: "hot", title: `🔥 ${before.name || "A buyer"} is a hot lead`, body: intent.reasons.slice(0, 3).join(" · "), href: `/app/leads/${leadId}`, important: true });
    }
  }
}

export async function buyerActionsFor(cookieSid: string | undefined, agentId: string) {
  if (!cookieSid) return [];
  return db.select().from(buyerActions).where(and(eq(buyerActions.sessionId, sessionKey(cookieSid, agentId))));
}

export async function askQuestion(cookieSid: string, share: ShareCtx, listingId: string | null, text: string, leadId: string) {
  await db.insert(questions).values({ id: id(), agentId: share.agentId, leadId, listingId, text: text.slice(0, 1000) });
  await recordEvent(cookieSid, share, "ask", { text: text.slice(0, 200) }, { listingId });
  const lead = await db.query.leads.findFirst({ where: eq(leads.id, leadId) });
  await refreshLeadIntent(leadId);
  await notifyAgent(share.agentId, { kind: "question", title: `${lead?.name || "A buyer"} asked a question`, body: `“${text.slice(0, 120)}”`, href: `/app/leads/${leadId}`, important: true });
}

export async function requestVisit(
  cookieSid: string,
  share: ShareCtx,
  listingId: string,
  leadId: string,
  v: { date: string; slot: "morning" | "afternoon" | "evening"; message?: string },
) {
  const vid = id();
  await db.insert(visits).values({ id: vid, agentId: share.agentId, leadId, listingId, requestedDate: v.date, requestedSlot: v.slot, message: v.message?.slice(0, 500) });
  await recordEvent(cookieSid, share, "visit_request", { date: v.date, slot: v.slot }, { listingId });
  await db.update(leads).set({ stage: "visit" }).where(and(eq(leads.id, leadId), sql`${leads.stage} in ('new','exploring','interested')`));
  await refreshLeadIntent(leadId);
  const lead = await db.query.leads.findFirst({ where: eq(leads.id, leadId) });
  const l = await db.query.listings.findFirst({ where: eq(listings.id, listingId), columns: { title: true } });
  await notifyAgent(share.agentId, {
    kind: "visit",
    title: `📅 ${lead?.name || "A buyer"} wants a site visit`,
    body: `${l?.title ?? ""} · ${v.date} ${v.slot}. Tap to confirm.`,
    href: `/app/visits?highlight=${vid}`,
    important: true,
  });
  return vid;
}
