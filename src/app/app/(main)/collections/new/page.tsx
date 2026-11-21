import { requireAgent } from "@/lib/auth/session";
import { priceLabel } from "@/lib/format";
import { agentListings } from "@/modules/listings";
import { mediaForListings } from "@/modules/media";
import { leadOptions } from "@/modules/lead-options";
import { getOwnLead } from "@/modules/leads";
import { matchingListingsForLead } from "@/modules/matching";
import { PageHeader, Empty, LinkButton } from "@/components/ui";
import { CollectionBuilder } from "./Builder";

export const metadata = { title: "New collection" };

export default async function NewCollection({ searchParams }: { searchParams: Promise<{ lead?: string }> }) {
  const agent = await requireAgent();
  const sp = await searchParams;
  const rows = await agentListings(agent.id, { status: "active" });
  const ms = await mediaForListings(rows.map((r) => r.l.id));
  const lead = sp.lead ? await getOwnLead(agent.id, sp.lead) : null;
  const matches = lead ? new Set((await matchingListingsForLead(agent.id, lead.id)).map((m) => m.l.id)) : new Set<string>();
  if (!rows.length) return <Empty title="No live properties" body="Publish a few properties first." action={<LinkButton href="/app/properties/new">Add property</LinkButton>} />;
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader back="/app/collections" title="New collection" subtitle={lead ? `Shortlist for ${lead.name || lead.phone}` : "Pick properties, then send one link."} />
      <CollectionBuilder
        leads={await leadOptions(agent.id)}
        presetLead={lead ? { id: lead.id, name: lead.name || lead.phone || "" } : null}
        items={rows.map((r) => ({
          id: r.l.id,
          title: r.l.title,
          price: priceLabel(r.l),
          locality: r.p.locality ?? "",
          thumb: ms.find((m) => m.listingId === r.l.id && m.kind === "image")?.urlSm ?? null,
          match: matches.has(r.l.id),
        }))}
      />
    </div>
  );
}
