import { describe, expect, it } from "vitest";
import { BRAND_COLORS, parseBrandColor, whiteContrast } from "@/lib/brand-colors";

describe("brand colours", () => {
  it("every curated colour is readable with white text", () => {
    for (const [hex] of BRAND_COLORS) expect(whiteContrast(hex)).toBeGreaterThanOrEqual(4.5);
  });
  it("understands names, aliases and hex", () => {
    expect(parseBrandColor("Maroon")).toEqual({ hex: "#7a1f2b", name: "Maroon" });
    expect(parseBrandColor("dark blue")).toEqual({ hex: "#1e3a5f", name: "Navy" });
    expect(parseBrandColor("#123ABC")).toEqual({ hex: "#123abc", name: "#123abc" });
    expect(parseBrandColor("135")).toEqual({ hex: "#113355", name: "#113355" });
  });
  it("rejects light colours and nonsense", () => {
    expect(parseBrandColor("#ffee88")).toEqual({ error: "light" });
    expect(parseBrandColor("sparkly")).toEqual({ error: "unknown" });
  });
});
