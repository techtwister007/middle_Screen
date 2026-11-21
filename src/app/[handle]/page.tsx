import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, MessageCircle, Phone, UserPlus } from "lucide-react";
import { getAgentByHandle, RESERVED_HANDLES } from "@/modules/agents";
import { getAccess } from "@/modules/billing";
import { agentPublicListings, toPublicAgent } from "@/modules/public";
import { generalListingShare } from "@/modules/shares";
import { PoweredBy } from "@/components/buyer/ListingView";
import { Unavailable } from "@/components/buyer/Unavailable";
import { AgentSiteFilters } from "@/components/buyer/AgentSiteFilters";
import { cookies } from "next/headers";
import { Heart } from "lucide-react";
import { BUYER_COOKIE } from "@/modules/buyer-page";
import { buyerActionsFor } from "@/modules/buyer";

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
  // Buyer's own saved properties from this agent (cookie-based, no login)
  const savedIds = new Set((await buyerActionsFor((await cookies()).get(BUYER_COOKIE)?.value, a.id)).filter((x) => x.saved).map((x) => x.listingId));
  const saved = listings.map((l, i) => ({ l, code: codes[i] })).filter((x) => savedIds.has(x.l.id));

  const initials = agent.displayName.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
  const vcard = ["BEGIN:VCARD", "VERSION:3.0", `FN:${agent.name || agent.displayName}`, agent.company ? `ORG:${agent.company}` : "", `TEL;TYPE=CELL:+${agent.phone}`, "END:VCARD"].filter(Boolean).join("\r\n");
  const sale = listings.filter((l) => l.purpose === "sale").length;
  const rent = listings.length - sale;

  return (
    <div style={{ ["--agent" as string]: agent.brandColor }} className="min-h-screen bg-stone-50 pb-10">
      <header className="rounded-b-[32px] bg-agent text-white">
        <div className="stagger mx-auto max-w-4xl px-5 pb-8 pt-8">
          <div className="flex items-center gap-4">
            {agent.photoUrl || agent.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={(agent.logoUrl ?? agent.photoUrl)!} alt="" className="h-20 w-20 rounded-[26px] bg-white object-cover shadow-float" />
            ) : (
              <span className="flex h-20 w-20 items-center justify-center rounded-[26px] bg-white text-[28px] font-semibold text-agent shadow-float">{initials}</span>
            )}
            <div className="min-w-0">
              <h1 className="text-[26px] font-semibold leading-tight tracking-tight sm:text-3xl">{agent.displayName}</h1>
              {agent.company && agent.name ? <p className="text-white/85">{agent.name}</p> : null}
              {agent.city || agent.areas ? (
                <p className="mt-1 flex items-center gap-1 text-sm text-white/80">
                  <MapPin className="h-3.5 w-3.5" /> {[agent.areas, agent.city].filter(Boolean).join(" · ")}
                </p>
              ) : null}
            </div>
          </div>
          {agent.tagline ? <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/90">{agent.tagline}</p> : null}
          <p className="tnum mt-4 text-sm text-white/80">{listings.length} propert{listings.length === 1 ? "y" : "ies"} available{sale && rent ? ` · ${sale} for sale, ${rent} for rent` : ""}</p>
          <div className="mt-5 grid grid-cols-3 gap-2 sm:flex">
            <a href={`tel:+${agent.phone}`} className="press flex h-12 items-center justify-center gap-2 rounded-[14px] bg-white/15 px-4 font-semibold">
              <Phone className="h-4 w-4" /> Call
            </a>
            <a href={`https://wa.me/${agent.phone}?text=${encodeURIComponent("Hi, I saw your properties online.")}`} className="press flex h-12 items-center justify-center gap-2 rounded-[14px] bg-white px-4 font-semibold text-agent [color:var(--agent)]">
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
            <a href={`data:text/vcard;charset=utf-8,${encodeURIComponent(vcard)}`} download={`${agent.displayName}.vcf`} className="press flex h-12 items-center justify-center gap-2 rounded-[14px] bg-white/15 px-4 font-semibold">
              <UserPlus className="h-4 w-4" /> Save
            </a>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 pt-5">
        {saved.length ? (
          <section className="mb-6">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><Heart className="h-5 w-5 fill-rose-500 text-rose-500" /> Your saved properties</h2>
            <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
              {saved.map(({ l, code }) => (
                <Link key={l.id} href={`/p/${code}`} className="press w-56 shrink-0 overflow-hidden rounded-[20px] bg-white shadow-card">
                  {l.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.images[0].sm} alt="" className="img-fade aspect-[4/3] w-full object-cover" />
                  ) : <div className="aspect-[4/3] bg-stone-200" />}
                  <div className="p-3"><p className="tnum font-bold text-agent">{l.price}</p><p className="truncate text-sm font-medium">{l.title}</p></div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
        <div className="sticky top-0 z-10 -mx-4 bg-stone-50/95 px-4 py-2 backdrop-blur">
          <AgentSiteFilters handle={handle} purpose={sp.purpose} bhk={sp.bhk} />
        </div>
        {listings.length === 0 ? (
          <p className="py-16 text-center text-stone-500">No properties listed right now. Message me for current options.</p>
        ) : (
          <div className="stagger mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {listings.map((l, i) => (
              <Link key={l.id} href={`/p/${codes[i]}`} className="press group overflow-hidden rounded-[24px] bg-white shadow-card transition-shadow hover:shadow-float">
                <div className="relative aspect-[4/3] overflow-hidden bg-stone-200">
                  {l.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.images[0].md} alt={l.title} loading="lazy" className="img-fade h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                  ) : null}
                  <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-stone-900 shadow-card">For {l.purpose}</span>
                </div>
                <div className="p-4">
                  <p className="tnum font-display text-xl font-bold tracking-tight text-agent">{l.price}</p>
                  <p className="mt-0.5 font-semibold leading-snug text-stone-900">{l.title}</p>
                  <p className="mt-1 text-sm text-stone-500">{[l.locality, l.city].filter(Boolean).join(", ")}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
        <div className="mt-10 flex items-center justify-between text-[13px] text-stone-500">
          <span className="truncate">{agent.displayName}</span>
          <PoweredBy />
        </div>
      </main>
    </div>
  );
}
