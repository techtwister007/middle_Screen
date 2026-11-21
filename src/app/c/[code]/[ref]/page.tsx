import { notFound } from "next/navigation";
import { resolveBuyerPage } from "@/modules/buyer-page";
import { loadPublicListings } from "@/modules/public";
import { ListingView } from "@/components/buyer/ListingView";
import { Unavailable } from "@/components/buyer/Unavailable";

export const dynamic = "force-dynamic";

/** A listing opened from inside a collection — tracked against the collection link. */
export default async function CollectionItemPage({ params }: { params: Promise<{ code: string; ref: string }> }) {
  const { code, ref } = await params;
  const r = await resolveBuyerPage(code);
  if (r.kind === "missing") notFound();
  if (r.kind === "unavailable") return <Unavailable agent={r.agent} message="This link is not active right now." />;
  if (!r.collection) notFound();
  const ls = await loadPublicListings(r.collection.listingIds);
  const l = ls.find((x) => x.ref === ref.toUpperCase());
  if (!l) notFound();
  const a = r.actions.find((x) => x.listingId === l.id);
  return (
    <ListingView
      listing={l}
      agent={r.agent}
      code={code}
      backHref={`/c/${code}`}
      trackOpen={false}
      visit={await r.visitFor(l.id)}
      initial={{ identified: r.identified, name: r.lead?.name ?? null, saved: !!a?.saved, reaction: a?.reaction ?? null }}
    />
  );
}
