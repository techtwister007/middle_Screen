import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { agents, collections, leads } from "@/db/schema";
import { getShare } from "./shares";
import { getAccess } from "./billing";
import { buyerActionsFor, buyerVisitFor, currentLeadForSession } from "./buyer";
import { toPublicAgent } from "./public";
import type { ShareCtx } from "./tracking";

export const BUYER_COOKIE = "pp_sid";

/** Resolves a short code into everything a buyer page needs (or a reason it can't be shown). */
export const resolveBuyerPage = cache(resolveBuyerPageUncached);

async function resolveBuyerPageUncached(code: string) {
  const share = await getShare(code);
  if (!share) return { kind: "missing" as const };
  const agent = await db.query.agents.findFirst({ where: eq(agents.id, share.agentId) });
  if (!agent) return { kind: "missing" as const };
  const access = await getAccess(agent.id);
  const pubAgent = toPublicAgent(agent);
  if (agent.disabled || !access.pagesLive) return { kind: "unavailable" as const, agent: pubAgent };
  const ctx: ShareCtx = { code: share.code, agentId: share.agentId, listingId: share.listingId, collectionId: share.collectionId, leadId: share.leadId };
  const sid = (await cookies()).get(BUYER_COOKIE)?.value;
  const lead = await currentLeadForSession(sid, ctx);
  const personalLead = share.leadId ? await db.query.leads.findFirst({ where: eq(leads.id, share.leadId) }) : null;
  const actions = await buyerActionsFor(sid, agent.id);
  const collection = share.collectionId ? await db.query.collections.findFirst({ where: eq(collections.id, share.collectionId) }) : null;
  return {
    kind: "ok" as const,
    share,
    ctx,
    agent: pubAgent,
    lead,
    greetingName: personalLead?.name || null,
    identified: !!lead?.phone,
    actions,
    collection,
    // Show splash only on the first visit of this session (sid cookie not yet set)
    showSplash: agent.welcomeMode === "splash" && !sid,
    visitFor: (listingId: string) => buyerVisitFor(lead?.id, listingId),
  };
}
