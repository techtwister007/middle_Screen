import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { requireAgent } from "@/lib/auth/session";
import { agentVisits } from "@/modules/visits";
import { Card, Empty, PageHeader } from "@/components/ui";
import { VisitCard } from "./VisitCard";

export const metadata = { title: "Site visits" };
const tabs = [
  { k: "requests", l: "Requests" },
  { k: "upcoming", l: "Upcoming" },
  { k: "past", l: "Past" },
] as const;

export default async function Visits({ searchParams }: { searchParams: Promise<{ tab?: string; highlight?: string }> }) {
  const agent = await requireAgent();
  const sp = await searchParams;
  const tab = tabs.find((t) => t.k === sp.tab)?.k ?? "requests";
  const [requests, upcoming] = await Promise.all([agentVisits(agent.id, "requests"), agentVisits(agent.id, "upcoming")]);
  const rows = tab === "requests" ? requests : tab === "upcoming" ? upcoming : await agentVisits(agent.id, "past");
  return (
    <div>
      <PageHeader title="Site visits" subtitle="Confirm in one tap. We remind you 2 hours before." />
      <div className="mb-4 flex gap-2">
        {tabs.map((t) => (
          <Link key={t.k} href={`/app/visits?tab=${t.k}`} className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${tab === t.k ? "bg-stone-900 text-white" : "bg-white text-stone-600 ring-1 ring-stone-200"}`}>
            {t.l} {t.k === "requests" && requests.length ? `(${requests.length})` : t.k === "upcoming" && upcoming.length ? `(${upcoming.length})` : ""}
          </Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <Empty icon={<CalendarDays className="h-10 w-10" />} title={tab === "requests" ? "No pending requests" : tab === "upcoming" ? "No upcoming visits" : "No past visits"} body="Buyers request visits from your property links. You confirm here." />
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.v.id} className={sp.highlight === r.v.id ? "ring-2 ring-brand-500" : ""}>
              <VisitCard
                v={{ id: r.v.id, status: r.v.status, requestedDate: r.v.requestedDate, requestedSlot: r.v.requestedSlot, scheduledAt: r.v.scheduledAt ? new Date(r.v.scheduledAt).toISOString() : null, message: r.v.message, outcome: r.v.outcome }}
                lead={r.lead ? { id: r.lead.id, name: r.lead.name, phone: r.lead.phone } : null}
                listing={r.listing ? { id: r.listing.id, title: r.listing.title } : null}
              />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
