import { describe, expect, it } from "vitest";
import { DICT, translate } from "@/lib/i18n/buyer";

const holes = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(",");

describe("buyer translations", () => {
  it("every entry has Hindi and Gujarati with the same placeholders", () => {
    for (const [en, [hi, gu]] of Object.entries(DICT)) {
      expect(hi.trim(), en).not.toBe("");
      expect(gu.trim(), en).not.toBe("");
      expect(holes(hi), `hi: ${en}`).toBe(holes(en));
      expect(holes(gu), `gu: ${en}`).toBe(holes(en));
    }
  });
  it("fills placeholders and falls back to English", () => {
    expect(translate("hi", "Send to {name}", { name: "Rakesh" })).toBe("Rakesh को भेजें");
    expect(translate("gu", "Book site visit")).toBe("સાઇટ વિઝિટ બુક કરો");
    expect(translate("gu", "Some new text")).toBe("Some new text");
    expect(translate("en", "{n} min", { n: 5 })).toBe("5 min");
  });
});
