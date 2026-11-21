import { notFound } from "next/navigation";
import { requireAgent } from "@/lib/auth/session";
import { getListingWithProperty } from "@/modules/listings";
import { listingMedia } from "@/modules/media";
import { PageHeader } from "@/components/ui";
import { Editor } from "./Editor";

export const metadata = { title: "Edit property" };

export default async function EditProperty({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> }) {
  const agent = await requireAgent();
  const { id } = await params;
  const sp = await searchParams;
  const row = await getListingWithProperty(id);
  if (!row || row.l.agentId !== agent.id) notFound();
  const { l, p } = row;
  const ms = await listingMedia(id);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader back={`/app/properties/${id}`} title={sp.new ? "Review your property" : "Edit property"} subtitle={sp.new ? "We pre-filled what we could. Add photos, check details, publish." : `Ref ${l.ref}`} />
      <Editor
        id={id}
        isDraft={l.status === "draft"}
        missing={l.missing}
        media={ms.map((m) => ({ id: m.id, kind: m.kind, thumb: m.urlSm ?? m.url, url: m.url }))}
        initial={{
          purpose: l.purpose,
          type: p.type,
          title: l.title,
          description: l.description,
          priceMode: l.priceMode,
          price: l.price,
          priceMax: l.priceMax,
          negotiable: l.negotiable,
          fields: l.fields,
          locality: p.locality ?? "",
          city: p.city ?? agent.city ?? "",
          lat: p.lat,
          lng: p.lng,
          building: p.building ?? "",
          unit: p.unit ?? "",
          showBuilding: l.showBuilding,
          locationPrivacy: l.locationPrivacy,
          youtubeUrl: l.youtubeUrl ?? "",
          visibility: l.visibility,
        }}
      />
    </div>
  );
}
