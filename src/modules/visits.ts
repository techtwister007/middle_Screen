import "server-only";
import { and, asc, desc, eq, gte, inArray, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { visits, leads, listings, type VisitStatus } from "@/db/schema";
import { notifyAgent } from "./notify";

export async function agentVisits(agentId: string, scope: "upcoming" | "requests" | "past" | "all" = "all") {
  const conds = [eq(visits.agentId, agentId)];
  if (scope === "requests") conds.push(eq(visits.status, "requested"));
  if (scope === "upcoming") conds.push(inArray(visits.status, ["confirmed", "rescheduled"]), gte(visits.scheduledAt, new Date(Date.now() - 3 * 3600000)));
  if (scope === "past") conds.push(inArray(visits.status, ["completed", "declined", "cancelled", "no_show"]));
  return db
    .select({ v: visits, lead: leads, listing: listings })
    .from(visits)
    .leftJoin(leads, eq(leads.id, visits.leadId))
    .leftJoin(listings, eq(listings.id, visits.listingId))
    .where(and(...conds))
    .orderBy(scope === "past" ? desc(visits.createdAt) : asc(sql`coalesce(${visits.scheduledAt}, ${visits.createdAt})`))
    .limit(200);
}

export async function todaysVisits(agentId: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 86400000);
  return db
    .select({ v: visits, lead: leads, listing: listings })
    .from(visits)
    .leftJoin(leads, eq(leads.id, visits.leadId))
    .leftJoin(listings, eq(listings.id, visits.listingId))
    .where(and(eq(visits.agentId, agentId), inArray(visits.status, ["confirmed", "rescheduled"]), gte(visits.scheduledAt, start), lt(visits.scheduledAt, end)))
    .orderBy(asc(visits.scheduledAt));
}

export async function updateVisit(agentId: string, visitId: string, patch: { status?: VisitStatus; scheduledAt?: Date | null; remindedAt?: Date | null; outcome?: "liked" | "not_liked" | "negotiating" | null; feedback?: string | null }) {
  const [v] = await db.update(visits).set(patch).where(and(eq(visits.id, visitId), eq(visits.agentId, agentId))).returning();
  if (!v) throw new Error("not found");
  if (v.leadId && patch.outcome) {
    const stage = patch.outcome === "negotiating" ? "negotiating" : patch.outcome === "liked" ? "interested" : undefined;
    if (stage) await db.update(leads).set({ stage }).where(eq(leads.id, v.leadId));
  }
  return v;
}

export const slotHour = { morning: 10, afternoon: 14, evening: 17 } as const;

/** Default confirmation time from the buyer's requested date + slot (IST). */
export function defaultScheduledAt(date: string | null, slot: keyof typeof slotHour | null): Date {
  const d = date ?? new Date().toISOString().slice(0, 10);
  const h = slotHour[slot ?? "morning"];
  return new Date(`${d}T${String(h).padStart(2, "0")}:00:00+05:30`);
}

/** Cron: remind agent ~2h before a confirmed visit. */
export async function sendVisitReminders() {
  const soon = new Date(Date.now() + 2 * 3600000);
  const due = await db
    .select({ v: visits, lead: leads, listing: listings })
    .from(visits)
    .leftJoin(leads, eq(leads.id, visits.leadId))
    .leftJoin(listings, eq(listings.id, visits.listingId))
    .where(and(inArray(visits.status, ["confirmed", "rescheduled"]), isNull(visits.remindedAt), lt(visits.scheduledAt, soon), gte(visits.scheduledAt, new Date())));
  for (const r of due) {
    await db.update(visits).set({ remindedAt: new Date() }).where(eq(visits.id, r.v.id));
    await notifyAgent(r.v.agentId, {
      kind: "visit_reminder",
      title: `Site visit at ${r.v.scheduledAt!.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}`,
      body: `${r.lead?.name ?? "Buyer"} · ${r.listing?.title ?? ""}`,
      href: `/app/visits`,
      important: true,
    });
  }
}
