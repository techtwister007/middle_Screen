/**
 * Rule-based property text parser.
 * Works with zero AI cost and is the fallback when no AI key is configured.
 * Also used to parse bot search queries like "2bhk gotri under 60L".
 * Handles common English / Hinglish broker shorthand.
 */
import type { ListingFields, PriceMode, PropertyType, Purpose } from "@/db/schema";

export type Parsed = {
  purpose?: Purpose;
  type?: PropertyType;
  price?: number;
  priceMax?: number;
  priceMode?: PriceMode;
  negotiable?: boolean;
  locality?: string;
  city?: string;
  fields: ListingFields;
};

export const CITIES = [
  "Vadodara", "Baroda", "Ahmedabad", "Surat", "Rajkot", "Gandhinagar", "Anand", "Bharuch", "Navsari", "Valsad", "Vapi", "Jamnagar", "Bhavnagar",
  "Mumbai", "Thane", "Navi Mumbai", "Pune", "Nashik", "Nagpur", "Delhi", "New Delhi", "Noida", "Gurgaon", "Gurugram", "Ghaziabad", "Faridabad",
  "Bangalore", "Bengaluru", "Hyderabad", "Chennai", "Kolkata", "Jaipur", "Indore", "Bhopal", "Lucknow", "Kanpur", "Chandigarh", "Mohali",
  "Kochi", "Coimbatore", "Goa", "Udaipur", "Jodhpur", "Patna", "Ranchi", "Raipur", "Bhubaneswar", "Visakhapatnam", "Vijayawada", "Mysore",
];

const AMENITIES: [RegExp, string][] = [
  [/\blift|elevator/i, "Lift"],
  [/\bgym|gymnasium/i, "Gym"],
  [/swimming|\bpool\b/i, "Swimming pool"],
  [/club\s?house/i, "Club house"],
  [/garden|landscap/i, "Garden"],
  [/\bsecurity|guard/i, "24×7 security"],
  [/power\s?back\s?up|generator|\bdg\b/i, "Power backup"],
  [/cctv/i, "CCTV"],
  [/gated/i, "Gated community"],
  [/play\s?area|kids/i, "Children's play area"],
  [/temple/i, "Temple"],
  [/intercom/i, "Intercom"],
  [/water\s?supply|borewell|24.?hr water/i, "24×7 water"],
  [/\bgas\s?line|piped gas|png\b/i, "Piped gas"],
  [/jogging|walking track/i, "Jogging track"],
  [/modular kitchen/i, "Modular kitchen"],
  [/wardrobe/i, "Wardrobes"],
  [/\bac\b|air.?condition/i, "Air conditioning"],
];

const num = (s: string) => Number(s.replace(/,/g, ""));

/** Parses an amount with unit: "95 lakh", "1.35cr", "60L", "25k", "25,000" → rupees */
export function parseAmount(raw: string, unitHint?: string): number | null {
  const m = raw.trim().match(/^([\d.,]+)\s*([a-z]*)/i);
  if (!m) return null;
  const n = num(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  const u = (m[2] || unitHint || "").toLowerCase();
  if (/^(cr|crore|crores|c)$/.test(u)) return Math.round(n * 1e7);
  if (/^(l|lac|lacs|lakh|lakhs|lk|lkh)$/.test(u)) return Math.round(n * 1e5);
  if (/^(k|thousand|hazar|hajar)$/.test(u)) return Math.round(n * 1e3);
  return Math.round(n);
}

const UNIT = "(?:cr|crore|crores|l|lac|lacs|lakh|lakhs|lk|k|thousand)";
const AMOUNT = `(?:rs\\.?|inr|₹)?\\s*([\\d.,]+)\\s*(${UNIT})?\\b`;

export function parsePropertyText(input: string): Parsed {
  const text = " " + input.replace(/\s+/g, " ").trim() + " ";
  const t = text.toLowerCase();
  const out: Parsed = { fields: {} };
  const f = out.fields;

  // Purpose
  if (/\b(rent|rental|lease|on rent|per month|\/month|p\.?m\.?|kiraye|kiraya|bhada|bhadu|tenant)\b/.test(t)) out.purpose = "rent";
  else if (/\b(sale|sell|resale|buy|for sale)\b/.test(t)) out.purpose = "sale";

  // Type
  if (/\b(pg|paying guest|hostel)\b/.test(t)) out.type = "pg";
  else if (/\b(plot|land|na plot|open plot|zameen|jamin)\b/.test(t) && !/\bbhk\b/.test(t)) out.type = "plot";
  else if (/\b(shop|office|showroom|commercial|godown|warehouse)\b/.test(t)) out.type = "commercial";
  else if (/\b(villa|bungalow|bunglow|house|duplex|tenament|tenement|row ?house|independent)\b/.test(t)) out.type = "house";
  else if (/\b(flat|apartment|apt|bhk|rk|penthouse)\b/.test(t)) out.type = "flat";

  // BHK
  const bhk = t.match(/(\d(?:\.5)?)\s*-?\s*(?:bhk|bed ?rooms?|bedroom|br\b|b\.h\.k)/);
  if (bhk) f.bhk = Number(bhk[1]);
  else if (/\b1\s*rk\b/.test(t)) f.bhk = 1;

  // Area
  const sqft = [...t.matchAll(/(carpet|super|built ?up|saleable|sbua)?\s*(?:area)?\s*(?:of)?\s*:?\s*([\d,]{3,6})\s*(?:\+\s*)?(sq\.?\s*ft\.?|sqft|sft|square ?feet|sq ?feet|sq\.? ?f|ft2)/g)];
  for (const m of sqft) {
    const v = num(m[2]);
    if (m[1]?.startsWith("carpet")) f.carpetSqft ??= v;
    else f.areaSqft ??= v;
  }
  const yd = t.match(/([\d,]{2,6})\s*(sq\.?\s*yd|sq\.?\s*yards?|sqyd|yards|gaj|vaar|var)\b/);
  if (yd) f.plotSqyd = num(yd[1]);

  // Price (prefer amounts with units, ignore numbers that are areas/bhk)
  const range = t.match(new RegExp(`${AMOUNT}\\s*(?:-|to|–)\\s*${AMOUNT}`, "i"));
  const rentish = out.purpose === "rent";
  if (range && (range[2] || range[4])) {
    const unit = range[4] || range[2];
    const a = parseAmount(range[1], unit);
    const b = parseAmount(range[3], unit);
    if (a && b && b > a) {
      out.price = a;
      out.priceMax = b;
      out.priceMode = "range";
    }
  }
  if (!out.price) {
    const priceCtx = t.match(new RegExp(`(?:price|rate|asking|cost|rent|budget|@|final|only|demand|expected)\\s*:?\\s*${AMOUNT}`, "i"));
    const withUnit = [...t.matchAll(new RegExp(AMOUNT, "gi"))].find((m) => !!m[2]);
    const rupee = t.match(/(?:rs\.?|inr|₹)\s*([\d,]{4,})/);
    const pick = priceCtx?.[2] ? priceCtx : withUnit ?? (rupee ? [rupee[0], rupee[1], undefined] : priceCtx);
    if (pick) {
      const v = parseAmount(pick[1] as string, pick[2] as string | undefined);
      // Bare numbers below 1000 without unit are almost never prices.
      if (v && (pick[2] || v >= 1000)) {
        out.price = v;
        out.priceMode = "exact";
      }
    }
  }
  if (/price on request|on request|call for price|\bpor\b/.test(t)) out.priceMode = "on_request";
  if (/negotiable|\bnego\b|slightly nego/.test(t)) out.negotiable = true;
  if (rentish) {
    const dep = t.match(new RegExp(`deposit\\s*:?\\s*${AMOUNT}`, "i"));
    if (dep) f.deposit = parseAmount(dep[1], dep[2]) ?? undefined;
    if (f.deposit && out.price === f.deposit) out.price = undefined;
  }
  const maint = t.match(new RegExp(`maintenance\\s*:?\\s*${AMOUNT}`, "i"));
  if (maint) f.maintenance = parseAmount(maint[1], maint[2]) ?? undefined;
  if (f.maintenance && out.price === f.maintenance) out.price = undefined;

  // Furnishing
  if (/semi[\s-]?furnish/.test(t)) f.furnishing = "semi";
  else if (/un[\s-]?furnish|non[\s-]?furnish|bare shell/.test(t)) f.furnishing = "unfurnished";
  else if (/(fully[\s-]?)?furnish/.test(t)) f.furnishing = "full";

  // Floor
  const floor = t.match(/(\d{1,2})(?:st|nd|rd|th)?\s*floor(?:\s*(?:of|\/|out of)\s*(\d{1,2}))?/);
  if (floor) {
    f.floor = ordinal(Number(floor[1]));
    if (floor[2]) f.totalFloors = Number(floor[2]);
  } else if (/ground floor/.test(t)) f.floor = "Ground";
  const totalFl = t.match(/(?:g\s*\+\s*(\d{1,2}))|(\d{1,2})\s*storey/);
  if (totalFl && !f.totalFloors) f.totalFloors = Number(totalFl[1] ?? totalFl[2]) + (totalFl[1] ? 1 : 0);

  const bath = t.match(/(\d)\s*(?:bath|bathrooms?|toilets?|washrooms?)/);
  if (bath) f.bathrooms = Number(bath[1]);
  const balc = t.match(/(\d)\s*balcon/);
  if (balc) f.balconies = Number(balc[1]);
  if (/covered parking/.test(t)) f.parking = "Covered";
  else if (/(\d)\s*(car )?parking/.test(t)) f.parking = `${t.match(/(\d)\s*(?:car )?parking/)![1]} car`;
  else if (/parking/.test(t)) f.parking = "Available";
  const facing = t.match(/\b(east|west|north|south|north[- ]east|north[- ]west|south[- ]east|south[- ]west)[- ]facing/);
  if (facing) f.facing = cap(facing[1]);
  if (/ready (to|for) move|ready possession|rtm\b/.test(t)) f.possession = "Ready to move";
  else if (/under construction/.test(t)) f.possession = "Under construction";
  const age = t.match(/(\d{1,2})\s*(?:yrs?|years?)\s*old/);
  if (age) f.ageYears = Number(age[1]);
  else if (/brand new|new construction|\bnew\b flat/.test(t)) f.ageYears = 0;

  const amenities = AMENITIES.filter(([re]) => re.test(t)).map(([, n]) => n);
  if (amenities.length) f.amenities = amenities;

  // City & locality
  const city = CITIES.find((c) => new RegExp(`\\b${c.toLowerCase()}\\b`).test(t));
  if (city) out.city = city === "Baroda" ? "Vadodara" : city === "Gurgaon" ? "Gurugram" : city;
  const loc = extractLocality(text, out.city);
  if (loc) out.locality = loc;

  return out;
}

const STOP = new Set([
  "sale", "rent", "the", "a", "an", "good", "prime", "posh", "main", "road", "area", "location", "society", "near", "with", "and", "for",
  "ready", "move", "price", "only", "under", "below", "above", "budget", "lakh", "lakhs", "crore", "cr", "furnished", "semi", "unfurnished",
  "flat", "flats", "apartment", "bhk", "plot", "house", "villa", "shop", "office", "sq", "ft", "sqft",
]);

function extractLocality(text: string, city?: string): string | undefined {
  const cityRe = city ? new RegExp(`,?\\s*\\b(${city}|baroda|gurgaon)\\b`, "i") : null;
  // "in Gotri", "at Alkapuri", "@ Vasna", "near Akota"
  const m = text.match(/\b(?:in|at|near|@|location:?|area:?|loc:?)\s+([A-Za-z][A-Za-z.\- ]{2,40}?)(?=[,.;:\n|]|\s+(?:\d|₹|(?:for|with|on|rs|inr|price|budget|under|below|above|ready|fully|semi|un|furnished|vadodara|baroda|ahmedabad|surat|rajkot|mumbai|pune)\b)|\s*$)/i);
  let cand = m?.[1]?.trim();
  if (!cand && city) {
    // "Gotri Vadodara" → word(s) right before the city
    const b = text.match(new RegExp(`([A-Za-z][A-Za-z.\\-]{2,20}(?:\\s[A-Za-z][A-Za-z.\\-]{2,20})?)\\s*,?\\s*${city}`, "i"));
    cand = b?.[1]?.trim();
  }
  if (!cand) {
    // search queries: "2bhk gotri under 60L" → first non-stop word that isn't numeric
    const words = text.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);
    const w = words.find((x) => x.length > 2 && !STOP.has(x) && !/bhk|sq|lac|lakh/.test(x) && !CITIES.some((c) => c.toLowerCase() === x));
    if (w && words.length <= 8) cand = w;
  }
  if (!cand) return undefined;
  if (cityRe) cand = cand.replace(cityRe, "").trim();
  const words = cand.split(/\s+/).filter((w) => !STOP.has(w.toLowerCase()));
  if (!words.length) return undefined;
  return words.slice(0, 3).map(cap).join(" ");
}

function cap(s: string) {
  return s.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}
function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/* ---------------- Search queries (bot) ---------------- */

export type SearchQuery = {
  purpose?: Purpose;
  type?: PropertyType;
  bhk?: number;
  min?: number;
  max?: number;
  locality?: string;
};

export function parseSearchQuery(q: string): SearchQuery {
  const t = q.toLowerCase();
  const p = parsePropertyText(q);
  const out: SearchQuery = { purpose: p.purpose, type: p.type === "flat" && !/flat|apartment/.test(t) ? undefined : p.type, bhk: p.fields.bhk, locality: p.locality };
  const under = t.match(new RegExp(`(?:under|below|upto|up to|within|max|<)\\s*${AMOUNT}`, "i"));
  const above = t.match(new RegExp(`(?:above|over|min|from|>)\\s*${AMOUNT}`, "i"));
  if (under) out.max = parseAmount(under[1], under[2]) ?? undefined;
  if (above) out.min = parseAmount(above[1], above[2]) ?? undefined;
  if (!under && !above && p.price) {
    if (p.priceMax) {
      out.min = p.price;
      out.max = p.priceMax;
    } else out.max = Math.round(p.price * 1.1);
  }
  return out;
}
