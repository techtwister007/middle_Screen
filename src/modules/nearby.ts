import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { properties } from "@/db/schema";
import { env } from "@/config/env";
import { bearingDeg, haversineKm, pickNearby, type Nearby, type NearbyCat, type NearbyPlace } from "@/lib/geo";

/**
 * Neighbourhood data from OpenStreetMap (via Photon). Computed once per property in a background job and cached
 * on the property, so buyer pages never call a map service. Attribution: © OpenStreetMap contributors.
 */

type PhotonFeature = { geometry: { coordinates: [number, number] }; properties: Record<string, string | undefined> };

const QUERIES: Record<NearbyCat, [string, string][]> = {
  school: [["school", "amenity:school"], ["college", "amenity:college"]],
  health: [["hospital", "amenity:hospital"], ["clinic", "amenity:clinic"]],
  daily: [["supermarket", "shop:supermarket"], ["mall", "shop:mall"], ["grocery", "shop:convenience"]],
  park: [["park", "leisure:park"], ["garden", "leisure:garden"]],
  transport: [["bus stop", "highway:bus_stop"], ["railway station", "railway:station"], ["bus station", "amenity:bus_station"]],
};
const MAX_KM: Record<NearbyCat, number> = { school: 3, health: 3, daily: 3, park: 3, transport: 10 };

async function photon(params: Record<string, string>): Promise<PhotonFeature[]> {
  if (env.NEARBY_PROVIDER === "off") return [];
  const url = `${env.PHOTON_URL.replace(/\/$/, "")}/api/?${new URLSearchParams(params)}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": "PropPulse/1.0 (property pages)" } });
    if (!r.ok) return [];
    const j = (await r.json()) as { features?: PhotonFeature[] };
    return j.features ?? [];
  } catch {
    return [];
  } finally {
    clearTimeout(t);
  }
}

const label = (p: Record<string, string | undefined>) => [p.name, p.district ?? p.locality ?? p.street, p.city].filter(Boolean);

/** Free-text place search for buyers ("my office"), biased to the property's area. */
export async function searchPlaces(q: string, near?: { lat: number; lng: number }) {
  const feats = await photon({ q, limit: "6", lang: "en", ...(near ? { lat: String(near.lat), lon: String(near.lng) } : {}) });
  return feats
    .filter((f) => f.properties.countrycode === "IN" || !f.properties.countrycode)
    .map((f) => {
      const [name, ...rest] = label(f.properties);
      return { name: name ?? q, sub: rest.join(", "), lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] };
    })
    .slice(0, 5);
}

/** Centre of a locality ("Gotri, Vadodara") when the agent hasn't dropped a map pin. */
export async function geocodeLocality(locality: string, city?: string | null) {
  const feats = await photon({ q: [locality, city].filter(Boolean).join(", "), limit: "1", lang: "en" });
  const f = feats[0];
  return f ? { lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] } : null;
}

export async function fetchNearby(lat: number, lng: number): Promise<NearbyPlace[]> {
  const all: NearbyPlace[] = [];
  for (const cat of Object.keys(QUERIES) as NearbyCat[]) {
    for (const [q, tag] of QUERIES[cat]) {
      const feats = await photon({ q, lat: String(lat), lon: String(lng), osm_tag: tag, limit: "25", lang: "en" });
      for (const f of feats) {
        const [plng, plat] = f.geometry.coordinates;
        const km = haversineKm(lat, lng, plat, plng);
        const name = f.properties.name?.trim();
        if (!name || km > MAX_KM[cat]) continue;
        all.push({ name, cat, km: Math.round(km * 100) / 100, bearing: bearingDeg(lat, lng, plat, plng), lat: plat, lng: plng });
      }
      await new Promise((r) => setTimeout(r, 150)); // be polite to the free service
    }
  }
  return pickNearby(all);
}

/** Background job: make sure the property has a point (pin or locality centre) and fresh nearby places. */
export async function computeNearby(propertyId: string, force = false) {
  if (env.NEARBY_PROVIDER === "off") return null;
  const [p] = await db.select().from(properties).where(eq(properties.id, propertyId));
  if (!p) return null;
  let { lat, lng } = p;
  if ((lat == null || lng == null) && p.locality) {
    const g = await geocodeLocality(p.locality, p.city);
    if (g) {
      ({ lat, lng } = g);
      await db.update(properties).set({ lat, lng }).where(eq(properties.id, p.id));
    }
  }
  if (lat == null || lng == null) return null;
  const cur = p.nearby;
  const fresh = cur && Math.abs(cur.lat - lat) < 1e-5 && Math.abs(cur.lng - lng) < 1e-5 && Date.now() - new Date(cur.at).getTime() < 30 * 86400000;
  if (fresh && !force) return cur;
  const places = await fetchNearby(lat, lng);
  if (!places.length && cur) return cur; // keep old data if the service is down
  const nearby: Nearby = { at: new Date().toISOString(), source: "OpenStreetMap", lat, lng, places };
  await db.update(properties).set({ nearby }).where(eq(properties.id, p.id));
  return nearby;
}
