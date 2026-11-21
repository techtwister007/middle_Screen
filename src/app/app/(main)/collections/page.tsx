import Link from "next/link";
import { LayoutGrid, Plus } from "lucide-react";
import { requireAgent } from "@/lib/auth/session";
import { timeAgo } from "@/lib/format";
import { agentCollections } from "@/modules/collections";
import { Card, Empty, LinkButton, PageHeader, Badge } from "@/components/ui";

export const metadata = { title: "Collections" };

export default async function Collections() {
  const agent = await requireAgent();
  const rows = await agentCollections(agent.id);
  return (
    <div>
      <PageHeader title="Collections" subtitle="Several properties in one link — buyers like, skip, rank and compare." action={<LinkButton href="/app/collections/new"><Plus className="h-4 w-4" /> New</LinkButton>} />
      {rows.length === 0 ? (
        <Empty icon={<LayoutGrid className="h-10 w-10" />} title="No collections yet" body="Shortlist 3–5 properties for a buyer and send one beautiful link." action={<LinkButton href="/app/collections/new">Create a collection</LinkButton>} />
      ) : (
        <Card className="divide-y divide-stone-100">
          {rows.map(({ c, lead }) => (
            <Link key={c.id} href={`/app/collections/${c.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-stone-50">
              <div className="min-w-0">
                <p className="truncate font-semibold">{c.title}</p>
                <p className="text-xs text-stone-500">{c.listingIds.length} properties · {timeAgo(c.createdAt)}</p>
              </div>
              {lead ? <Badge tone="brand">For {lead.name || lead.phone}</Badge> : <Badge>General</Badge>}
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
