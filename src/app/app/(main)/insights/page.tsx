import { and, count, eq, gte, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { events, shares, visits, listings, leads } from "@/db/schema";
import { requireAgent } from "@/lib/auth/session";
import { weeklySummary } from "@/modules/job-handlers";
import { Card, PageHeader, Stat } from "@/components/ui";

export const metadata = { title: "Insights" };

export default async function Insights() {
  const agent = await requireAgent();
  const aid = agent.id;
  const since = new Date(Date.now() - 30 * 86400000);
  const w = await weeklySummary(aid);
  const [[sent], [opened], [engaged], [visitN], top] = await Promise.all([
    db.select({ n: count() }).from(shares).where(and(eq(shares.agentId, aid), isNotNull(shares.leadId), gte(shares.createdAt, since))),
    db.select({ n: count() }).from(shares).where(and(eq(shares.agentId, aid), isNotNull(shares.leadId), gte(shares.createdAt, since), isNotNull(shares.firstOpenedAt))),
    db.select({ n: sql<number>`count(distinct ${events.leadId})::int` }).from(events).where(and(eq(events.agentId, aid), gte(events.createdAt, since), sql`${events.type} in ('save','react','rank','ask','visit_request')`)),
    db.select({ n: count() }).from(visits).where(and(eq(visits.agentId, aid), gte(visits.createdAt, since))),
    db
      .select({ title: listings.title, views: sql<number>`count(*) filter (where ${events.type} = 'open')::int`, saves: sql<number>`count(*) filter (where ${events.type} = 'save')::int` })
      .from(events)
      .innerJoin(listings, eq(listings.id, events.listingId))
      .where(and(eq(events.agentId, aid), gte(events.createdAt, since)))
      .groupBy(listings.title)
      .orderBy(sql`count(*) filter (where ${events.type} = 'open') desc`)
      .limit(5),
  ]);
  const [{ n: closed }] = await db.select({ n: count() }).from(leads).where(and(eq(leads.agentId, aid), eq(leads.stage, "closed")));
  const [{ n: viaApp }] = await db.select({ n: count() }).from(listings).where(and(eq(listings.agentId, aid), isNotNull(listings.closedLeadId)));
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");
  const funnel = [
    { l: "Personal links sent", v: sent.n },
    { l: "Opened", v: opened.n, p: pct(opened.n, sent.n) },
    { l: "Engaged (liked, saved, asked)", v: engaged.n, p: pct(engaged.n, opened.n) },
    { l: "Site visits requested", v: visitN.n, p: pct(visitN.n, engaged.n) },
  ];
  const max = Math.max(1, ...funnel.map((f) => f.v));
  return (
    <div className="space-y-5">
      <PageHeader title="Insights" subtitle="What your links did for you." />
      <div>
        <h2 className="mb-2 font-display font-bold">This week</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Views" value={w.views} />
          <Stat label="Buyers engaged" value={w.buyers} />
          <Stat label="Saves" value={w.saves} />
          <Stat label="Visit requests" value={w.visits} />
        </div>
      </div>
      <Card className="p-4">
        <h2 className="font-display font-bold">Last 30 days — from link to visit</h2>
        <div className="mt-3 space-y-3">
          {funnel.map((f) => (
            <div key={f.l}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="font-medium text-stone-700">{f.l}</span>
                <span className="font-bold">{f.v} {f.p ? <span className="font-normal text-stone-500">({f.p})</span> : null}</span>
              </div>
              <div className="h-2.5 rounded-full bg-stone-100">
                <div className="h-2.5 rounded-full bg-brand-600" style={{ width: `${(f.v / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">Deals closed with buyers you shared through {"the app"}: <b>{viaApp}</b> · Leads marked closed: <b>{closed}</b></p>
      </Card>
      <Card className="p-4">
        <h2 className="font-display font-bold">Most viewed properties (30 days)</h2>
        {top.length ? (
          <div className="mt-2 divide-y divide-stone-100">
            {top.map((t) => (
              <div key={t.title} className="flex justify-between py-2 text-sm">
                <span className="truncate pr-3">{t.title}</span>
                <span className="shrink-0 text-stone-500">{t.views} views · {t.saves} saves</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-stone-500">No views yet.</p>
        )}
      </Card>
    </div>
  );
}
