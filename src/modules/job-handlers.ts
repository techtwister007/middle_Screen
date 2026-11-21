import "server-only";
import { and, eq, gte, inArray, isNotNull, isNull, lt, lte, sql } from "drizzle-orm";
import { env } from "@/config/env";
import { db } from "@/db";
import { agents, drafts, jobs, leads, listings, events, visits, buyerActions } from "@/db/schema";
import { sendWhatsApp } from "@/lib/wa";
import { registerJob, cleanupJobs } from "./jobs";
import { finalizeDraft } from "./drafts";
import { notifyMatchesForListing } from "./matching";
import { notifyAgent } from "./notify";
import { sendRenewalReminders } from "./billing";
import { sendVisitReminders } from "./visits";
import { M } from "./bot/messages";

const DAY = 86400000;

/* Draft batch auto-closes after N minutes of silence */
registerJob("finalize_draft", async ({ draftId }) => {
  const r = await finalizeDraft(String(draftId));
  if (!r) return; // still receiving or already processed
  const agent = await db.query.agents.findFirst({ where: eq(agents.id, r.listing.agentId) });
  if (agent) {
    const { sendDraftReady } = await import("./bot");
    await sendDraftReady(agent, r.listing.id, r.extracted.missing, r.unheardVoice);
  }
});

registerJob("match_listing", async ({ listingId }) => {
  await notifyMatchesForListing(String(listingId));
});

/** Runs on every cron tick (every minute). Cheap checks only. */
export async function tick() {
  await sendVisitReminders();
  // Safety net for drafts whose finalize job got lost.
  const stale = await db
    .select({ id: drafts.id })
    .from(drafts)
    .where(and(eq(drafts.state, "collecting"), lt(drafts.lastActivityAt, new Date(Date.now() - (env.DRAFT_BATCH_MINUTES + 5) * 60000))));
  for (const d of stale) {
    const ex = await db.query.jobs.findFirst({ where: and(eq(jobs.type, "finalize_draft"), eq(jobs.status, "pending"), sql`${jobs.payload}->>'draftId' = ${d.id}`) });
    if (!ex) await db.insert(jobs).values({ id: `fd-${d.id}-${Date.now()}`, type: "finalize_draft", payload: { draftId: d.id } });
  }
  // Daily tasks once per day after 8:00 IST.
  const ist = new Date(Date.now() + 5.5 * 3600000);
  if (ist.getUTCHours() >= 8) {
    const key = `daily:${ist.toISOString().slice(0, 10)}`;
    const [claimed] = await db.insert(jobs).values({ id: key, type: "daily", status: "done" }).onConflictDoNothing().returning();
    if (claimed) await daily(ist.getUTCDay() === 1);
  }
}

/** Morning tasks: renewals, follow-ups, stale listing checks, weekly report (Mondays). */
export async function daily(weekly: boolean) {
  await sendRenewalReminders();

  const endOfDay = new Date(Date.now() + DAY);
  const due = await db
    .select({ agentId: leads.agentId, n: sql<number>`count(*)::int`, names: sql<string>`string_agg(coalesce(nullif(${leads.name}, ''), ${leads.phone}), ', ')` })
    .from(leads)
    .where(and(isNotNull(leads.nextFollowUpAt), lte(leads.nextFollowUpAt, endOfDay)))
    .groupBy(leads.agentId);
  for (const d of due)
    await notifyAgent(d.agentId, { kind: "followup", title: `📞 ${d.n} follow-up${d.n > 1 ? "s" : ""} due today`, body: d.names.slice(0, 140), href: "/app/leads?stage=followup", important: true });

  const pendingVisits = await db
    .select({ agentId: visits.agentId, n: sql<number>`count(*)::int` })
    .from(visits)
    .where(and(eq(visits.status, "requested"), lt(visits.createdAt, new Date(Date.now() - 12 * 3600000))))
    .groupBy(visits.agentId);
  for (const p of pendingVisits)
    await notifyAgent(p.agentId, { kind: "visit", title: `⏳ ${p.n} site visit request${p.n > 1 ? "s" : ""} not confirmed`, body: "Buyers are waiting — confirm in one tap.", href: "/app/visits", important: true });

  // Stale inventory: ask the agent to confirm availability.
  const stale = await db
    .select({ l: listings, a: agents })
    .from(listings)
    .innerJoin(agents, eq(agents.id, listings.agentId))
    .where(and(inArray(listings.status, ["available", "on_hold"]), lt(listings.verifiedAt, new Date(Date.now() - env.LISTING_VERIFY_DAYS * DAY)), isNull(listings.verifyAskedAt)))
    .limit(500);
  for (const { l, a } of stale) {
    await db.update(listings).set({ verifyAskedAt: new Date() }).where(eq(listings.id, l.id));
    await notifyAgent(a.id, { kind: "verify", title: `Is “${l.title}” still available?`, body: "Confirm to keep it fresh for buyers.", href: `/app/properties/${l.id}?verify=1`, important: true });
    // WhatsApp only inside the free 24h service window
    if (a.lastInboundAt && Date.now() - new Date(a.lastInboundAt).getTime() < DAY - 3600000) await sendWhatsApp(a.phone, M.verifyAsk(l.title, l.ref), a.id);
  }

  if (weekly) await weeklyReports();
  await cleanupJobs();
}

export async function weeklySummary(agentId: string) {
  const since = new Date(Date.now() - 7 * DAY);
  const [e] = await db
    .select({
      views: sql<number>`count(*) filter (where ${events.type} = 'open')::int`,
      viewers: sql<number>`count(distinct ${events.sessionId}) filter (where ${events.type} = 'open')::int`,
      buyers: sql<number>`count(distinct ${events.leadId})::int`,
    })
    .from(events)
    .where(and(eq(events.agentId, agentId), gte(events.createdAt, since)));
  const [s] = await db.select({ n: sql<number>`count(*)::int` }).from(buyerActions).where(and(eq(buyerActions.agentId, agentId), eq(buyerActions.saved, true), gte(buyerActions.updatedAt, since)));
  const [v] = await db.select({ n: sql<number>`count(*)::int` }).from(visits).where(and(eq(visits.agentId, agentId), gte(visits.createdAt, since)));
  const [top] = await db
    .select({ title: listings.title, n: sql<number>`count(*)::int` })
    .from(events)
    .innerJoin(listings, eq(listings.id, events.listingId))
    .where(and(eq(events.agentId, agentId), eq(events.type, "open"), gte(events.createdAt, since)))
    .groupBy(listings.title)
    .orderBy(sql`count(*) desc`)
    .limit(1);
  return { views: e?.views ?? 0, viewers: e?.viewers ?? 0, buyers: e?.buyers ?? 0, saves: s?.n ?? 0, visits: v?.n ?? 0, top: top?.title ?? null };
}

async function weeklyReports() {
  const all = await db.select().from(agents).where(and(eq(agents.onboarded, true), eq(agents.disabled, false)));
  for (const a of all) {
    const w = await weeklySummary(a.id);
    if (!w.views && !w.visits) continue;
    const body = `${w.views} views · ${w.buyers} buyers engaged · ${w.saves} saves · ${w.visits} visit requests${w.top ? ` · Most loved: ${w.top}` : ""}`;
    await notifyAgent(a.id, { kind: "weekly", title: "📊 Your week in numbers", body, href: "/app/insights", important: true });
    if (a.lastInboundAt && Date.now() - new Date(a.lastInboundAt).getTime() < DAY - 3600000) await sendWhatsApp(a.phone, `📊 *Your week*\n${body}`, a.id);
  }
}
