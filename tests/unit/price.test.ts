import { describe, expect, it } from "vitest";
import { priceDropFields } from "@/lib/price";

describe("priceDropFields", () => {
  it("remembers the old price on a cut", () => {
    const r = priceDropFields({ price: 9_500_000, prevPrice: null }, 9_000_000);
    expect(r.prevPrice).toBe(9_500_000);
    expect(r.priceDroppedAt).toBeInstanceOf(Date);
  });
  it("keeps the original price across several cuts", () => {
    expect(priceDropFields({ price: 9_000_000, prevPrice: 9_500_000 }, 8_800_000).prevPrice).toBe(9_500_000);
  });
  it("clears when the price goes back up to the old one", () => {
    expect(priceDropFields({ price: 9_000_000, prevPrice: 9_500_000 }, 9_500_000)).toEqual({ prevPrice: null, priceDroppedAt: null });
  });
  it("changes nothing on a small rise that stays below the old price", () => {
    expect(priceDropFields({ price: 9_000_000, prevPrice: 9_500_000 }, 9_200_000)).toEqual({});
  });
});
