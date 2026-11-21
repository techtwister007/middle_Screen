import { notFound } from "next/navigation";
import { count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { agents, listings, leads, payments, shares, feedback } from "@/db/schema";
import { formatPhone } from "@/lib/phone";
import { dateLabel, timeAgo } from "@/lib/format";
import { getAccess } from "@/modules/billing";
import { weeklySummary } from "@/modules/job-handlers";
import { Badge, Card, Stat } from "@/components/ui";
import { extendTrialAction, grantMonthsAction, impersonateAction, toggleAgentAction } from "../../../_actions";

export default async function AdminAgent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await db.query.agents.findFirst({ where: eq(agents.id, id) });
  if (!a) notFound();
  const [access, w, [ls], [ld], [sh], pays, fbs] = await Promise.all([
    getAccess(id),
    weeklySummary(id),
    db.select({ n: count() }).from(listings).where(eq(listings.agentId, id)),
    db.select({ n: count() }).from(leads).where(eq(leads.agentId, id)),
    db.select({ n: count() }).from(shares).where(eq(shares.agentId, id)),
    db.select().from(payments).where(eq(payments.agentId, id)).orderBy(desc(payments.createdAt)),
    db.select().from(feedback).where(eq(feedback.agentId, id)).orderBy(desc(feedback.createdAt)),
  ]);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">{a.name || "Unnamed"} {a.disabled ? <Badge tone="red">disabled</Badge> : null}</h1>
          <p className="text-sm text-stone-500">{a.company} · {formatPhone(a.phone)} · /{a.handle} · joined {dateLabel(a.createdAt)} · bot {timeAgo(a.lastInboundAt)}</p>
        </div>
        <div className="flex gap-2">
          <form action={impersonateAction.bind(null, id)}><button className="h-9 rounded-lg bg-stone-900 px-3 text-sm font-semibold text-white">Open as agent</button></form>
          <form action={toggleAgentAction.bind(null, id)}><button className="h-9 rounded-lg bg-white px-3 text-sm font-semibold text-red-600 ring-1 ring-stone-200">{a.disabled ? "Enable" : "Disable"}</button></form>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Plan" value={access.status} hint={`${access.state} · ends ${dateLabel(access.periodEnd)}`} />
        <Stat label="Listings" value={ls.n} />
        <Stat label="Leads" value={ld.n} />
        <Stat label="Shares" value={sh.n} />
        <Stat label="Views (7d)" value={w.views} />
        <Stat label="Engaged buyers (7d)" value={w.buyers} />
        <Stat label="Saves (7d)" value={w.saves} />
        <Stat label="Visits (7d)" value={w.visits} />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="space-y-3 p-4">
          <p className="font-semibold">Grant paid months (cash / manual)</p>
          <form action={grantMonthsAction.bind(null, id)} className="flex gap-2">
            <input name="months" type="number" min={1} max={24} defaultValue={1} className="w-20 rounded-lg px-2 py-1.5 ring-1 ring-stone-300" />
            <input name="note" placeholder="Note e.g. cash" className="flex-1 rounded-lg px-2 py-1.5 ring-1 ring-stone-300" />
            <button className="rounded-lg bg-brand-700 px-3 text-sm font-semibold text-white">Grant</button>
          </form>
          <p className="font-semibold">Extend trial / access by days</p>
          <form action={extendTrialAction.bind(null, id)} className="flex gap-2">
            <input name="days" type="number" min={1} max={90} defaultValue={7} className="w-20 rounded-lg px-2 py-1.5 ring-1 ring-stone-300" />
            <button className="rounded-lg bg-stone-900 px-3 text-sm font-semibold text-white">Extend</button>
          </form>
        </Card>
        <Card className="p-4">
          <p className="mb-2 font-semibold">Payments</p>
          {pays.length ? pays.map((p) => <p key={p.id} className="text-sm">₹{p.amountInr} · {p.method} · {p.status} · {dateLabel(p.createdAt)} {p.reference ? `· ${p.reference}` : ""}</p>) : <p className="text-sm text-stone-500">None</p>}
          <p className="mb-2 mt-4 font-semibold">Feedback</p>
          {fbs.length ? fbs.map((f) => <p key={f.id} className="text-sm">“{f.text}” <span className="text-stone-400">{timeAgo(f.createdAt)}</span></p>) : <p className="text-sm text-stone-500">None</p>}
        </Card>
      </div>
    </div>
  );
}
