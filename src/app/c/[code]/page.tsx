import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveBuyerPage } from "@/modules/buyer-page";
import { loadPublicListings } from "@/modules/public";
import { CollectionView, type CollectionItemState } from "@/components/buyer/CollectionView";
import { Unavailable } from "@/components/buyer/Unavailable";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const r = await resolveBuyerPage(code);
  if (r.kind !== "ok" || !r.collection) return { title: "Properties", robots: { index: false } };
  const ls = await loadPublicListings(r.collection.listingIds.slice(0, 1));
  const img = ls[0]?.images[0]?.md;
  const title = r.greetingName ? `Properties selected for ${r.greetingName.split(" ")[0]}` : r.collection.title;
  return {
    title: { absolute: title },
    description: `${r.collection.listingIds.length} properties curated by ${r.agent.displayName}`,
    robots: { index: false },
    openGraph: { title, description: `${r.collection.listingIds.length} properties curated by ${r.agent.displayName}`, images: img ? [{ url: img }] : [] },
  };
}

export default async function CollectionPage({ params }: Props) {
  const { code } = await params;
  const r = await resolveBuyerPage(code);
  if (r.kind === "missing") notFound();
  if (r.kind === "unavailable") return <Unavailable agent={r.agent} message="This link is not active right now. Please contact the agent directly." />;
  if (!r.collection) notFound();
  const listings = await loadPublicListings(r.collection.listingIds);
  const initial: Record<string, CollectionItemState> = {};
  for (const a of r.actions) initial[a.listingId] = { saved: a.saved, reaction: a.reaction, rank: a.rank };
  return (
    <CollectionView
      code={code}
      title={r.collection.title}
      note={r.collection.note}
      agent={r.agent}
      listings={listings}
      initial={initial}
      identified={r.identified}
      greetingName={r.greetingName}
      showSplash={r.showSplash}
    />
  );
}
