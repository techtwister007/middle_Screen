import "server-only";
import { and, eq, inArray, notInArray } from "drizzle-orm";
import { db } from "@/db";
import { leads, listings, properties, type Requirement } from "@/db/schema";
import { notifyAgent } from "./notify";

type L = { purpose: string; price: number | null; priceMax: number | null; fields: { bhk?: number } };
type P = { type: string; locality: string | null };

/** Rule-based: does this listing fit this saved buyer requirement? */
export function matchesRequirement(l: L, p: P, r: Requirement): boolean {
  if (!r || Object.keys(r).length === 0) return false;
  let signals = 0;
  if (r.purpose) {
    if (r.purpose !== l.purpose) return false;
    signals++;
  }
  if (r.type) {
    if (r.type !== p.type) return false;
    signals++;
  }
  if (r.bhk?.length) {
    if (!l.fields.bhk || !r.bhk.includes(Math.floor(l.fields.bhk))) return false;
    signals++;
  }
  if (r.budgetMax || r.budgetMin) {
    if (l.price == null) return false;
    const lo = l.price;
    const hi = l.priceMax ?? l.price;
    if (r.budgetMax && lo > r.budgetMax * 1.1) return false; // 10% stretch
    if (r.budgetMin && hi < r.budgetMin * 0.8) return false;
    signals++;
  }
  if (r.localities?.length) {
    const loc = (p.locality ?? "").toLowerCase();
    if (!loc || !r.localities.some((x) => loc.includes(x.toLowerCase().trim()) || x.toLowerCase().includes(loc))) return false;
    signals++;
  }
  return signals >= 2;
}

export async function matchingLeadsForListing(listingId: string) {
  const [row] = await db.select({ l: listings, p: properties }).from(listings).innerJoin(properties, eq(properties.id, listings.propertyId)).where(eq(listings.id, listingId));
  if (!row) return [];
  const candidates = await db
    .select()
    .from(leads)
    .where(and(eq(leads.agentId, row.l.agentId), notInArray(leads.stage, ["closed", "lost"])));
  return candidates.filter((c) => matchesRequirement(row.l, row.p, c.requirement));
}

export async function matchingListingsForLead(agentId: string, leadId: string) {
  const lead = await db.query.leads.findFirst({ where: and(eq(leads.id, leadId), eq(leads.agentId, agentId)) });
  if (!lead) return [];
  const rows = await db
    .select({ l: listings, p: properties })
    .from(listings)
    .innerJoin(properties, eq(properties.id, listings.propertyId))
    .where(and(eq(listings.agentId, agentId), inArray(listings.status, ["available", "on_hold"])));
  return rows.filter((r) => matchesRequirement(r.l, r.p, lead.requirement));
}

/** Job: after publishing, tell the agent which of their buyers match. */
export async function notifyMatchesForListing(listingId: string) {
  const matches = await matchingLeadsForListing(listingId);
  if (!matches.length) return;
  const l = await db.query.listings.findFirst({ where: eq(listings.id, listingId) });
  if (!l) return;
  const names = matches.slice(0, 3).map((m) => m.name || "a buyer").join(", ");
  await notifyAgent(l.agentId, {
    kind: "match",
    title: `${matches.length} buyer${matches.length > 1 ? "s" : ""} match your new property`,
    body: `${l.title} — ${names}${matches.length > 3 ? "…" : ""}. Share it with them in one tap.`,
    href: `/app/properties/${listingId}?matches=1`,
    important: true,
  });
}
