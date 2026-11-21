import "server-only";
import { and, desc, eq, sql, inArray } from "drizzle-orm";
import { db } from "@/db";
import { leads, events, shares, buyerActions, visits, notes, listings, questions, type LeadStage, type Requirement } from "@/db/schema";
import { id } from "@/lib/ids";

export async function findOrCreateLead(agentId: string, v: { name?: string; phone?: string | null; source?: "share" | "manual" | "page" | "bot" | "import"; verified?: boolean }) {
  if (v.phone) {
    const ex = await db.query.leads.findFirst({ where: and(eq(leads.agentId, agentId), eq(leads.phone, v.phone)) });
    if (ex) {
      const patch: Partial<typeof leads.$inferInsert> = {};
      if (v.name && !ex.name) patch.name = v.name;
      if (v.verified && !ex.phoneVerified) patch.phoneVerified = true;
      if (Object.keys(patch).length) await db.update(leads).set(patch).where(eq(leads.id, ex.id));
      return { ...ex, ...patch };
    }
  }
  const [row] = await db
    .insert(leads)
    .values({ id: id(), agentId, name: v.name?.trim() || "", phone: v.phone ?? null, source: v.source ?? "manual", phoneVerified: !!v.verified, lastActivityAt: new Date() })
    .returning();
  return row;
}

export async function getOwnLead(agentId: string, leadId: string) {
  return db.query.leads.findFirst({ where: and(eq(leads.id, leadId), eq(leads.agentId, agentId)) });
}

export async function updateLead(
  agentId: string,
  leadId: string,
  patch: Partial<{ name: string; phone: string | null; stage: LeadStage; requirement: Requirement; nextFollowUpAt: Date | null; followUpNote: string | null }>,
) {
  await db.update(leads).set(patch).where(and(eq(leads.id, leadId), eq(leads.agentId, agentId)));
}

export async function addNote(agentId: string, leadId: string, text: string) {
  const lead = await getOwnLead(agentId, leadId);
  if (!lead) throw new Error("not found");
  await db.insert(notes).values({ id: id(), agentId, leadId, text: text.slice(0, 4000) });
}

/* ---------------- Intent ---------------- */

export type Intent = { level: "cold" | "exploring" | "interested" | "hot"; score: number; reasons: string[] };

/**
 * Transparent intent signals. Score is a simple weighted sum; reasons are shown to the agent
 * so the badge is never a black box.
 */
export function computeIntent(s: { opens: number; distinctDays: number; devices: number; galleryViews: number; saves: number; questions: number; visits: number; likes: number; dwellSec: number }): Intent {
  const reasons: string[] = [];
  let score = 0;
  if (s.opens) {
    score += Math.min(s.opens, 5) * 4;
    reasons.push(`Opened ${s.opens}×`);
  }
  if (s.distinctDays > 1) {
    score += 10;
    reasons.push(`Came back on ${s.distinctDays} different days`);
  }
  if (s.devices > 1) {
    score += 8;
    reasons.push(`Viewed on ${s.devices} devices (shared with family?)`);
  }
  if (s.galleryViews >= 5) {
    score += 6;
    reasons.push("Explored the photo gallery");
  }
  if (s.dwellSec >= 90) {
    score += 6;
    reasons.push(`Spent ${Math.round(s.dwellSec / 60)} min looking`);
  }
  if (s.likes) {
    score += 8 * Math.min(s.likes, 3);
    reasons.push(`Liked ${s.likes} propert${s.likes > 1 ? "ies" : "y"}`);
  }
  if (s.saves) {
    score += 15 * Math.min(s.saves, 3);
    reasons.push(`Saved ${s.saves} propert${s.saves > 1 ? "ies" : "y"}`);
  }
  if (s.questions) {
    score += 20;
    reasons.push("Asked a question");
  }
  if (s.visits) {
    score += 40;
    reasons.push("Requested a site visit");
  }
  const level = score >= 45 ? "hot" : score >= 22 ? "interested" : score > 0 ? "exploring" : "cold";
  return { level, score, reasons };
}

export async function leadIntent(leadId: string): Promise<Intent> {
  const [r] = await db.execute<{
    opens: number; days: number; devices: number; gallery: number; dwell: number;
  }>(sql`
    select
      count(*) filter (where type = 'open')::int as opens,
      count(distinct date_trunc('day', created_at)) filter (where type = 'open')::int as days,
      count(distinct session_id) filter (where type = 'open')::int as devices,
      count(*) filter (where type = 'gallery')::int as gallery,
      coalesce(sum((meta->>'sec')::int) filter (where type = 'dwell'), 0)::int as dwell
    from events where lead_id = ${leadId}`);
  const [b] = await db
    .select({ saves: sql<number>`count(*) filter (where saved)::int`, likes: sql<number>`count(*) filter (where reaction = 'like')::int` })
    .from(buyerActions)
    .where(eq(buyerActions.leadId, leadId));
  const [q] = await db.select({ n: sql<number>`count(*)::int` }).from(questions).where(eq(questions.leadId, leadId));
  const [v] = await db.select({ n: sql<number>`count(*)::int` }).from(visits).where(eq(visits.leadId, leadId));
  return computeIntent({
    opens: r?.opens ?? 0,
    distinctDays: r?.days ?? 0,
    devices: r?.devices ?? 0,
    galleryViews: r?.gallery ?? 0,
    dwellSec: r?.dwell ?? 0,
    saves: b?.saves ?? 0,
    likes: b?.likes ?? 0,
    questions: q?.n ?? 0,
    visits: v?.n ?? 0,
  });
}

/** Recompute and store the intent score; auto-advance early stages (never moves a lead backwards). */
export async function refreshLeadIntent(leadId: string) {
  const intent = await leadIntent(leadId);
  const lead = await db.query.leads.findFirst({ where: eq(leads.id, leadId) });
  if (!lead) return intent;
  let stage = lead.stage;
  if (stage === "new" && intent.score > 0) stage = "exploring";
  if ((stage === "new" || stage === "exploring") && (intent.level === "interested" || intent.level === "hot")) stage = "interested";
  await db.update(leads).set({ intentScore: intent.score, stage, lastActivityAt: new Date() }).where(eq(leads.id, leadId));
  return intent;
}

export type LeadListRow = Awaited<ReturnType<typeof agentLeads>>[number];

export async function agentLeads(agentId: string, opts: { stage?: LeadStage | "hot" | "all" | "followup"; q?: string } = {}) {
  const conds = [eq(leads.agentId, agentId)];
  if (opts.stage === "hot") conds.push(sql`${leads.intentScore} >= 45`);
  else if (opts.stage === "followup") conds.push(sql`${leads.nextFollowUpAt} is not null and ${leads.nextFollowUpAt} <= now() + interval '1 day'`);
  else if (opts.stage && opts.stage !== "all") conds.push(eq(leads.stage, opts.stage));
  if (opts.q) conds.push(sql`(${leads.name} ilike ${"%" + opts.q + "%"} or ${leads.phone} like ${"%" + opts.q.replace(/\D/g, "") + "%"})`);
  const rows = await db
    .select({
      lead: leads,
      sharedCount: sql<number>`(select count(*) from ${shares} s where s.lead_id = ${leads.id})::int`,
      lastEvent: sql<string | null>`(select e.type || '|' || coalesce(l.title,'') from ${events} e left join ${listings} l on l.id = e.listing_id where e.lead_id = ${leads.id} order by e.created_at desc limit 1)`,
    })
    .from(leads)
    .where(and(...conds))
    .orderBy(desc(sql`coalesce(${leads.lastActivityAt}, ${leads.createdAt})`))
    .limit(500);
  return rows;
}

/** What the lead did, newest first — the lead's timeline. */
export async function leadTimeline(leadId: string, limit = 100) {
  return db
    .select({ e: events, title: listings.title, ref: listings.ref })
    .from(events)
    .leftJoin(listings, eq(listings.id, events.listingId))
    .where(eq(events.leadId, leadId))
    .orderBy(desc(events.createdAt))
    .limit(limit);
}

/** Every listing shared with the lead and the lead's reaction to each. */
export async function leadProperties(leadId: string) {
  const sh = await db.select().from(shares).where(eq(shares.leadId, leadId)).orderBy(desc(shares.createdAt));
  const listingIds = [...new Set(sh.map((s) => s.listingId).filter(Boolean) as string[])];
  const acts = await db.select().from(buyerActions).where(eq(buyerActions.leadId, leadId));
  const actionListingIds = acts.map((a) => a.listingId);
  const all = [...new Set([...listingIds, ...actionListingIds])];
  const ls = all.length ? await db.select().from(listings).where(inArray(listings.id, all)) : [];
  return { shares: sh, listings: ls, actions: acts };
}

export async function leadNotes(leadId: string) {
  return db.select().from(notes).where(eq(notes.leadId, leadId)).orderBy(desc(notes.createdAt));
}

export const stageLabels: Record<LeadStage, string> = {
  new: "New",
  exploring: "Exploring",
  interested: "Interested",
  visit: "Site visit",
  negotiating: "Negotiating",
  closed: "Closed",
  lost: "Lost",
};
