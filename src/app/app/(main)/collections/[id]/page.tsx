import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { ExternalLink, ThumbsDown, ThumbsUp } from "lucide-react";
import { db } from "@/db";
import { buyerActions, leads, shares } from "@/db/schema";
import { requireAgent } from "@/lib/auth/session";
import { priceLabel } from "@/lib/format";
import { getOwnCollection } from "@/modules/collections";
import { agentListings } from "@/modules/listings";
import { collectionUrl, generalCollectionShare } from "@/modules/shares";
import { leadOptions } from "@/modules/lead-options";
import { Badge, Card, PageHeader } from "@/components/ui";
import { ShareButton } from "@/components/app/ShareDialog";
import { deleteCollectionAction } from "@/app/app/_actions/misc";

export default async function CollectionDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ shareTo?: string; created?: string }> }) {
  const agent = await requireAgent();
  const { id } = await params;
  const sp = await searchParams;
  const c = await getOwnCollection(agent.id, id);
  if (!c) notFound();
  const [rows, general, opts, sh] = await Promise.all([
    agentListings(agent.id, { status: "all", ids: c.listingIds }),
    generalCollectionShare(agent.id, id),
    leadOptions(agent.id),
    db.select({ s: shares, lead: leads }).from(shares).innerJoin(leads, eq(leads.id, shares.leadId)).where(and(eq(shares.collectionId, id), isNotNull(shares.leadId))),
  ]);
  const leadIds = sh.map((s) => s.lead.id);
  const acts = leadIds.length ? await db.select().from(buyerActions).where(and(inArray(buyerActions.leadId, leadIds), inArray(buyerActions.listingId, c.listingIds))) : [];
  const ordered = c.listingIds.map((lid) => rows.find((r) => r.l.id === lid)).filter(Boolean) as typeof rows;

  return (
    <div className="space-y-5">
      <PageHeader back="/app/collections" title={c.title} subtitle={`${c.listingIds.length} properties`} action={<ShareButton target={{ collectionId: id }} leads={opts} publicUrl={collectionUrl(general.code)} presetLeadId={sp.shareTo} label="Share" />} />
      {sp.created ? <p className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">Collection created — tap Share to send it to a buyer.</p> : null}
      <a href={collectionUrl(general.code)} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700">
        <ExternalLink className="h-4 w-4" /> Preview buyer view
      </a>
      <Card className="divide-y divide-stone-100">
        {ordered.map((r) => {
          const a = acts.filter((x) => x.listingId === r.l.id);
          return (
            <div key={r.l.id} className="flex items-center justify-between gap-2 p-3.5">
              <Link href={`/app/properties/${r.l.id}`} className="min-w-0">
                <p className="truncate font-semibold">{r.l.title}</p>
                <p className="text-xs text-stone-500">{priceLabel(r.l)} · {r.views} views</p>
              </Link>
              <div className="flex shrink-0 gap-1">
                {a.filter((x) => x.reaction === "like").length ? <Badge tone="green"><ThumbsUp className="h-3 w-3" /> {a.filter((x) => x.reaction === "like").length}</Badge> : null}
                {a.filter((x) => x.reaction === "dislike").length ? <Badge><ThumbsDown className="h-3 w-3" /> {a.filter((x) => x.reaction === "dislike").length}</Badge> : null}
                {a.filter((x) => x.rank === 1).length ? <Badge tone="brand">#1 pick</Badge> : null}
              </div>
            </div>
          );
        })}
      </Card>
      {sh.length ? (
        <Card className="p-4">
          <h2 className="font-display font-bold">Sent to</h2>
          <div className="mt-2 divide-y divide-stone-100">
            {sh.map((s) => {
              const top = acts.filter((x) => x.leadId === s.lead.id && x.rank).sort((a, b) => a.rank! - b.rank!)[0];
              const topTitle = top ? ordered.find((o) => o.l.id === top.listingId)?.l.title : null;
              return (
                <Link key={s.s.code} href={`/app/leads/${s.lead.id}`} className="flex items-center justify-between py-2.5">
                  <span className="font-semibold">{s.lead.name || s.lead.phone}</span>
                  <span className="text-xs text-stone-500">{s.s.opens ? `opened ${s.s.opens}×` : "not opened"}{topTitle ? ` · #1: ${topTitle}` : ""}</span>
                </Link>
              );
            })}
          </div>
        </Card>
      ) : null}
      <form action={deleteCollectionAction.bind(null, id)}>
        <button className="text-xs font-semibold text-red-600">Delete collection</button>
      </form>
    </div>
  );
}
