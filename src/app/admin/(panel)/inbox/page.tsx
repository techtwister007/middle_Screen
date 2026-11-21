import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { agents, dataRequests, feedback, listings, reports } from "@/db/schema";
import { formatPhone } from "@/lib/phone";
import { timeAgo } from "@/lib/format";
import { Card } from "@/components/ui";
import { resolveAction, toggleListingAction } from "../../_actions";

export default async function Inbox() {
  const [fb, rp, dr] = await Promise.all([
    db.select({ f: feedback, a: agents }).from(feedback).leftJoin(agents, eq(agents.id, feedback.agentId)).where(eq(feedback.resolved, false)).orderBy(desc(feedback.createdAt)),
    db.select({ r: reports, l: listings }).from(reports).leftJoin(listings, eq(listings.id, reports.listingId)).where(eq(reports.resolved, false)).orderBy(desc(reports.createdAt)),
    db.select().from(dataRequests).where(eq(dataRequests.resolved, false)).orderBy(desc(dataRequests.createdAt)),
  ]);
  const Done = ({ kind, id }: { kind: "feedback" | "report" | "data"; id: string }) => (
    <form action={resolveAction.bind(null, kind, id)}><button className="text-xs font-semibold text-brand-700">Mark resolved</button></form>
  );
  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-bold">Inbox</h1>
      <Card className="p-4">
        <h2 className="mb-2 font-semibold">Agent feedback ({fb.length})</h2>
        {fb.length === 0 ? <p className="text-sm text-stone-500">No open feedback.</p> : fb.map(({ f, a }) => (
          <div key={f.id} className="flex items-start justify-between gap-3 border-t border-stone-100 py-3">
            <div><p className="text-sm">“{f.text}”</p><p className="text-xs text-stone-500">{a?.name} · {f.page} · {timeAgo(f.createdAt)}</p></div>
            <Done kind="feedback" id={f.id} />
          </div>
        ))}
      </Card>
      <Card className="p-4">
        <h2 className="mb-2 font-semibold">Listing reports ({rp.length})</h2>
        {rp.length === 0 ? <p className="text-sm text-stone-500">No open reports.</p> : rp.map(({ r, l }) => (
          <div key={r.id} className="flex items-start justify-between gap-3 border-t border-stone-100 py-3">
            <div><p className="text-sm font-semibold">{l?.title} ({l?.ref})</p><p className="text-sm">{r.reason}{r.details ? ` — ${r.details}` : ""}</p><p className="text-xs text-stone-500">{timeAgo(r.createdAt)}</p></div>
            <div className="flex flex-col items-end gap-1">
              {l ? <form action={toggleListingAction.bind(null, l.id)}><button className="text-xs font-semibold text-red-600">{l.disabledByAdmin ? "Enable listing" : "Disable listing"}</button></form> : null}
              <Done kind="report" id={r.id} />
            </div>
          </div>
        ))}
      </Card>
      <Card className="p-4">
        <h2 className="mb-2 font-semibold">Data requests (DPDP) ({dr.length})</h2>
        <p className="mb-2 text-xs text-stone-500">Delete: remove the number from leads across agents (SQL in docs/OPERATIONS.md). Respond within 30 days.</p>
        {dr.length === 0 ? <p className="text-sm text-stone-500">None.</p> : dr.map((d) => (
          <div key={d.id} className="flex items-start justify-between gap-3 border-t border-stone-100 py-3">
            <div><p className="text-sm font-semibold">{d.kind.toUpperCase()} · {formatPhone(d.phone)}</p><p className="text-xs text-stone-500">{d.details} · {timeAgo(d.createdAt)}</p></div>
            <Done kind="data" id={d.id} />
          </div>
        ))}
      </Card>
    </div>
  );
}
