import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, MessageCircle, Phone } from "lucide-react";
import { getAgentByHandle, RESERVED_HANDLES } from "@/modules/agents";
import { getAccess } from "@/modules/billing";
import { agentPublicListings, toPublicAgent } from "@/modules/public";
import { generalListingShare } from "@/modules/shares";
import { AgentBar, PoweredBy } from "@/components/buyer/ListingView";
import { Unavailable } from "@/components/buyer/Unavailable";
import { AgentSiteFilters } from "@/components/buyer/AgentSiteFilters";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ handle: string }>; searchParams: Promise<{ purpose?: string; bhk?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const a = RESERVED_HANDLES.has(handle) ? null : await getAgentByHandle(handle);
  if (!a) return {};
  const p = toPublicAgent(a);
  return {
    title: { absolute: `${p.displayName} — Properties` },
    description: p.tagline ?? `Browse properties from ${p.displayName}${p.city ? ` in ${p.city}` : ""}.`,
    openGraph: { title: p.displayName, description: p.tagline ?? "Available properties", images: p.photoUrl || p.logoUrl ? [{ url: (p.logoUrl ?? p.photoUrl)! }] : [] },
  };
}

export default async function AgentSite({ params, searchParams }: Props) {
  const { handle } = await params;
  const sp = await searchParams;
  if (RESERVED_HANDLES.has(handle)) notFound();
  const a = await getAgentByHandle(handle);
  if (!a || !a.onboarded) notFound();
  const agent = toPublicAgent(a);
  const access = await getAccess(a.id);
  if (a.disabled || !access.pagesLive) return <Unavailable agent={agent} message="Contact me directly for available properties." />;
  let listings = await agentPublicListings(a.id);
  if (sp.purpose === "sale" || sp.purpose === "rent") listings = listings.filter((l) => l.purpose === sp.purpose);
  if (sp.bhk) listings = listings.filter((l) => String(l.bhk) === sp.bhk);
  const codes = await Promise.all(listings.map((l) => generalListingShare(a.id, l.id).then((s) => s.code)));

  return (
    <div style={{ ["--agent" as string]: agent.brandColor }} className="min-h-screen bg-stone-50">
      <header className="bg-agent text-white">
        <div className="mx-auto max-w-4xl px-4 pb-8 pt-8">
          <div className="flex items-center gap-4">
            {agent.photoUrl || agent.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={(agent.logoUrl ?? agent.photoUrl)!} alt="" className="h-20 w-20 rounded-full bg-white object-cover ring-4 ring-white/25" />
            ) : (
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white/15 font-display text-3xl font-bold">{agent.displayName.slice(0, 1)}</span>
            )}
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-extrabold leading-tight sm:text-3xl">{agent.displayName}</h1>
              {agent.company && agent.name ? <p className="text-white/85">{agent.name}</p> : null}
              {agent.city || agent.areas ? (
                <p className="mt-1 flex items-center gap-1 text-sm text-white/80">
                  <MapPin className="h-3.5 w-3.5" /> {[agent.areas, agent.city].filter(Boolean).join(" · ")}
                </p>
              ) : null}
            </div>
          </div>
          {agent.tagline ? <p className="mt-4 max-w-xl text-white/90">{agent.tagline}</p> : null}
          <div className="mt-5 flex gap-2">
            <a href={`tel:+${agent.phone}`} className="flex h-11 items-center gap-2 rounded-xl bg-white/15 px-4 font-semibold">
              <Phone className="h-4 w-4" /> Call
            </a>
            <a href={`https://wa.me/${agent.phone}?text=${encodeURIComponent("Hi, I saw your properties online.")}`} className="flex h-11 items-center gap-2 rounded-xl bg-white px-4 font-semibold text-agent">
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">
        <AgentSiteFilters handle={handle} purpose={sp.purpose} bhk={sp.bhk} />
        {listings.length === 0 ? (
          <p className="py-16 text-center text-stone-500">No properties listed right now. Message me for current options.</p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {listings.map((l, i) => (
              <Link key={l.id} href={`/p/${codes[i]}`} className="overflow-hidden rounded-3xl bg-white ring-1 ring-stone-200 transition hover:shadow-md">
                <div className="relative aspect-[16/10] bg-stone-200">
                  {l.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.images[0].md} alt={l.title} loading="lazy" className="h-full w-full object-cover" />
                  ) : null}
                  <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-semibold text-stone-800">For {l.purpose}</span>
                </div>
                <div className="p-4">
                  <p className="font-display text-lg font-extrabold text-agent">{l.price}</p>
                  <p className="font-semibold text-stone-900">{l.title}</p>
                  <p className="mt-0.5 text-sm text-stone-500">{[l.locality, l.city].filter(Boolean).join(", ")}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
        <div className="mt-10 flex items-center justify-between border-t border-stone-200 pt-5 text-xs text-stone-400">
          <AgentBar agent={agent} compact />
          <PoweredBy />
        </div>
      </main>
    </div>
  );
}
