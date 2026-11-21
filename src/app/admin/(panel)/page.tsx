import Link from "next/link";
import { and, count, eq, gte, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { agents, events, listings, payments, shares, subscriptions, visits, waMessages, feedback, reports } from "@/db/schema";
import { computeAccess } from "@/modules/billing";
import { Card, Stat } from "@/components/ui";

export default async function AdminHome() {
  const week = new Date(Date.now() - 7 * 86400000);
  const [[ag], subs, [ls], [live], [sh], [opened], [actions], [vs], [pending], activeAgents, [botMsgs], [fb], [rp], revenue] = await Promise.all([
    db.select({ n: count() }).from(agents).where(eq(agents.onboarded, true)),
    db.select().from(subscriptions),
    db.select({ n: count() }).from(listings),
    db.select({ n: count() }).from(listings).where(sql`${listings.status} in ('available','on_hold')`),
    db.select({ n: count() }).from(shares).where(and(isNotNull(shares.leadId), gte(shares.createdAt, week))),
    db.select({ n: count() }).from(shares).where(and(isNotNull(shares.leadId), gte(shares.createdAt, week), isNotNull(shares.firstOpenedAt))),
    db.select({ n: sql<number>`count(distinct ${events.sessionId})::int` }).from(events).where(and(gte(events.createdAt, week), sql`${events.type} in ('save','react','rank','ask','visit_request')`)),
    db.select({ n: count() }).from(visits).where(gte(visits.createdAt, week)),
    db.select({ n: count() }).from(payments).where(and(eq(payments.status, "pending"), eq(payments.method, "upi"))),
    db.execute<{ n: number }>(sql`select count(distinct agent_id)::int as n from (
      select agent_id from events where created_at > now() - interval '7 days'
      union select agent_id from wa_messages where direction = 'in' and created_at > now() - interval '7 days' and agent_id is not null
      union select agent_id from listings where updated_at > now() - interval '7 days') x`),
    db.select({ n: count() }).from(waMessages).where(and(eq(waMessages.direction, "in"), gte(waMessages.createdAt, week))),
    db.select({ n: count() }).from(feedback).where(eq(feedback.resolved, false)),
    db.select({ n: count() }).from(reports).where(eq(reports.resolved, false)),
    db.select({ total: sql<number>`coalesce(sum(${payments.amountInr}),0)::int` }).from(payments).where(and(eq(payments.status, "confirmed"), gte(payments.confirmedAt, new Date(Date.now() - 30 * 86400000)))),
  ]);
  const acc = subs.map((s) => computeAccess(s));
  const paying = acc.filter((a) => a.status === "active" && a.state === "ok").length;
  const trial = acc.filter((a) => a.status === "trial" && a.state === "ok").length;
  const lapsed = acc.filter((a) => a.state !== "ok").length;
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Pilot dashboard</h1>
      {pending.n || fb.n || rp.n ? (
        <div className="flex flex-wrap gap-2">
          {pending.n ? <Link href="/admin/payments" className="rounded-xl bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-900">{pending.n} UPI payment(s) to verify →</Link> : null}
          {fb.n ? <Link href="/admin/inbox" className="rounded-xl bg-sky-100 px-3 py-2 text-sm font-semibold text-sky-900">{fb.n} new feedback →</Link> : null}
          {rp.n ? <Link href="/admin/inbox" className="rounded-xl bg-red-100 px-3 py-2 text-sm font-semibold text-red-900">{rp.n} listing report(s) →</Link> : null}
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Agents" value={ag.n} hint={`${paying} paying · ${trial} trial · ${lapsed} lapsed`} />
        <Stat label="Weekly active agents" value={activeAgents[0]?.n ?? 0} hint="Target: 15+ of 20" />
        <Stat label="Revenue (30 d)" value={`₹${revenue[0].total.toLocaleString("en-IN")}`} />
        <Stat label="Bot messages (7 d)" value={botMsgs.n} hint="Habit metric" />
        <Stat label="Listings" value={ls.n} hint={`${live.n} live`} />
        <Stat label="Personal shares (7 d)" value={sh.n} hint={`${sh.n ? Math.round((opened.n / sh.n) * 100) : 0}% opened`} />
        <Stat label="Engaged buyers (7 d)" value={actions.n} hint="saved / liked / asked / visit" />
        <Stat label="Visit requests (7 d)" value={vs.n} />
      </div>
      <Card className="p-4 text-sm text-stone-600">
        <p className="font-semibold text-stone-800">Pilot success criteria</p>
        <ul className="mt-2 list-disc pl-5">
          <li>15+ of 20 agents active weekly</li>
          <li>Shares opened &gt; 60%, engaged &gt; 20% of opens</li>
          <li>Trial → paid conversion at ₹500/month</li>
        </ul>
      </Card>
    </div>
  );
}
