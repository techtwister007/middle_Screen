import "server-only";
import { z } from "zod";
import type { ListingFields, PriceMode, PropertyType, Purpose } from "@/db/schema";
import { typeLabels, furnishingLabels, inr } from "@/lib/format";
import { aiEnabled, chatJson } from "./client";
import { parsePropertyText, type Parsed } from "./parse";

export type Extracted = {
  purpose: Purpose;
  type: PropertyType;
  title: string;
  description: string;
  price: number | null;
  priceMax: number | null;
  priceMode: PriceMode;
  negotiable: boolean;
  locality: string | null;
  city: string | null;
  building: string | null;
  fields: ListingFields;
  missing: string[];
  usedAi: boolean;
};

const optNum = z.preprocess((v) => (v === "" || v == null ? undefined : Number(String(v).replace(/,/g, ""))), z.number().positive().optional());
const optStr = z.preprocess((v) => (v == null || v === "" ? undefined : String(v)), z.string().max(200).optional());

const AiSchema = z.object({
  purpose: z.enum(["sale", "rent"]).optional().catch(undefined),
  type: z.enum(["flat", "house", "plot", "commercial", "pg"]).optional().catch(undefined),
  title: optStr,
  description: z.preprocess((v) => (v == null ? undefined : String(v)), z.string().max(2000).optional()),
  price_inr: optNum.catch(undefined),
  price_max_inr: optNum.catch(undefined),
  price_on_request: z.boolean().optional().catch(undefined),
  negotiable: z.boolean().optional().catch(undefined),
  locality: optStr.catch(undefined),
  city: optStr.catch(undefined),
  building: optStr.catch(undefined),
  bhk: optNum.catch(undefined),
  area_sqft: optNum.catch(undefined),
  carpet_sqft: optNum.catch(undefined),
  plot_sqyd: optNum.catch(undefined),
  floor: optStr.catch(undefined),
  total_floors: optNum.catch(undefined),
  furnishing: z.enum(["unfurnished", "semi", "full"]).optional().catch(undefined),
  bathrooms: optNum.catch(undefined),
  balconies: optNum.catch(undefined),
  parking: optStr.catch(undefined),
  facing: optStr.catch(undefined),
  possession: optStr.catch(undefined),
  deposit_inr: optNum.catch(undefined),
  maintenance_inr: optNum.catch(undefined),
  amenities: z.array(z.string().max(40)).max(25).optional().catch(undefined),
});

const SYSTEM = `You convert an Indian real estate broker's rough WhatsApp notes (English, Hindi, Gujarati or Hinglish, may contain typos and shorthand) into a structured property listing.
Rules:
- Extract ONLY facts explicitly stated. NEVER invent or assume features, sizes, amenities, furnishing or prices. If unknown, omit the key.
- Prices in whole rupees: "95 lakh"/"95L" = 9500000, "1.35 cr" = 13500000, "25k" = 25000. Rent is per month.
- type: flat (apartment/BHK/penthouse), house (villa/bungalow/tenament/duplex), plot (land), commercial (shop/office/showroom/godown), pg.
- furnishing: unfurnished | semi | full.
- title: short, professional, in English, max 70 chars, e.g. "Spacious 3 BHK Apartment for Sale in Gotri".
- description: 2 short paragraphs in polished English (60-120 words total), based ONLY on stated facts. No phone numbers, no owner names, no exact unit/flat numbers, no emojis, no exaggeration.
- building: society/building name only if stated (kept private).
Return a single JSON object with any of these keys: purpose, type, title, description, price_inr, price_max_inr, price_on_request, negotiable, locality, city, building, bhk, area_sqft, carpet_sqft, plot_sqyd, floor, total_floors, furnishing, bathrooms, balconies, parking, facing, possession, deposit_inr, maintenance_inr, amenities.`;

/** Turns the broker's raw text (+ voice transcript) into a reviewed-ready listing draft. */
export async function extractListing(rawText: string, opts: { city?: string | null } = {}): Promise<Extracted> {
  const rule = parsePropertyText(rawText);
  let ai: z.infer<typeof AiSchema> | null = null;
  if (aiEnabled() && rawText.trim()) {
    try {
      ai = AiSchema.parse(await chatJson(SYSTEM, rawText.slice(0, 6000)));
    } catch (e) {
      console.error("[ai] extraction failed, falling back to rules", e);
    }
  }
  return merge(rule, ai, rawText, opts.city ?? null);
}

function merge(rule: Parsed, ai: z.infer<typeof AiSchema> | null, raw: string, defaultCity: string | null): Extracted {
  const fields: ListingFields = { ...rule.fields };
  if (ai) {
    const set = <K extends keyof ListingFields>(k: K, v: ListingFields[K] | undefined) => {
      if (v !== undefined && v !== null) fields[k] = v;
    };
    set("bhk", ai.bhk);
    set("areaSqft", ai.area_sqft);
    set("carpetSqft", ai.carpet_sqft);
    set("plotSqyd", ai.plot_sqyd);
    set("floor", ai.floor);
    set("totalFloors", ai.total_floors);
    set("furnishing", ai.furnishing);
    set("bathrooms", ai.bathrooms);
    set("balconies", ai.balconies);
    set("parking", ai.parking);
    set("facing", ai.facing);
    set("possession", ai.possession);
    set("deposit", ai.deposit_inr);
    set("maintenance", ai.maintenance_inr);
    if (ai.amenities?.length) fields.amenities = [...new Set([...(fields.amenities ?? []), ...ai.amenities])];
  }
  const type: PropertyType = ai?.type ?? rule.type ?? "flat";
  const purpose: Purpose = ai?.purpose ?? rule.purpose ?? "sale";
  let price = ai?.price_inr ?? rule.price ?? null;
  let priceMax = ai?.price_max_inr ?? rule.priceMax ?? null;
  // Sanity: reject absurd values (likely mis-parsed areas/phone numbers)
  if (price && (price < 1000 || price > 5e10)) price = null;
  if (priceMax && (!price || priceMax <= price)) priceMax = null;
  let priceMode: PriceMode = priceMax ? "range" : "exact";
  if (ai?.price_on_request || rule.priceMode === "on_request" || !price) priceMode = price ? priceMode : "on_request";
  const locality = ai?.locality ?? rule.locality ?? null;
  const city = ai?.city ?? rule.city ?? defaultCity;

  const title = (ai?.title?.trim() || buildTitle(type, purpose, fields, locality)).slice(0, 90);
  const description = ai?.description?.trim() || buildDescription(type, purpose, fields, locality, city, price);

  const missing: string[] = [];
  if (!price) missing.push("price");
  if (!locality) missing.push("locality");
  if ((type === "flat" || type === "house") && !fields.bhk) missing.push("bhk");
  if (type !== "pg" && !fields.areaSqft && !fields.carpetSqft && !fields.plotSqyd) missing.push("area");
  if ((type === "flat" || type === "house") && !fields.furnishing) missing.push("furnishing");
  if (!raw.trim()) missing.push("details");

  return {
    purpose,
    type,
    title,
    description,
    price,
    priceMax,
    priceMode,
    negotiable: ai?.negotiable ?? rule.negotiable ?? false,
    locality,
    city,
    building: ai?.building ?? null,
    fields,
    missing,
    usedAi: !!ai,
  };
}

export function buildTitle(type: PropertyType, purpose: Purpose, f: ListingFields, locality: string | null) {
  const what = f.bhk && (type === "flat" || type === "house") ? `${f.bhk} BHK ${typeLabels[type]}` : typeLabels[type];
  return `${what} for ${purpose === "rent" ? "Rent" : "Sale"}${locality ? ` in ${locality}` : ""}`;
}

function buildDescription(type: PropertyType, purpose: Purpose, f: ListingFields, locality: string | null, city: string | null, price: number | null) {
  const where = [locality, city].filter(Boolean).join(", ");
  const parts: string[] = [];
  const size = f.areaSqft ? `${f.areaSqft.toLocaleString("en-IN")} sq ft` : f.carpetSqft ? `${f.carpetSqft.toLocaleString("en-IN")} sq ft carpet` : f.plotSqyd ? `${f.plotSqyd} sq yd` : "";
  const cfg = f.bhk && type !== "plot" && type !== "commercial" ? `${f.bhk} BHK ` : "";
  parts.push(
    `A ${f.furnishing ? furnishingLabels[f.furnishing].toLowerCase() + " " : ""}${cfg}${typeLabels[type].toLowerCase()}${size ? ` of ${size}` : ""} available for ${purpose === "rent" ? "rent" : "sale"}${where ? ` in ${where}` : ""}.`,
  );
  const extra: string[] = [];
  if (f.floor) extra.push(`located on the ${f.floor} floor`);
  if (f.facing) extra.push(`${f.facing.toLowerCase()} facing`);
  if (f.possession) extra.push(f.possession.toLowerCase());
  if (extra.length) parts.push(`The property is ${extra.join(", ")}.`);
  if (f.amenities?.length) parts.push(`Features include ${f.amenities.slice(0, 6).join(", ").toLowerCase()}.`);
  if (price) parts.push(`Asking ${purpose === "rent" ? "rent" : "price"}: ${inr(price)}${purpose === "rent" ? " per month" : ""}.`);
  parts.push("Contact us to know more or to schedule a site visit.");
  return parts.join(" ");
}
