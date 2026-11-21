import type { ListingFields, PriceMode, Purpose } from "@/db/schema";

/** ₹ in Indian style: 9500000 → "₹95 L", 13500000 → "₹1.35 Cr", 25000 → "₹25,000". */
export function inr(amount: number | null | undefined, opts: { short?: boolean } = { short: true }): string {
  if (amount == null || Number.isNaN(amount)) return "";
  if (opts.short !== false) {
    if (amount >= 1e7) return `₹${trim(amount / 1e7)} Cr`;
    if (amount >= 1e5) return `₹${trim(amount / 1e5)} L`;
  }
  return `₹${amount.toLocaleString("en-IN")}`;
}
function trim(n: number) {
  return n.toFixed(2).replace(/\.?0+$/, "");
}

export function priceLabel(l: { priceMode: PriceMode; price: number | null; priceMax: number | null; purpose: Purpose }) {
  if (l.priceMode === "on_request" || l.price == null) return "Price on request";
  const suffix = l.purpose === "rent" ? " / month" : "";
  const fmt = (n: number) => (l.purpose === "rent" ? inr(n, { short: n >= 1e5 }) : inr(n));
  if (l.priceMode === "range" && l.priceMax) return `${fmt(l.price)} – ${fmt(l.priceMax)}${suffix}`;
  return `${fmt(l.price)}${suffix}`;
}

export const typeLabels = {
  flat: "Apartment",
  house: "House / Villa",
  plot: "Plot",
  commercial: "Shop / Office",
  pg: "PG / Hostel",
} as const;

export const furnishingLabels = { unfurnished: "Unfurnished", semi: "Semi-furnished", full: "Fully furnished" } as const;

export function keySpecs(type: keyof typeof typeLabels, f: ListingFields): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  if (f.bhk && type !== "plot" && type !== "commercial") out.push({ label: "Configuration", value: `${f.bhk} BHK` });
  if (f.areaSqft) out.push({ label: "Built-up", value: `${f.areaSqft.toLocaleString("en-IN")} sq ft` });
  if (f.carpetSqft) out.push({ label: "Carpet", value: `${f.carpetSqft.toLocaleString("en-IN")} sq ft` });
  if (f.plotSqyd) out.push({ label: "Plot", value: `${f.plotSqyd.toLocaleString("en-IN")} sq yd` });
  if (f.furnishing) out.push({ label: "Furnishing", value: furnishingLabels[f.furnishing] });
  if (f.floor) out.push({ label: "Floor", value: f.totalFloors ? `${f.floor} of ${f.totalFloors}` : f.floor });
  if (f.bathrooms) out.push({ label: "Bathrooms", value: String(f.bathrooms) });
  if (f.balconies) out.push({ label: "Balconies", value: String(f.balconies) });
  if (f.parking) out.push({ label: "Parking", value: f.parking });
  if (f.facing) out.push({ label: "Facing", value: f.facing });
  if (f.ageYears != null) out.push({ label: "Age", value: f.ageYears === 0 ? "New" : `${f.ageYears} yrs` });
  if (f.possession) out.push({ label: "Possession", value: f.possession });
  if (f.deposit) out.push({ label: "Deposit", value: inr(f.deposit) });
  if (f.maintenance) out.push({ label: "Maintenance", value: `${inr(f.maintenance, { short: false })}/mo` });
  return out;
}

export function timeAgo(d: Date | string | null | undefined): string {
  if (!d) return "";
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`;
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function dateLabel(d: Date | string | null | undefined, withTime = false): string {
  if (!d) return "";
  return new Date(d).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
    timeZone: "Asia/Kolkata",
  });
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** YYYY-MM-DD in IST */
export function istDate(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86400000 + 5.5 * 3600000);
  return d.toISOString().slice(0, 10);
}

/** Start/end of "today" in India (IST), as UTC Date objects. */
export function istDayRange(offsetDays = 0): { start: Date; end: Date } {
  const IST = 5.5 * 3600000;
  const nowIst = Date.now() + IST + offsetDays * 86400000;
  const startIst = nowIst - (nowIst % 86400000);
  return { start: new Date(startIst - IST), end: new Date(startIst - IST + 86400000) };
}
