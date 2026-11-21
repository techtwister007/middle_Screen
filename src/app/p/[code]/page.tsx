import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { LANG_COOKIE, isLang } from "@/lib/i18n/buyer";
import { resolveBuyerPage } from "@/modules/buyer-page";
import { loadPublicListings } from "@/modules/public";
import { ListingView } from "@/components/buyer/ListingView";
import { Unavailable } from "@/components/buyer/Unavailable";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const r = await resolveBuyerPage(code);
  if (r.kind !== "ok" || !r.share.listingId) return { title: "Property", robots: { index: false } };
  const [l] = await loadPublicListings([r.share.listingId]);
  if (!l) return { title: "Property", robots: { index: false } };
  const img = l.images[0]?.md;
  const desc = `${l.price}${l.locality ? ` · ${l.locality}` : ""} · Presented by ${r.agent.displayName}`;
  return {
    title: { absolute: `${l.title} · ${l.price}` },
    description: desc,
    robots: { index: false, follow: false },
    openGraph: { title: `${l.title} · ${l.price}`, description: desc, type: "website", images: img ? [{ url: img, width: 900, height: 675 }] : [], siteName: r.agent.displayName },
    twitter: { card: "summary_large_image", title: l.title, description: desc, images: img ? [img] : [] },
  };
}

export default async function PropertyPage({ params }: Props) {
  const { code } = await params;
  const r = await resolveBuyerPage(code);
  if (r.kind === "missing") notFound();
  if (r.kind === "unavailable") return <Unavailable agent={r.agent} message="This property link is not active right now. Please contact the agent directly." />;
  if (!r.share.listingId) notFound();
  const [l] = await loadPublicListings([r.share.listingId]);
  if (!l) return <Unavailable agent={r.agent} message="This property is no longer listed. Contact the agent for similar options." />;
  const a = r.actions.find((x) => x.listingId === l.id);
  return (
    <ListingView
      lang={langOf((await cookies()).get(LANG_COOKIE)?.value)}
      listing={l}
      agent={r.agent}
      code={code}
      greetingName={r.greetingName}
      showSplash={r.showSplash}
      visit={await r.visitFor(l.id)}
      initial={{ identified: r.identified, name: r.lead?.name ?? null, saved: !!a?.saved, reaction: a?.reaction ?? null }}
    />
  );
}

const langOf = (v: string | undefined) => (isLang(v) ? v : null);
