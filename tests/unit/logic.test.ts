import { describe, it, expect } from "vitest";
import { normalizePhone, maskPhone } from "@/lib/phone";
import { inr, priceLabel } from "@/lib/format";
import { computeIntent } from "@/modules/leads";
import { matchesRequirement } from "@/modules/matching";
import { computeAccess } from "@/modules/billing";
import { parseChatsyncWebhook } from "@/lib/wa/chatsync";
import { youtubeId, toPublicListing } from "@/modules/public";

describe("phone", () => {
  it("normalises Indian numbers", () => {
    expect(normalizePhone("98123 45678")).toBe("919812345678");
    expect(normalizePhone("+91-98123-45678")).toBe("919812345678");
    expect(normalizePhone("09812345678")).toBe("919812345678");
    expect(normalizePhone("12345")).toBeNull();
    expect(maskPhone("919812345678").endsWith("5678")).toBe(true);
  });
});

describe("format", () => {
  it("formats rupees Indian style", () => {
    expect(inr(9_500_000)).toBe("₹95 L");
    expect(inr(13_500_000)).toBe("₹1.35 Cr");
    expect(inr(25_000)).toBe("₹25,000");
    expect(priceLabel({ priceMode: "exact", price: 18000, priceMax: null, purpose: "rent" })).toBe("₹18,000 / month");
    expect(priceLabel({ priceMode: "range", price: 8e6, priceMax: 9e6, purpose: "sale" })).toBe("₹80 L – ₹90 L");
    expect(priceLabel({ priceMode: "on_request", price: null, priceMax: null, purpose: "sale" })).toBe("Price on request");
  });
});

describe("intent", () => {
  const zero = { opens: 0, distinctDays: 0, devices: 0, galleryViews: 0, saves: 0, questions: 0, visits: 0, likes: 0, dwellSec: 0 };
  it("is cold with no activity", () => expect(computeIntent(zero).level).toBe("cold"));
  it("explains why a lead is hot", () => {
    const i = computeIntent({ ...zero, opens: 3, distinctDays: 2, saves: 1, visits: 1 });
    expect(i.level).toBe("hot");
    expect(i.reasons.join(" ")).toMatch(/site visit/);
  });
  it("one open is just exploring", () => expect(computeIntent({ ...zero, opens: 1 }).level).toBe("exploring"));
});

describe("matching", () => {
  const l = { purpose: "sale", price: 9_500_000, priceMax: null, fields: { bhk: 3 } };
  const p = { type: "flat", locality: "Gotri" };
  it("matches budget + bhk + area", () => expect(matchesRequirement(l, p, { bhk: [3], budgetMax: 10_000_000, localities: ["gotri"] })).toBe(true));
  it("rejects over budget", () => expect(matchesRequirement(l, p, { bhk: [3], budgetMax: 7_000_000 })).toBe(false));
  it("rejects wrong area", () => expect(matchesRequirement(l, p, { bhk: [3], localities: ["Alkapuri"] })).toBe(false));
  it("needs at least 2 signals", () => expect(matchesRequirement(l, p, { bhk: [3] })).toBe(false));
  it("empty requirement never matches", () => expect(matchesRequirement(l, p, {})).toBe(false));
});

describe("billing access", () => {
  const D = 86400000;
  const now = new Date("2026-01-10T00:00:00Z");
  it("ok during trial", () => expect(computeAccess({ status: "trial", periodEnd: new Date(now.getTime() + 5 * D) }, now)).toMatchObject({ state: "ok", canUse: true, daysLeft: 5 }));
  it("grace for 7 days", () => expect(computeAccess({ status: "trial", periodEnd: new Date(now.getTime() - 3 * D) }, now)).toMatchObject({ state: "grace", canUse: true, pagesLive: true }));
  it("locked after grace, pages still live", () => expect(computeAccess({ status: "active", periodEnd: new Date(now.getTime() - 10 * D) }, now)).toMatchObject({ state: "locked", canUse: false, pagesLive: true, tracking: false }));
  it("expired after 37 days", () => expect(computeAccess({ status: "active", periodEnd: new Date(now.getTime() - 40 * D) }, now)).toMatchObject({ state: "expired", pagesLive: false }));
});

describe("chatsync webhook", () => {
  it("parses text, image and contact messages", () => {
    const body = {
      entry: [{ changes: [{ value: {
        contacts: [{ profile: { name: "Rakesh" } }],
        messages: [
          { from: "919811100001", id: "a", timestamp: "1700000000", type: "text", text: { body: "hi" } },
          { from: "919811100001", id: "b", timestamp: "1700000001", type: "image", image: { id: "MEDIA1", mime_type: "image/jpeg", caption: "kitchen" } },
          { from: "919811100001", id: "c", timestamp: "1700000002", type: "contacts", contacts: [{ name: { formatted_name: "Rahul" }, phones: [{ wa_id: "919876543210" }] }] },
        ],
      } }] }],
    };
    const m = parseChatsyncWebhook(body);
    expect(m).toHaveLength(3);
    expect(m[0]).toMatchObject({ type: "text", text: "hi", pushName: "Rakesh" });
    expect(m[1]).toMatchObject({ type: "image", text: "kitchen", mediaRef: "MEDIA1" });
    expect(m[2].contact).toEqual({ name: "Rahul", phone: "919876543210" });
  });
});

describe("public listing (Agent Promise)", () => {
  const base = {
    id: "l1", ref: "ABCDE", agentId: "a", propertyId: "p", purpose: "sale" as const, title: "T", description: "", priceMode: "exact" as const, price: 1e6, priceMax: null,
    negotiable: false, fields: {}, showBuilding: false, youtubeUrl: "https://youtu.be/dQw4w9WgXcQ", status: "available" as const, visibility: "network" as const, missing: [],
    aiGenerated: false, verifiedAt: new Date(), verifyAskedAt: null, disabledByAdmin: false, closedLeadId: null, closedAt: null, publishedAt: new Date(), createdAt: new Date(), updatedAt: new Date(),
  };
  const prop = { id: "p", type: "flat" as const, locality: "Gotri", city: "Vadodara", lat: 22.312345, lng: 73.143219, building: "Sunrise Heights", unit: "B-504", nearby: null, createdAt: new Date() };
  it("never exposes unit, hides building, fuzzes area location", () => {
    const pub = toPublicListing({ ...base, locationPrivacy: "area" }, prop, []);
    expect(JSON.stringify(pub)).not.toContain("B-504");
    expect(pub.building).toBeNull();
    expect(pub.location.lat).not.toBe(22.312345);
    expect(Math.abs(pub.location.lat! - 22.312345)).toBeLessThan(0.005);
  });
  it("hidden location has no coordinates", () => {
    const pub = toPublicListing({ ...base, locationPrivacy: "hidden" }, prop, []);
    expect(pub.location.lat).toBeNull();
  });
  it("youtube ids", () => {
    expect(youtubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=3")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("https://youtube.com/shorts/abcdefgh")).toBe("abcdefgh");
  });
});
