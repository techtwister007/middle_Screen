/** Pure geo helpers for the neighbourhood section (no I/O; unit-tested). */

export type NearbyCat = "school" | "health" | "daily" | "park" | "transport";
export const NEARBY_CATS: NearbyCat[] = ["school", "health", "daily", "park", "transport"];
export const NEARBY_LABELS: Record<NearbyCat, string> = { school: "Schools", health: "Hospitals", daily: "Daily needs", park: "Parks", transport: "Transport" };
export const NEARBY_SINGULAR: Record<NearbyCat, string> = { school: "School", health: "Hospital", daily: "Grocery & shops", park: "Park", transport: "Transport" };

export type NearbyPlace = { name: string; cat: NearbyCat; km: number; bearing: number; lat: number; lng: number };
/** Stored on the property (computed once in the background, refreshed when the pin moves). */
export type Nearby = { at: string; source: string; lat: number; lng: number; places: NearbyPlace[] };
/** What a buyer page receives: no coordinates, distances rounded for "area only" listings. */
export type PublicNearby = { approx: boolean; counts: Record<NearbyCat, number>; places: { name: string; cat: NearbyCat; km: number; bearing: number; drive: number; walk: number | null }[] };

const R = 6371;
const rad = (d: number) => (d * Math.PI) / 180;

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Compass bearing from A to B in degrees (0 = north, 90 = east). */
export function bearingDeg(lat1: number, lng1: number, lat2: number, lng2: number) {
  const y = Math.sin(rad(lng2 - lng1)) * Math.cos(rad(lat2));
  const x = Math.cos(rad(lat1)) * Math.sin(rad(lat2)) - Math.sin(rad(lat1)) * Math.cos(rad(lat2)) * Math.cos(rad(lng2 - lng1));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Typical city drive time without traffic: road distance ≈ 1.35× straight line at ~22 km/h, min 2 min. */
export const driveMin = (km: number) => Math.max(2, Math.round(((km * 1.35) / 22) * 60));
/** Two-wheeler is a little quicker in Indian city traffic. */
export const bikeMin = (km: number) => Math.max(2, Math.round(((km * 1.3) / 26) * 60));
/** Walking at 4.8 km/h on a ~1.25× road path; null when it's not a sensible walk (> 2.5 km). */
export const walkMin = (km: number) => (km > 2.5 ? null : Math.max(1, Math.round(((km * 1.25) / 4.8) * 60)));

/** Rounds a km value for display: 0.1 km precision when exact, 0.5 km steps (min 0.5) for "area only". */
export function roundKm(km: number, approx: boolean) {
  if (approx) return Math.max(0.5, Math.round(km * 2) / 2);
  return km < 10 ? Math.round(km * 10) / 10 : Math.round(km);
}

export function publicNearby(n: Nearby | null | undefined, mode: "exact" | "area" | "hidden"): PublicNearby | null {
  if (!n || mode === "hidden" || !n.places.length) return null;
  const approx = mode === "area";
  const counts = Object.fromEntries(NEARBY_CATS.map((c) => [c, n.places.filter((p) => p.cat === c && p.km <= 2).length])) as Record<NearbyCat, number>;
  const places = [...n.places]
    .sort((a, b) => a.km - b.km)
    .slice(0, 30)
    .map((p) => ({
      name: p.name,
      cat: p.cat,
      km: roundKm(p.km, approx),
      // quantised to 8 directions on area-only listings so distances + bearings can't pinpoint the building
      bearing: approx ? (Math.round(p.bearing / 45) * 45) % 360 : Math.round(p.bearing),
      drive: driveMin(p.km),
      walk: walkMin(p.km),
    }));
  return { approx, counts, places };
}

/** Keeps the nearest few places per category and drops duplicates (same name within 150 m). */
export function pickNearby(all: NearbyPlace[], perCat = 8): NearbyPlace[] {
  const out: NearbyPlace[] = [];
  for (const c of NEARBY_CATS) {
    const seen: NearbyPlace[] = [];
    for (const p of all.filter((x) => x.cat === c).sort((a, b) => a.km - b.km)) {
      if (seen.some((s) => s.name.toLowerCase() === p.name.toLowerCase() && haversineKm(s.lat, s.lng, p.lat, p.lng) < 0.15)) continue;
      seen.push(p);
      if (seen.length >= perCat) break;
    }
    out.push(...seen);
  }
  return out;
}
