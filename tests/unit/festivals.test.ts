import { describe, expect, it } from "vitest";
import { upcomingFestivals, FESTIVALS } from "@/lib/festivals";

describe("upcomingFestivals", () => {
  it("puts the nearest festival first", () => {
    const l = upcomingFestivals(new Date("2026-11-01T10:00:00+05:30"));
    expect(l[0].id).toBe("dhanteras");
    expect(l[0].days).toBe(5);
    expect(l[1].id).toBe("diwali");
  });
  it("keeps a festival on its day and just after", () => {
    expect(upcomingFestivals(new Date("2026-11-09T10:00:00+05:30"))[0].id).toBe("diwali");
  });
  it("puts the undated thank-you card last", () => {
    expect(upcomingFestivals(new Date("2026-06-01T10:00:00+05:30")).at(-1)!.id).toBe("thank-you");
  });
  it("has unique ids", () => {
    expect(new Set(FESTIVALS.map((f) => f.id)).size).toBe(FESTIVALS.length);
  });
});
