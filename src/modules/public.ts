import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { env } from "@/config/env";
import { db } from "@/db";
import { agents, listings, properties, media as mediaT } from "@/db/schema";
import { keySpecs, priceLabel, typeLabels } from "@/lib/format";
import { agentDisplayName } from "./agents";
import { mediaForListings } from "./media";

/**
 * Everything a buyer may see. This is the ONLY shape passed to buyer-facing pages,
 * enforcing the Agent Promise (no owner details / unit numbers / exact location unless allowed).
 */
export type PublicListing = {
  id: string;
  ref: string;
  title: string;
  description: string;
  purpose: "sale" | "rent";
  type: keyof typeof typeLabels;
  typeLabel: string;
  status: string;
  price: string;
  priceValue: number | null;
  negotiable: boolean;
  specs: { label: string; value: string }[];
  amenities: string[];
  bhk: number | null;
  area: string | null;
  locality: string | null;
  city: string | null;
  building: string | null;
  location: { mode: "exact" | "area" | "hidden"; lat: number | null; lng: number | null };
  images: { id: string; lg: string; md: string; sm: string; w: number | null; h: number | null }[];
  videos: { id: string; url: string; mime: string | null }[];
  docs: { id: string; url: string; name: string }[];
  perSqft: string | null;
  emi: string | null;
  youtubeId: string | null;
  stale: boolean;
  updatedAt: string;
};

export type PublicAgent = {
  id: string;
  name: string;
  displayName: string;
  company: string | null;
  phone: string;
  handle: string;
  photoUrl: string | null;
  logoUrl: string | null;
  tagline: string | null;
  city: string | null;
  areas: string | null;
  brandColor: string;
  welcomeMode: "none" | "minimal" | "splash";
};

export function youtubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{6,})/);
  return m?.[1] ?? null;
}

/** Monthly EMI for a loan (principal, annual rate %, years). Indicative only. */
export function emi(principal: number, ratePct: number, years: number) {
  const r = ratePct / 1200;
  const n = years * 12;
  return (principal * r * (1 + r) ** n) / ((1 + r) ** n - 1);
}

/** Round coordinates to ~500 m so "area only" never reveals the exact building. */
const fuzz = (n: number) => Math.round(n * 200) / 200;

export function toPublicListing(l: typeof listings.$inferSelect, p: typeof properties.$inferSelect, ms: (typeof mediaT.$inferSelect)[]): PublicListing {
  const f = l.fields ?? {};
  const loc = l.locationPrivacy;
  const area = f.areaSqft ? `${f.areaSqft.toLocaleString("en-IN")} sq ft` : f.carpetSqft ? `${f.carpetSqft.toLocaleString("en-IN")} sq ft` : f.plotSqyd ? `${f.plotSqyd} sq yd` : null;
  return {
    id: l.id,
    ref: l.ref,
    title: l.title,
    description: l.description,
    purpose: l.purpose,
    type: p.type,
    typeLabel: typeLabels[p.type],
    status: l.status,
    price: priceLabel(l),
    priceValue: l.price,
    negotiable: l.negotiable,
    specs: keySpecs(p.type, f),
    amenities: f.amenities ?? [],
    bhk: f.bhk ?? null,
    area,
    locality: p.locality,
    city: p.city,
    building: l.showBuilding ? p.building : null, // unit number is NEVER exposed
    location: {
      mode: loc,
      lat: loc === "hidden" || p.lat == null ? null : loc === "area" ? fuzz(p.lat) : p.lat,
      lng: loc === "hidden" || p.lng == null ? null : loc === "area" ? fuzz(p.lng) : p.lng,
    },
    images: ms.filter((m) => m.kind === "image").map((m) => ({ id: m.id, lg: m.url, md: m.urlMd ?? m.url, sm: m.urlSm ?? m.url, w: m.width, h: m.height })),
    videos: ms.filter((m) => m.kind === "video").map((m) => ({ id: m.id, url: m.url, mime: m.mime })),
    docs: ms.filter((m) => m.kind === "doc").map((m, i) => ({ id: m.id, url: m.url, name: m.hash || (i === 0 ? "Floor plan / brochure" : `Document ${i + 1}`) })),
    perSqft: l.purpose === "sale" && l.price && l.priceMode !== "on_request" && (f.areaSqft || f.carpetSqft) ? `₹${Math.round(l.price / (f.areaSqft || f.carpetSqft)!).toLocaleString("en-IN")} / sq ft` : null,
    emi: l.purpose === "sale" && l.price && l.priceMode !== "on_request" && l.price >= 1e6 ? `₹${Math.round(emi(l.price * 0.8, 8.5, 20)).toLocaleString("en-IN")}/month` : null,
    youtubeId: youtubeId(l.youtubeUrl),
    stale: Date.now() - new Date(l.verifiedAt).getTime() > (env.LISTING_VERIFY_DAYS + 7) * 86400000,
    updatedAt: new Date(l.updatedAt).toISOString(),
  };
}

export function toPublicAgent(a: typeof agents.$inferSelect): PublicAgent {
  return {
    id: a.id,
    name: a.name,
    displayName: agentDisplayName(a),
    company: a.company,
    phone: a.phone,
    handle: a.handle,
    photoUrl: a.photoUrl,
    logoUrl: a.logoUrl,
    tagline: a.tagline,
    city: a.city,
    areas: a.areas,
    brandColor: a.brandColor,
    welcomeMode: a.welcomeMode,
  };
}

export async function loadPublicListings(ids: string[]) {
  if (!ids.length) return [];
  const rows = await db.select({ l: listings, p: properties }).from(listings).innerJoin(properties, eq(properties.id, listings.propertyId)).where(inArray(listings.id, ids));
  const ms = await mediaForListings(ids);
  const byId = new Map(rows.map((r) => [r.l.id, r]));
  return ids
    .map((i) => byId.get(i))
    .filter((r): r is NonNullable<typeof r> => !!r && !r.l.disabledByAdmin && r.l.status !== "draft" && r.l.status !== "archived")
    .map((r) => toPublicListing(r.l, r.p, ms.filter((m) => m.listingId === r.l.id)));
}

export async function agentPublicListings(agentId: string) {
  const rows = await db
    .select({ id: listings.id })
    .from(listings)
    .where(and(eq(listings.agentId, agentId), inArray(listings.status, ["available", "on_hold"]), eq(listings.visibility, "network"), eq(listings.disabledByAdmin, false)));
  return loadPublicListings(rows.map((r) => r.id));
}
