import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { agents, payments } from "@/db/schema";
import { formatPhone } from "@/lib/phone";
import { dateLabel } from "@/lib/format";
import { Badge, Card } from "@/components/ui";
import { confirmPaymentAction, rejectPaymentAction } from "../../_actions";

export default async function AdminPayments() {
  const rows = await db.select({ p: payments, a: agents }).from(payments).innerJoin(agents, eq(agents.id, payments.agentId)).orderBy(desc(payments.createdAt)).limit(300);
  const pending = rows.filter((r) => r.p.status === "pending" && r.p.method === "upi");
  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-bold">Payments</h1>
      <Card className="p-4">
        <h2 className="mb-1 font-semibold">UPI payments to verify ({pending.length})</h2>
        <p className="mb-3 text-sm text-stone-500">Check the UTR in your bank / UPI app, then confirm. Confirming extends the agent&apos;s plan instantly.</p>
        {pending.length === 0 ? <p className="text-sm text-stone-500">Nothing pending</p> : null}
        <div className="divide-y divide-stone-100">
          {pending.map(({ p, a }) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="font-semibold">₹{p.amountInr} · {p.months} mo · UTR <span className="select-all font-mono">{p.reference}</span></p>
                <p className="text-xs text-stone-500"><Link href={`/admin/agents/${a.id}`}>{a.name} ({formatPhone(a.phone)})</Link> · {dateLabel(p.createdAt, true)}</p>
              </div>
              <div className="flex gap-2">
                <form action={confirmPaymentAction.bind(null, p.id)}><button className="h-9 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white">Confirm</button></form>
                <form action={rejectPaymentAction.bind(null, p.id)} className="flex gap-1">
                  <input name="note" placeholder="Reason" className="w-28 rounded-lg px-2 text-sm ring-1 ring-stone-300" />
                  <button className="h-9 rounded-lg bg-white px-3 text-sm font-semibold text-red-600 ring-1 ring-stone-200">Reject</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500"><tr><th className="p-3">Date</th><th className="p-3">Agent</th><th className="p-3">Method</th><th className="p-3">Amount</th><th className="p-3">Ref</th><th className="p-3">Status</th></tr></thead>
          <tbody className="divide-y divide-stone-100">
            {rows.map(({ p, a }) => (
              <tr key={p.id}><td className="p-3">{dateLabel(p.createdAt)}</td><td className="p-3">{a.name}</td><td className="p-3">{p.method}</td><td className="p-3">₹{p.amountInr} / {p.months}m</td><td className="p-3 font-mono text-xs">{p.reference ?? p.orderId}</td><td className="p-3"><Badge tone={p.status === "confirmed" ? "green" : p.status === "pending" ? "amber" : "red"}>{p.status}</Badge></td></tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
