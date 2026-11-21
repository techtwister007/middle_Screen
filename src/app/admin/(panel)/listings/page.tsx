import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { agents, listings, properties, reports, shares } from "@/db/schema";
import { priceLabel, timeAgo } from "@/lib/format";
import { appUrl } from "@/config/env";
import { Badge, Card } from "@/components/ui";
import { toggleListingAction } from "../../_actions";

export default async function AdminListings() {
  const rows = await db
    .select({
      l: listings,
      p: properties,
      a: agents,
      reportsN: sql<number>`(select count(*) from ${reports} r where r.listing_id = ${listings.id} and not r.resolved)::int`,
      code: sql<string | null>`(select code from ${shares} s where s.listing_id = ${listings.id} and s.channel = 'general' limit 1)`,
    })
    .from(listings)
    .innerJoin(properties, eq(properties.id, listings.propertyId))
    .innerJoin(agents, eq(agents.id, listings.agentId))
    .orderBy(desc(listings.createdAt))
    .limit(300);
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Listings</h1>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500"><tr><th className="p-3">Listing</th><th className="p-3">Agent</th><th className="p-3">Area</th><th className="p-3">Status</th><th className="p-3">Reports</th><th className="p-3" /></tr></thead>
          <tbody className="divide-y divide-stone-100">
            {rows.map(({ l, p, a, reportsN, code }) => (
              <tr key={l.id}>
                <td className="p-3">{code ? <a href={`${appUrl}/p/${code}`} target="_blank" className="font-semibold">{l.title}</a> : <span className="font-semibold">{l.title}</span>}<p className="text-xs text-stone-500">{l.ref} · {priceLabel(l)} · {timeAgo(l.createdAt)}{l.aiGenerated ? " · AI" : ""}</p></td>
                <td className="p-3">{a.name}</td>
                <td className="p-3">{[p.locality, p.city].filter(Boolean).join(", ")}</td>
                <td className="p-3"><Badge>{l.status}</Badge> {l.disabledByAdmin ? <Badge tone="red">disabled</Badge> : null}</td>
                <td className="p-3">{reportsN ? <Badge tone="red">{reportsN}</Badge> : "—"}</td>
                <td className="p-3"><form action={toggleListingAction.bind(null, l.id)}><button className="text-xs font-semibold text-red-600">{l.disabledByAdmin ? "Enable" : "Disable"}</button></form></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
