import "server-only";
import { and, desc, eq, inArray, ne, sql, gte, lte, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import {
  listings,
  properties,
  shares,
  events,
  buyerActions,
  visits,
  type ListingFields,
  type ListingStatus,
  type LocationPrivacy,
  type PriceMode,
  type PropertyType,
  type Purpose,
} from "@/db/schema";
import { id, listingRef } from "@/lib/ids";
import type { Extracted } from "@/lib/ai/extract";
import type { SearchQuery } from "@/lib/ai/parse";
import { generalListingShare } from "./shares";
import { enqueue } from "./jobs";

export type ListingInput = {
  purpose: Purpose;
  type: PropertyType;
  title: string;
  description: string;
  priceMode: PriceMode;
  price: number | null;
  priceMax: number | null;
  negotiable: boolean;
  fields: ListingFields;
  locality: string | null;
  city: string | null;
  lat?: number | null;
  lng?: number | null;
  building?: string | null;
  unit?: string | null;
  showBuilding?: boolean;
  locationPrivacy: LocationPrivacy;
  youtubeUrl?: string | null;
  visibility: "private" | "network";
};

async function newRef() {
  for (let i = 0; i < 8; i++) {
    const ref = listingRef();
    const ex = await db.query.listings.findFirst({ where: eq(listings.ref, ref), columns: { id: true } });
    if (!ex) return ref;
  }
  throw new Error("ref allocation failed");
}

export async function createListing(agentId: string, input: ListingInput, opts: { aiGenerated?: boolean; missing?: string[]; status?: ListingStatus } = {}) {
  const pid = id();
  await db.insert(properties).values({
    id: pid,
    type: input.type,
    locality: input.locality,
    city: input.city,
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    building: input.building ?? null,
    unit: input.unit ?? null,
  });
  const lid = id();
  const [row] = await db
    .insert(listings)
    .values({
      id: lid,
      ref: await newRef(),
      agentId,
      propertyId: pid,
      purpose: input.purpose,
      title: input.title,
      description: input.description,
      priceMode: input.priceMode,
      price: input.price,
      priceMax: input.priceMax,
      negotiable: input.negotiable,
      fields: input.fields,
      locationPrivacy: input.locationPrivacy,
      showBuilding: input.showBuilding ?? false,
      youtubeUrl: input.youtubeUrl ?? null,
      visibility: input.visibility,
      status: opts.status ?? "draft",
      aiGenerated: !!opts.aiGenerated,
      missing: opts.missing ?? [],
    })
    .returning();
  return row;
}

export function extractedToInput(e: Extracted, extra: Partial<ListingInput> = {}): ListingInput {
  return {
    purpose: e.purpose,
    type: e.type,
    title: e.title,
    description: e.description,
    priceMode: e.priceMode,
    price: e.price,
    priceMax: e.priceMax,
    negotiable: e.negotiable,
    fields: e.fields,
    locality: e.locality,
    city: e.city,
    building: e.building,
    locationPrivacy: "area",
    visibility: "network",
    ...extra,
  };
}

export async function updateListing(agentId: string, listingId: string, input: ListingInput) {
  const l = await getOwnListing(agentId, listingId);
  if (!l) throw new Error("not found");
  await db
    .update(properties)
    .set({ type: input.type, locality: input.locality, city: input.city, lat: input.lat ?? null, lng: input.lng ?? null, building: input.building ?? null, unit: input.unit ?? null })
    .where(eq(properties.id, l.propertyId));
  const priceChanged = l.price !== input.price;
  await db
    .update(listings)
    .set({
      purpose: input.purpose,
      title: input.title,
      description: input.description,
      priceMode: input.priceMode,
      price: input.price,
      priceMax: input.priceMax,
      negotiable: input.negotiable,
      fields: input.fields,
      locationPrivacy: input.locationPrivacy,
      showBuilding: input.showBuilding ?? false,
      youtubeUrl: input.youtubeUrl ?? null,
      visibility: input.visibility,
      missing: [],
      updatedAt: new Date(),
      verifiedAt: new Date(),
    })
    .where(eq(listings.id, listingId));
  return { priceChanged };
}

export async function getOwnListing(agentId: string, listingId: string) {
  return db.query.listings.findFirst({ where: and(eq(listings.id, listingId), eq(listings.agentId, agentId)) });
}

export async function getListingByRef(agentId: string, ref: string) {
  return db.query.listings.findFirst({ where: and(eq(listings.ref, ref.toUpperCase()), eq(listings.agentId, agentId)) });
}

export async function getListingWithProperty(listingId: string) {
  const [r] = await db.select({ l: listings, p: properties }).from(listings).innerJoin(properties, eq(properties.id, listings.propertyId)).where(eq(listings.id, listingId));
  return r ?? null;
}

/** Publishing makes the listing live, creates its public link, and triggers buyer matching. */
export async function publishListing(agentId: string, listingId: string) {
  const l = await getOwnListing(agentId, listingId);
  if (!l) throw new Error("not found");
  const first = l.status === "draft";
  if (first || l.status === "archived")
    await db.update(listings).set({ status: "available", publishedAt: l.publishedAt ?? new Date(), verifiedAt: new Date(), updatedAt: new Date() }).where(eq(listings.id, listingId));
  const share = await generalListingShare(agentId, listingId);
  if (first) await enqueue("match_listing", { listingId });
  return share;
}

export async function setListingStatus(agentId: string, listingId: string, status: ListingStatus) {
  const [r] = await db
    .update(listings)
    .set({ status, updatedAt: new Date(), verifiedAt: new Date(), ...(status === "available" ? { publishedAt: sql`coalesce(${listings.publishedAt}, now())` } : {}) })
    .where(and(eq(listings.id, listingId), eq(listings.agentId, agentId)))
    .returning();
  return r;
}

export async function setListingPrice(agentId: string, listingId: string, price: number) {
  const [r] = await db
    .update(listings)
    .set({ price, priceMax: null, priceMode: "exact", updatedAt: new Date(), verifiedAt: new Date() })
    .where(and(eq(listings.id, listingId), eq(listings.agentId, agentId)))
    .returning();
  return r;
}

export async function markVerified(agentId: string, listingId: string) {
  await db.update(listings).set({ verifiedAt: new Date(), verifyAskedAt: null }).where(and(eq(listings.id, listingId), eq(listings.agentId, agentId)));
}

export async function deleteListing(agentId: string, listingId: string) {
  await db.update(listings).set({ status: "archived", updatedAt: new Date() }).where(and(eq(listings.id, listingId), eq(listings.agentId, agentId)));
}

export type ListingRow = Awaited<ReturnType<typeof agentListings>>[number];

/** All listings of an agent with engagement counters for the dashboard. */
export async function agentListings(agentId: string, opts: { status?: ListingStatus | "active" | "all"; q?: string; ids?: string[] } = {}) {
  const conds = [eq(listings.agentId, agentId)];
  if (opts.status === "active") conds.push(inArray(listings.status, ["available", "on_hold"]));
  else if (opts.status && opts.status !== "all") conds.push(eq(listings.status, opts.status));
  else conds.push(ne(listings.status, "archived"));
  if (opts.ids) conds.push(inArray(listings.id, opts.ids.length ? opts.ids : ["-"]));
  if (opts.q) {
    const q = `%${opts.q}%`;
    conds.push(or(ilike(listings.title, q), ilike(listings.ref, q), ilike(properties.locality, q))!);
  }
  const rows = await db
    .select({
      l: listings,
      p: properties,
      views: sql<number>`(select count(*) from ${events} e where e.listing_id = ${listings.id} and e.type = 'open')`,
      viewers: sql<number>`(select count(distinct e.session_id) from ${events} e where e.listing_id = ${listings.id} and e.type = 'open')`,
      saves: sql<number>`(select count(*) from ${buyerActions} b where b.listing_id = ${listings.id} and b.saved)`,
      visitCount: sql<number>`(select count(*) from ${visits} v where v.listing_id = ${listings.id})`,
      sharesCount: sql<number>`(select count(*) from ${shares} s where s.listing_id = ${listings.id} and s.lead_id is not null)`,
    })
    .from(listings)
    .innerJoin(properties, eq(properties.id, listings.propertyId))
    .where(and(...conds))
    .orderBy(desc(listings.updatedAt));
  return rows.map((r) => ({ ...r, views: Number(r.views), viewers: Number(r.viewers), saves: Number(r.saves), visitCount: Number(r.visitCount), sharesCount: Number(r.sharesCount) }));
}

/** Inventory search for the WhatsApp bot & share picker. */
export async function searchListings(agentId: string, q: SearchQuery, limit = 10) {
  const conds = [eq(listings.agentId, agentId), inArray(listings.status, ["available", "on_hold"])];
  if (q.purpose) conds.push(eq(listings.purpose, q.purpose));
  if (q.type) conds.push(eq(properties.type, q.type));
  if (q.bhk) conds.push(sql`(${listings.fields}->>'bhk')::numeric = ${q.bhk}`);
  if (q.max) conds.push(lte(listings.price, q.max));
  if (q.min) conds.push(gte(sql`coalesce(${listings.priceMax}, ${listings.price})`, q.min));
  if (q.locality) conds.push(or(ilike(properties.locality, `%${q.locality}%`), ilike(listings.title, `%${q.locality}%`))!);
  return db
    .select({ l: listings, p: properties })
    .from(listings)
    .innerJoin(properties, eq(properties.id, listings.propertyId))
    .where(and(...conds))
    .orderBy(desc(listings.updatedAt))
    .limit(limit);
}

export const isLive = (s: ListingStatus) => s === "available" || s === "on_hold";

/**
 * Agent replies to a draft with corrections in plain words ("95 lakh, Gotri, 1450 sqft").
 * Only fields actually mentioned are changed. Returns the list of updated fields.
 */
export async function applyCorrection(agentId: string, listingId: string, text: string): Promise<string[]> {
  const { parsePropertyText } = await import("@/lib/ai/parse");
  const { buildTitle } = await import("@/lib/ai/extract");
  const row = await getListingWithProperty(listingId);
  if (!row || row.l.agentId !== agentId) return [];
  const { l, p } = row;
  const x = parsePropertyText(text);
  const changed: string[] = [];
  const fields = { ...l.fields };
  const listingPatch: Partial<typeof listings.$inferInsert> = {};
  const propPatch: Partial<typeof properties.$inferInsert> = {};
  if (x.price) {
    listingPatch.price = x.price;
    listingPatch.priceMax = x.priceMax ?? null;
    listingPatch.priceMode = x.priceMax ? "range" : "exact";
    changed.push("price");
  }
  if (x.negotiable) listingPatch.negotiable = true;
  if (x.purpose && x.purpose !== l.purpose) {
    listingPatch.purpose = x.purpose;
    changed.push("purpose");
  }
  if (x.locality) {
    propPatch.locality = x.locality;
    changed.push("locality");
  }
  if (x.city) propPatch.city = x.city;
  if (x.type && x.type !== p.type && /flat|apartment|villa|house|bungalow|plot|shop|office|pg/i.test(text)) {
    propPatch.type = x.type;
    changed.push("type");
  }
  for (const k of ["bhk", "areaSqft", "carpetSqft", "plotSqyd", "furnishing", "floor", "bathrooms", "parking", "facing", "possession", "deposit"] as const) {
    if (x.fields[k] !== undefined) {
      (fields as Record<string, unknown>)[k] = x.fields[k];
      changed.push(k === "areaSqft" || k === "carpetSqft" || k === "plotSqyd" ? "area" : k);
    }
  }
  if (x.fields.amenities?.length) fields.amenities = [...new Set([...(fields.amenities ?? []), ...x.fields.amenities])];
  if (!changed.length) return [];
  const type = propPatch.type ?? p.type;
  const purpose = listingPatch.purpose ?? l.purpose;
  // Regenerate the title only if it was the auto-generated one.
  if (l.title === buildTitle(p.type, l.purpose, l.fields, p.locality)) listingPatch.title = buildTitle(type, purpose, fields, propPatch.locality ?? p.locality);
  const price = listingPatch.price ?? l.price;
  const locality = propPatch.locality ?? p.locality;
  const missing = l.missing.filter((m) => !(m === "price" && price) && !(m === "locality" && locality) && !(m === "bhk" && fields.bhk) && !(m === "area" && (fields.areaSqft || fields.carpetSqft || fields.plotSqyd)) && !(m === "furnishing" && fields.furnishing) && m !== "details");
  await db.update(listings).set({ ...listingPatch, fields, missing, updatedAt: new Date() }).where(eq(listings.id, listingId));
  if (Object.keys(propPatch).length) await db.update(properties).set(propPatch).where(eq(properties.id, p.id));
  return [...new Set(changed)];
}
