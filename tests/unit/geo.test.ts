import { describe, expect, it } from "vitest";
import { bearingDeg, driveMin, haversineKm, pickNearby, publicNearby, roundKm, walkMin, type Nearby } from "@/lib/geo";

describe("geo helpers", () => {
  it("haversine distance is right for a known pair (Gotri → Alkapuri ≈ 4.6 km)", () => {
    const d = haversineKm(22.3159, 73.1364, 22.3109, 73.1808);
    expect(d).toBeGreaterThan(4.4);
    expect(d).toBeLessThan(4.8);
  });
  it("bearing: due east is ~90°, due north is ~0°", () => {
    expect(Math.round(bearingDeg(22, 73, 22, 73.1))).toBe(90);
    expect(Math.round(bearingDeg(22, 73, 22.1, 73))).toBe(0);
  });
  it("travel times are sensible and walking stops being offered past 2.5 km", () => {
    expect(driveMin(0.2)).toBe(2);
    expect(driveMin(5)).toBeGreaterThan(15);
    expect(walkMin(0.8)).toBe(13);
    expect(walkMin(3)).toBeNull();
  });
  it("rounds distances to 0.5 km steps for area-only listings", () => {
    expect(roundKm(0.12, true)).toBe(0.5);
    expect(roundKm(1.26, true)).toBe(1.5);
    expect(roundKm(1.26, false)).toBe(1.3);
  });
  const n: Nearby = {
    at: new Date().toISOString(), source: "OpenStreetMap", lat: 22.3, lng: 73.1,
    places: [
      { name: "Navrachana School", cat: "school", km: 0.83, bearing: 33, lat: 22.307, lng: 73.105 },
      { name: "City Hospital", cat: "health", km: 2.6, bearing: 200, lat: 22.28, lng: 73.09 },
    ],
  };
  it("public data never includes coordinates and quantises bearing on area-only", () => {
    const p = publicNearby(n, "area")!;
    expect(JSON.stringify(p)).not.toContain("22.307");
    expect(p.places[0]).toMatchObject({ km: 1, bearing: 45 });
    expect(p.counts.school).toBe(1);
    expect(p.counts.health).toBe(0); // only within 2 km are counted
    expect(publicNearby(n, "hidden")).toBeNull();
  });
  it("pickNearby drops duplicates of the same place", () => {
    const dup = pickNearby([...n.places, { ...n.places[0], lat: 22.3071 }]);
    expect(dup.filter((p) => p.cat === "school")).toHaveLength(1);
  });
});
