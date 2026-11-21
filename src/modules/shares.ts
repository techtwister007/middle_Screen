import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { appUrl } from "@/config/env";
import { db } from "@/db";
import { shares } from "@/db/schema";
import { shareCode } from "@/lib/ids";

export const listingUrl = (code: string) => `${appUrl}/p/${code}`;
export const collectionUrl = (code: string) => `${appUrl}/c/${code}`;
export const shareUrl = (s: { code: string; collectionId: string | null }) => (s.collectionId ? collectionUrl(s.code) : listingUrl(s.code));

async function insertShare(v: { agentId: string; listingId?: string | null; collectionId?: string | null; leadId?: string | null; channel?: string }) {
  for (let i = 0; i < 5; i++) {
    const code = shareCode();
    const [row] = await db
      .insert(shares)
      .values({ code, agentId: v.agentId, listingId: v.listingId ?? null, collectionId: v.collectionId ?? null, leadId: v.leadId ?? null, channel: v.channel ?? "whatsapp" })
      .onConflictDoNothing()
      .returning();
    if (row) return row;
  }
  throw new Error("could not allocate share code");
}

/** The public, non-personal link of a listing (one per listing). */
export async function generalListingShare(agentId: string, listingId: string) {
  const ex = await db.query.shares.findFirst({ where: and(eq(shares.listingId, listingId), isNull(shares.leadId), eq(shares.channel, "general")) });
  return ex ?? insertShare({ agentId, listingId, channel: "general" });
}

/** Personal link for one lead; reused if the agent shares the same thing to the same lead again. */
export async function leadShare(agentId: string, target: { listingId?: string; collectionId?: string }, leadId: string) {
  const where = target.listingId
    ? and(eq(shares.listingId, target.listingId), eq(shares.leadId, leadId))
    : and(eq(shares.collectionId, target.collectionId!), eq(shares.leadId, leadId));
  const ex = await db.query.shares.findFirst({ where });
  return ex ?? insertShare({ agentId, ...target, leadId });
}

export async function generalCollectionShare(agentId: string, collectionId: string) {
  const ex = await db.query.shares.findFirst({ where: and(eq(shares.collectionId, collectionId), isNull(shares.leadId)) });
  return ex ?? insertShare({ agentId, collectionId, channel: "general" });
}

export async function getShare(code: string) {
  return db.query.shares.findFirst({ where: eq(shares.code, code) });
}
