import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { appUrl, env } from "@/config/env";
import { db } from "@/db";
import { agents, buyerActions, events, listings, media, properties, questions, shares, visits } from "@/db/schema";
import { priceLabel } from "@/lib/format";
import { toPublicAgent } from "./public";

/** Stateless signed token: the listing id plus an HMAC, so the owner needs no login and can't guess other listings. */
const sig = (listingId: string) => createHmac("sha256", env.SESSION_SECRET).update(`owner:${listingId}`).digest("base64url").slice(0, 22);
export const ownerToken = (listingId: string) => `${listingId}.${sig(listingId)}`;
export const ownerReportUrl = (listingId: string) => `${appUrl}/o/${ownerToken(listingId)}`;

export function verifyOwnerToken(token: string): string | null {
  const [id, s] = token.split(".");
  if (!id || !s) return null;
  const want = Buffer.from(sig(id)), got = Buffer.from(s);
  return want.length === got.length && timingSafeEqual(want, got) ? id : null;
}

export async function loadOwnerReport(token: string) {
  const id = verifyOwnerToken(token);
  if (!id) return null;
  const [row] = await db.select({ l: listings, p: properties, a: agents }).from(listings).innerJoin(properties, eq(properties.id, listings.propertyId)).innerJoin(agents, eq(agents.id, listings.agentId)).where(eq(listings.id, id));
  if (!row || row.l.status === "archived" || row.l.status === "draft") return null;
  const { l, p, a } = row;
  const since = new Date(Date.now() - 13 * 86400000);
  since.setHours(0, 0, 0, 0);

  const [[tot], perDay, buyers, [saved], [asked], vs, [shared], [cover]] = await Promise.all([
    db.select({
      views: sql<number>`count(*) filter (where ${events.type} = 'open')::int`,
      people: sql<number>`count(distinct coalesce(${events.leadId}, ${events.sessionId})) filter (where ${events.type} = 'open')::int`,
      calls: sql<number>`count(*) filter (where ${events.type} in ('call','whatsapp'))::int`,
    }).from(events).where(eq(events.listingId, id)),
    db.select({ d: sql<string>`to_char(${events.createdAt} at time zone 'Asia/Kolkata', 'YYYY-MM-DD')`, n: sql<number>`count(*)::int` })
      .from(events).where(and(eq(events.listingId, id), eq(events.type, "open"), gte(events.createdAt, since))).groupBy(sql`1`),
    db.select({
      opens: sql<number>`count(*) filter (where ${events.type} = 'open')::int`,
      photos: sql<boolean>`bool_or(${events.type} = 'gallery')`,
      visit: sql<boolean>`bool_or(${events.type} = 'visit_request')`,
      saved: sql<boolean>`bool_or(${events.type} = 'save')`,
      last: sql<Date>`max(${events.createdAt})`,
    }).from(events).where(and(eq(events.listingId, id), sql`${events.leadId} is not null`)).groupBy(events.leadId).orderBy(desc(sql`max(${events.createdAt})`)).limit(12),
    db.select({ n: sql<number>`count(*) filter (where ${buyerActions.saved})::int` }).from(buyerActions).where(eq(buyerActions.listingId, id)),
    db.select({ n: sql<number>`count(*)::int` }).from(questions).where(eq(questions.listingId, id)),
    db.select({ status: visits.status, date: visits.requestedDate, at: visits.scheduledAt, outcome: visits.outcome }).from(visits).where(and(eq(visits.listingId, id), inArray(visits.status, ["requested", "confirmed", "rescheduled", "completed"]))).orderBy(desc(visits.createdAt)).limit(10),
    db.select({ n: sql<number>`count(distinct ${shares.leadId})::int` }).from(shares).where(eq(shares.listingId, id)),
    db.select().from(media).where(and(eq(media.listingId, id), eq(media.kind, "image"))).orderBy(media.position).limit(1),
  ]);

  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(since.getTime() + i * 86400000 + 6 * 3600000);
    const key = d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    return { key, label: d.toLocaleDateString("en-IN", { day: "numeric", timeZone: "Asia/Kolkata" }), n: perDay.find((x) => x.d === key)?.n ?? 0 };
  });
  return {
    agent: toPublicAgent(a),
    title: l.title,
    place: [p.locality, p.city].filter(Boolean).join(", "),
    price: priceLabel(l),
    status: l.status,
    listedAt: l.publishedAt ?? l.createdAt,
    cover: cover ? cover.urlMd ?? cover.url : null,
    totals: { views: tot?.views ?? 0, people: tot?.people ?? 0, contacts: tot?.calls ?? 0, saved: saved?.n ?? 0, questions: asked?.n ?? 0, shared: shared?.n ?? 0 },
    days,
    buyers: buyers.map((b, i) => ({ label: `Buyer ${i + 1}`, ...b })),
    visits: vs,
  };
}
export type OwnerReport = NonNullable<Awaited<ReturnType<typeof loadOwnerReport>>>;
