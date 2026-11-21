import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { buyerSessions, events, leads, listings, shares, type EventType } from "@/db/schema";
import { getAccess } from "./billing";
import { notifyAgent } from "./notify";
import { refreshLeadIntent } from "./leads";

export type ShareCtx = {
  code: string;
  agentId: string;
  listingId: string | null;
  collectionId: string | null;
  leadId: string | null;
};

/** Buyer sessions are per agent: the same browser viewing two agents' links is two unrelated sessions. */
export const sessionKey = (cookieSid: string, agentId: string) => `${cookieSid}:${agentId}`;

export async function ensureBuyerSession(cookieSid: string, share: ShareCtx, device?: string) {
  const sid = sessionKey(cookieSid, share.agentId);
  const [row] = await db
    .insert(buyerSessions)
    .values({ id: sid, agentId: share.agentId, leadId: share.leadId, firstShareCode: share.code, device })
    .onConflictDoUpdate({
      target: buyerSessions.id,
      // A personal link "claims" an anonymous session; never overwrite an existing identification.
      set: { lastSeenAt: new Date(), leadId: sql`coalesce(${buyerSessions.leadId}, ${share.leadId})` },
    })
    .returning();
  return row;
}

/** Lead the activity is attributed to: the personal link's lead, else the identified session's lead. */
export async function resolveLead(cookieSid: string | undefined, share: ShareCtx): Promise<string | null> {
  if (share.leadId) return share.leadId;
  if (!cookieSid) return null;
  const s = await db.query.buyerSessions.findFirst({ where: eq(buyerSessions.id, sessionKey(cookieSid, share.agentId)), columns: { leadId: true } });
  return s?.leadId ?? null;
}

const IMPORTANT_FIRST_OPEN = true;

export async function recordEvent(cookieSid: string, share: ShareCtx, type: EventType, meta: Record<string, unknown> = {}, opts: { listingId?: string | null; device?: string } = {}) {
  const access = await getAccess(share.agentId);
  if (!access.tracking) return { tracked: false };
  const session = await ensureBuyerSession(cookieSid, share, opts.device);
  const leadId = share.leadId ?? session.leadId ?? null;
  const listingId = opts.listingId ?? share.listingId;
  await db.insert(events).values({ type, agentId: share.agentId, shareCode: share.code, listingId, collectionId: share.collectionId, leadId, sessionId: session.id, meta });

  if (type === "open") {
    const [s] = await db
      .update(shares)
      .set({ opens: sql`${shares.opens} + 1`, firstOpenedAt: sql`coalesce(${shares.firstOpenedAt}, now())`, lastOpenedAt: new Date() })
      .where(eq(shares.code, share.code))
      .returning();
    if (leadId) {
      const lead = await db.query.leads.findFirst({ where: eq(leads.id, leadId) });
      const before = lead?.intentScore ?? 0;
      const intent = await refreshLeadIntent(leadId);
      const title = listingId ? (await db.query.listings.findFirst({ where: eq(listings.id, listingId), columns: { title: true } }))?.title : "your shortlist";
      if (s?.opens === 1 && IMPORTANT_FIRST_OPEN) {
        await notifyAgent(share.agentId, {
          kind: "open",
          title: `${lead?.name || "Your buyer"} opened ${share.collectionId ? "your shortlist" : "your property"}`,
          body: title ?? "",
          href: `/app/leads/${leadId}`,
          important: true,
        });
      } else if (before < 45 && intent.score >= 45) {
        await notifyAgent(share.agentId, { kind: "hot", title: `🔥 ${lead?.name || "A buyer"} is a hot lead`, body: intent.reasons.slice(0, 3).join(" · "), href: `/app/leads/${leadId}`, important: true });
      }
    } else if (s?.opens === 1) {
      await notifyAgent(share.agentId, { kind: "open", title: "Someone opened your property link", body: "Anonymous viewer", href: listingId ? `/app/properties/${listingId}` : undefined });
    }
  } else if (leadId && (type === "gallery" || type === "video" || type === "dwell")) {
    // cheap events: refresh lead's last activity only
    await db.update(leads).set({ lastActivityAt: new Date() }).where(and(eq(leads.id, leadId)));
  }
  return { tracked: true, leadId, sessionId: session.id };
}
