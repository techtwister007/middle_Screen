import Link from "next/link";
import { CalendarDays, Navigation } from "lucide-react";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { properties } from "@/db/schema";
import { requireAgent } from "@/lib/auth/session";
import { agentVisits, todaysVisits } from "@/modules/visits";
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
  // Today's visits in time order as one Google Maps route (exact pin when set, otherwise locality)
  const today = await todaysVisits(agent.id);
  const propIds = today.map((t) => t.listing?.propertyId).filter(Boolean) as string[];
  const props = propIds.length ? await db.select().from(properties).where(inArray(properties.id, propIds)) : [];
  const stops = today
    .map((t) => props.find((x) => x.id === t.listing?.propertyId))
    .filter(Boolean)
    .map((x) => (x!.lat != null && x!.lng != null ? `${x!.lat},${x!.lng}` : [x!.locality, x!.city].filter(Boolean).join(", ")))
    .filter((x, i, a) => x && a.indexOf(x) === i);
  const route = stops.length
    ? `https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=${encodeURIComponent(stops[stops.length - 1])}${stops.length > 1 ? `&waypoints=${encodeURIComponent(stops.slice(0, -1).join("|"))}` : ""}`
    : null;
  return (
    <div>
      <PageHeader title="Site visits" subtitle="Confirm in one tap. We remind you 2 hours before." />
      {route ? (
        <a href={route} target="_blank" rel="noopener" className="press mb-4 flex items-center gap-3 rounded-[20px] p-4 text-white [background:#1f4d36]">
          <Navigation className="h-5 w-5 shrink-0" />
          <span className="leading-snug"><b className="block font-semibold">Today&apos;s route</b><span className="text-sm text-white/85">{today.length} visit{today.length === 1 ? "" : "s"} in order, in Google Maps</span></span>
        </a>
      ) : null}
      <div className="mb-4 flex gap-2">
        {tabs.map((t) => (
          <Link key={t.k} href={`/app/visits?tab=${t.k}`} className={`press rounded-full px-4 py-2 text-sm font-semibold ${tab === t.k ? "bg-brand-700 text-white" : "bg-white text-stone-600 shadow-card"}`}>
            {t.l} {t.k === "requests" && requests.length ? `(${requests.length})` : t.k === "upcoming" && upcoming.length ? `(${upcoming.length})` : ""}
          </Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <Empty icon={<CalendarDays className="h-10 w-10" />} title={tab === "requests" ? "No pending requests" : tab === "upcoming" ? "No upcoming visits" : "No past visits"} body="Buyers request visits from your property links. You confirm here." />
      ) : (
        <div className="stagger space-y-3">
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
