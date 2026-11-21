import { describe, it, expect } from "vitest";
import { parsePropertyText, parseSearchQuery, parseAmount } from "@/lib/ai/parse";

describe("parseAmount", () => {
  it("handles Indian units", () => {
    expect(parseAmount("95", "lakh")).toBe(9_500_000);
    expect(parseAmount("1.35", "cr")).toBe(13_500_000);
    expect(parseAmount("25k")).toBe(25_000);
    expect(parseAmount("25,000")).toBe(25_000);
  });
});

describe("parsePropertyText", () => {
  it("parses a typical sale message", () => {
    const p = parsePropertyText("3 BHK flat in Gotri, Vadodara. 1450 sq ft, fully furnished, lift, parking. Price 95 lakh negotiable");
    expect(p.type).toBe("flat");
    expect(p.purpose ?? "sale").toBe("sale");
    expect(p.fields.bhk).toBe(3);
    expect(p.fields.areaSqft).toBe(1450);
    expect(p.fields.furnishing).toBe("full");
    expect(p.price).toBe(9_500_000);
    expect(p.negotiable).toBe(true);
    expect(p.city).toBe("Vadodara");
    expect(p.locality).toBe("Gotri");
    expect(p.fields.amenities).toContain("Lift");
  });
  it("parses rent with deposit", () => {
    const p = parsePropertyText("2bhk semi furnished on rent at Alkapuri 18k per month deposit 50k");
    expect(p.purpose).toBe("rent");
    expect(p.fields.bhk).toBe(2);
    expect(p.fields.furnishing).toBe("semi");
    expect(p.price).toBe(18_000);
    expect(p.fields.deposit).toBe(50_000);
    expect(p.locality).toBe("Alkapuri");
  });
  it("parses crore and plot", () => {
    const p = parsePropertyText("NA plot 300 sq yd near Bhayli, 1.2 cr");
    expect(p.type).toBe("plot");
    expect(p.fields.plotSqyd).toBe(300);
    expect(p.price).toBe(12_000_000);
    expect(p.locality).toBe("Bhayli");
  });
  it("parses ranges", () => {
    const p = parsePropertyText("4 bhk villa Vasna 1.8 - 2 cr");
    expect(p.type).toBe("house");
    expect(p.price).toBe(18_000_000);
    expect(p.priceMax).toBe(20_000_000);
  });
  it("hinglish shorthand", () => {
    const p = parsePropertyText("3 BHK ekdum ready to move, 1.35 Cr final, Satellite Ahmedabad, 1750 sqft");
    expect(p.price).toBe(13_500_000);
    expect(p.fields.possession).toBe("Ready to move");
    expect(p.city).toBe("Ahmedabad");
    expect(p.locality).toBe("Satellite");
  });
});

describe("parseSearchQuery", () => {
  it("parses bot search", () => {
    expect(parseSearchQuery("2bhk gotri under 60L")).toMatchObject({ bhk: 2, locality: "Gotri", max: 6_000_000 });
    expect(parseSearchQuery("rent 3 bhk alkapuri below 25k")).toMatchObject({ purpose: "rent", bhk: 3, max: 25_000, locality: "Alkapuri" });
  });
});
