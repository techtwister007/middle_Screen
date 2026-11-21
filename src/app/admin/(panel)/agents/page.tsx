import Link from "next/link";
import { desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { agents, subscriptions, listings, leads, events } from "@/db/schema";
import { formatPhone } from "@/lib/phone";
import { timeAgo } from "@/lib/format";
import { computeAccess } from "@/modules/billing";
import { Badge, Card } from "@/components/ui";
import { eq } from "drizzle-orm";

export default async function AdminAgents({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sp = await searchParams;
  const q = sp.q?.trim();
  const rows = await db
    .select({
      a: agents,
      s: subscriptions,
      listingsN: sql<number>`(select count(*) from ${listings} l where l.agent_id = ${agents.id} and l.status <> 'archived')::int`,
      leadsN: sql<number>`(select count(*) from ${leads} x where x.agent_id = ${agents.id})::int`,
      lastEvent: sql<Date | null>`(select max(created_at) from ${events} e where e.agent_id = ${agents.id})`,
    })
    .from(agents)
    .leftJoin(subscriptions, eq(subscriptions.agentId, agents.id))
    .where(q ? sql`(${agents.name} ilike ${"%" + q + "%"} or ${agents.phone} like ${"%" + q.replace(/\D/g, "") + "%"} or ${agents.company} ilike ${"%" + q + "%"})` : undefined)
    .orderBy(desc(agents.createdAt))
    .limit(500);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">Agents ({rows.length})</h1>
        <form><input name="q" defaultValue={q} placeholder="Search" className="rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-stone-200" /></form>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500">
            <tr><th className="p-3">Agent</th><th className="p-3">Plan</th><th className="p-3">Listings</th><th className="p-3">Leads</th><th className="p-3">Last buyer activity</th><th className="p-3">Bot active</th></tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rows.map(({ a, s, listingsN, leadsN, lastEvent }) => {
              const acc = s ? computeAccess(s) : null;
              return (
                <tr key={a.id} className="hover:bg-stone-50">
                  <td className="p-3"><Link href={`/admin/agents/${a.id}`} className="font-semibold">{a.name || "—"}</Link><p className="text-xs text-stone-500">{a.company} · {formatPhone(a.phone)}</p></td>
                  <td className="p-3">{acc ? <Badge tone={acc.state !== "ok" ? "red" : acc.status === "active" ? "green" : "amber"}>{acc.state !== "ok" ? acc.state : acc.status} · {acc.daysLeft}d</Badge> : "—"}{a.disabled ? <Badge tone="red" className="ml-1">disabled</Badge> : null}{!a.onboarded ? <Badge className="ml-1">onboarding</Badge> : null}</td>
                  <td className="p-3">{listingsN}</td>
                  <td className="p-3">{leadsN}</td>
                  <td className="p-3 text-stone-500">{timeAgo(lastEvent)}</td>
                  <td className="p-3 text-stone-500">{timeAgo(a.lastInboundAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
