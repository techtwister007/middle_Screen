import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { collections, listings, leads } from "@/db/schema";
import { id } from "@/lib/ids";

export async function createCollection(agentId: string, v: { title: string; listingIds: string[]; leadId?: string | null; note?: string | null }) {
  const own = v.listingIds.length ? await db.select({ id: listings.id }).from(listings).where(and(eq(listings.agentId, agentId), inArray(listings.id, v.listingIds))) : [];
  const ownSet = new Set(own.map((o) => o.id));
  const ids = v.listingIds.filter((x) => ownSet.has(x)).slice(0, 20);
  if (!ids.length) throw new Error("Pick at least one property");
  const [c] = await db.insert(collections).values({ id: id(), agentId, title: v.title.slice(0, 120), listingIds: ids, leadId: v.leadId ?? null, note: v.note ?? null }).returning();
  return c;
}

export async function updateCollection(agentId: string, cid: string, patch: { title?: string; listingIds?: string[]; note?: string | null }) {
  await db.update(collections).set(patch).where(and(eq(collections.id, cid), eq(collections.agentId, agentId)));
}

export async function getOwnCollection(agentId: string, cid: string) {
  return db.query.collections.findFirst({ where: and(eq(collections.id, cid), eq(collections.agentId, agentId)) });
}

export async function agentCollections(agentId: string) {
  return db.select({ c: collections, lead: leads }).from(collections).leftJoin(leads, eq(leads.id, collections.leadId)).where(eq(collections.agentId, agentId)).orderBy(desc(collections.createdAt));
}

export async function deleteCollection(agentId: string, cid: string) {
  await db.delete(collections).where(and(eq(collections.id, cid), eq(collections.agentId, agentId)));
}
