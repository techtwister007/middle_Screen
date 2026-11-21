import { notFound } from "next/navigation";
import { requireAgent } from "@/lib/auth/session";
import { getListingWithProperty } from "@/modules/listings";
import { listingMedia } from "@/modules/media";
import { toPublicAgent, toPublicListing } from "@/modules/public";
import { ListingView } from "@/components/buyer/ListingView";

/** Agent-only preview of how buyers will see the page (no tracking). */
export default async function Preview({ params }: { params: Promise<{ id: string }> }) {
  const agent = await requireAgent();
  const { id } = await params;
  const row = await getListingWithProperty(id);
  if (!row || row.l.agentId !== agent.id) notFound();
  const pub = toPublicListing(row.l, row.p, await listingMedia(id));
  return (
    <div className="-mx-4 -mt-5">
      <p className="bg-amber-100 px-4 py-2 text-center text-sm font-semibold text-amber-900">Preview — this is what buyers will see</p>
      <ListingView listing={pub} agent={toPublicAgent(agent)} code="preview" backHref={`/app/properties/${id}`} initial={{ identified: false, name: null, saved: false, reaction: null }} />
    </div>
  );
}
