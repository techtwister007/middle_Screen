"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Heart, ThumbsDown, ThumbsUp, Scale, MapPin, X, MessageCircle, Phone } from "lucide-react";
import type { PublicAgent, PublicListing } from "@/modules/public";
import { PoweredBy, Splash } from "./ListingView";
import { IdentifySheet, RequirementSheet, Sheet, shouldPromptIdentity } from "./Sheets";
import { buyerAction, startDwell, track } from "./api";

export type CollectionItemState = { saved: boolean; reaction: "like" | "dislike" | null; rank: number | null };

export function CollectionView({
  code,
  title,
  note,
  agent,
  listings,
  initial,
  identified: initialIdentified,
  greetingName,
  showSplash,
}: {
  code: string;
  title: string;
  note: string | null;
  agent: PublicAgent;
  listings: PublicListing[];
  initial: Record<string, CollectionItemState>;
  identified: boolean;
  greetingName: string | null;
  showSplash: boolean;
}) {
  const [st, setSt] = useState(initial);
  const [identified, setIdentified] = useState(initialIdentified);
  const [askId, setAskId] = useState(false);
  const [compare, setCompare] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [splash, setSplash] = useState(showSplash);
  const [req, setReq] = useState(false);

  useEffect(() => {
    track(code, "open", {});
    return startDwell(code);
  }, [code]);

  const get = (id: string): CollectionItemState => st[id] ?? { saved: false, reaction: null, rank: null };
  const update = async (id: string, patch: Partial<CollectionItemState>, action: string, extra: Record<string, unknown>) => {
    setSt((s) => ({ ...s, [id]: { ...get(id), ...patch } }));
    await buyerAction({ code, action, listingId: id, ...extra });
  };
  const react = (id: string, r: "like" | "dislike") => {
    const next = get(id).reaction === r ? null : r;
    update(id, { reaction: next }, "react", { reaction: next });
    if (next === "like" && !identified && shouldPromptIdentity()) setAskId(true);
  };
  const ranked = useMemo(() => Object.entries(st).filter(([, v]) => v.rank).sort((a, b) => a[1].rank! - b[1].rank!).map(([k]) => k), [st]);
  const toggleRank = (id: string) => {
    const cur = get(id).rank;
    if (cur) {
      // remove and compact
      const rest = ranked.filter((x) => x !== id);
      const next: Record<string, CollectionItemState> = { ...st, [id]: { ...get(id), rank: null } };
      rest.forEach((x, i) => (next[x] = { ...get(x), rank: i + 1 }));
      setSt(next);
      buyerAction({ code, action: "rank", listingId: id, rank: null });
      rest.forEach((x, i) => buyerAction({ code, action: "rank", listingId: x, rank: i + 1 }));
    } else update(id, { rank: ranked.length + 1 }, "rank", { rank: ranked.length + 1 });
  };
  const toggleCompare = (id: string) => setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length >= 3 ? c : [...c, id]));
  const sorted = useMemo(() => {
    const score = (l: PublicListing) => {
      const s = get(l.id);
      return (s.rank ? 100 - s.rank : 0) + (s.reaction === "like" ? 10 : s.reaction === "dislike" ? -50 : 0);
    };
    return [...listings].sort((a, b) => score(b) - score(a));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listings, st]);

  const reviewed = listings.filter((l) => get(l.id).reaction || get(l.id).rank).length;
  const initials = agent.displayName.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
  return (
    <div style={{ ["--agent" as string]: agent.brandColor }} className="min-h-screen bg-stone-50 pb-32">
      {splash ? <Splash agent={agent} onDone={() => setSplash(false)} /> : null}
      <header className="mx-auto max-w-3xl px-4 pb-2 pt-5">
        <div className="stagger">
          <div className="flex items-center gap-2.5">
            {agent.logoUrl || agent.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={(agent.logoUrl ?? agent.photoUrl)!} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-agent text-sm font-semibold text-white">{initials}</span>
            )}
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[15px] font-semibold">{agent.displayName}</p>
              <p className="truncate text-[13px] text-stone-500">Picked for you</p>
            </div>
          </div>
          <h1 className="mt-5 text-[28px] font-semibold leading-[1.12] tracking-tight text-balance">{greetingName ? `Properties selected for ${greetingName.split(" ")[0]}` : title}</h1>
          <p className="mt-1.5 text-[15px] text-stone-500">
            {listings.length} propert{listings.length === 1 ? "y" : "ies"} · curated by {agent.displayName}
          </p>
          {note ? (
            <div className="mt-4 flex gap-3 rounded-[20px] bg-white p-4 shadow-card">
              <span className="text-3xl leading-none text-agent" aria-hidden>“</span>
              <p className="text-[15px] leading-relaxed text-stone-700">{note}</p>
            </div>
          ) : null}
          <div className="mt-5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-stone-700">You&apos;ve reviewed {reviewed} of {listings.length}</span>
              <span className="text-stone-500">Like, skip or rank</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-200">
              <div className="h-full rounded-full bg-agent transition-[width] duration-500 ease-[cubic-bezier(.22,1,.36,1)]" style={{ width: `${listings.length ? (reviewed / listings.length) * 100 : 0}%` }} />
            </div>
          </div>
        </div>
      </header>

      <main className="stagger mx-auto max-w-3xl space-y-4 px-4 pt-4">
        {sorted.map((l) => {
          const s = get(l.id);
          return (
            <article key={l.id} className={`overflow-hidden rounded-[24px] bg-white shadow-card transition-[opacity,box-shadow] duration-300 ${s.reaction === "dislike" ? "opacity-55" : ""} ${s.rank ? "ring-2 ring-agent" : ""}`}>
              <Link href={`/c/${code}/${l.ref}`} className="group block">
                <div className="relative aspect-[4/3] overflow-hidden bg-stone-200">
                  {l.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.images[0].md} alt={l.title} loading="lazy" className="img-fade h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                  ) : null}
                  {s.rank ? <span className="absolute left-3 top-3 rounded-full bg-agent px-3 py-1 text-xs font-semibold text-white shadow-card [animation:pop_.45s_cubic-bezier(.22,1,.36,1)]">Priority {s.rank}</span> : null}
                  {l.status === "sold" || l.status === "rented" ? (
                    <span className="absolute right-3 top-3 rounded-full bg-[#4a544e] px-2.5 py-1 text-xs font-semibold capitalize text-white">{l.status}</span>
                  ) : l.images.length ? (
                    <span className="absolute right-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">{l.images.length} photo{l.images.length === 1 ? "" : "s"}</span>
                  ) : null}
                </div>
                <div className="px-4 pb-1 pt-3.5">
                  <p className="tnum font-display text-[22px] font-bold tracking-tight text-agent">{l.price}</p>
                  <h2 className="mt-0.5 text-[16px] font-semibold leading-snug text-stone-900">{l.title}</h2>
                  <p className="mt-1 flex items-center gap-1 text-sm text-stone-500">
                    <MapPin className="h-3.5 w-3.5" /> {[l.locality, l.city].filter(Boolean).join(", ") || "—"}
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {[l.bhk ? `${l.bhk} BHK` : null, l.area, l.specs.find((x) => x.label === "Furnishing")?.value].filter(Boolean).map((f) => (
                      <span key={f} className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700">{f}</span>
                    ))}
                  </div>
                </div>
              </Link>
              <div className="grid grid-cols-2 gap-2 px-4 pb-2 pt-3">
                <button onClick={() => react(l.id, "like")} aria-label="Like" className={`press flex h-11 items-center justify-center gap-1.5 rounded-[14px] text-sm font-semibold ${s.reaction === "like" ? "bg-emerald-700 text-white" : "bg-stone-100 text-stone-800"}`}>
                  <ThumbsUp key={String(s.reaction === "like")} className={`h-4 w-4 ${s.reaction === "like" ? "[animation:pop_.45s_cubic-bezier(.22,1,.36,1)]" : ""}`} /> Like
                </button>
                <button onClick={() => react(l.id, "dislike")} aria-label="Not for me" className={`press flex h-11 items-center justify-center gap-1.5 rounded-[14px] text-sm font-semibold ${s.reaction === "dislike" ? "bg-[#4a544e] text-white" : "bg-stone-100 text-stone-800"}`}>
                  <ThumbsDown className="h-4 w-4" /> Not for me
                </button>
              </div>
              <div className="flex gap-2 px-4 pb-4">
                <button onClick={() => toggleRank(l.id)} aria-label="Rank" className={`press flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold ${s.rank ? "bg-agent text-white" : "bg-white text-stone-700 ring-1 ring-stone-200"}`}>
                  {s.rank ? `#${s.rank} favourite` : "Rank it"}
                </button>
                <button onClick={() => toggleCompare(l.id)} aria-label="Compare" className={`press flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold ${compare.includes(l.id) ? "bg-sky-700 text-white" : "bg-white text-stone-700 ring-1 ring-stone-200"}`}>
                  <Scale className="h-3.5 w-3.5" /> {compare.includes(l.id) ? "Comparing" : "Compare"}
                </button>
              </div>
            </article>
          );
        })}
        <button onClick={() => setReq(true)} className="press flex w-full items-center gap-3 rounded-[22px] bg-white p-4 text-left shadow-card">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-100 text-agent"><MessageCircle className="h-5 w-5" /></span>
          <span>
            <span className="block font-semibold">None of these quite right?</span>
            <span className="block text-sm text-stone-500">Tell {agent.displayName} what you&apos;re looking for.</span>
          </span>
        </button>
        <div className="flex justify-center py-6 text-[13px] text-stone-500">
          <PoweredBy />
        </div>
      </main>

      <div className="fixed inset-x-3 bottom-[calc(10px+env(safe-area-inset-bottom))] z-30 [animation:rise_.5s_.3s_cubic-bezier(.22,1,.36,1)_backwards]">
        <div className="mx-auto flex max-w-3xl gap-2 rounded-[22px] bg-white p-2 shadow-float">
          {compare.length >= 2 ? (
            <button onClick={() => { setShowCompare(true); track(code, "compare", { ids: compare }); }} className="press flex h-12 flex-1 items-center justify-center gap-2 rounded-[14px] bg-sky-700 font-semibold text-white">
              <Scale className="h-5 w-5" /> Compare {compare.length}
            </button>
          ) : (
            <>
              <a href={`tel:+${agent.phone}`} onClick={() => track(code, "call")} className="press flex h-12 w-12 items-center justify-center rounded-[14px] bg-stone-100 text-stone-800" aria-label="Call agent">
                <Phone className="h-5 w-5" />
              </a>
              <a
                href={`https://wa.me/${agent.phone}?text=${encodeURIComponent(`Hi ${agent.name || agent.displayName}, about the properties you shared${ranked.length ? ` — my top pick is "${listings.find((l) => l.id === ranked[0])?.title}"` : ""}.`)}`}
                target="_blank"
                rel="noopener"
                onClick={() => track(code, "whatsapp")}
                className="press flex h-12 flex-1 items-center justify-center gap-2 rounded-[14px] bg-[#1f8f4e] font-semibold text-white"
              >
                <MessageCircle className="h-5 w-5" /> {ranked.length ? "Send my top picks" : `WhatsApp ${agent.name?.split(" ")[0] || "agent"}`}
              </a>
            </>
          )}
        </div>
      </div>

      <CompareSheet open={showCompare} onClose={() => setShowCompare(false)} items={listings.filter((l) => compare.includes(l.id))} />
      <RequirementSheet open={req} onClose={() => setReq(false)} code={code} agentName={agent.displayName} identified={identified} defaultPurpose={listings[0]?.purpose ?? "sale"} onIdentified={() => setIdentified(true)} />
      <IdentifySheet open={askId} onClose={() => setAskId(false)} code={code} agentName={agent.displayName} title="Keep your shortlist" cta="Save my picks" onDone={() => setIdentified(true)} />
    </div>
  );
}

function CompareSheet({ open, onClose, items }: { open: boolean; onClose: () => void; items: PublicListing[] }) {
  const rows: { label: string; get: (l: PublicListing) => string }[] = [
    { label: "Price", get: (l) => l.price },
    { label: "Type", get: (l) => l.typeLabel },
    { label: "BHK", get: (l) => (l.bhk ? `${l.bhk} BHK` : "—") },
    { label: "Area", get: (l) => l.area ?? "—" },
    { label: "Location", get: (l) => [l.locality, l.city].filter(Boolean).join(", ") || "—" },
    ...["Furnishing", "Floor", "Bathrooms", "Parking", "Facing", "Possession", "Age"].map((k) => ({ label: k, get: (l: PublicListing) => l.specs.find((s) => s.label === k)?.value ?? "—" })),
    { label: "Amenities", get: (l) => (l.amenities.length ? l.amenities.slice(0, 6).join(", ") : "—") },
  ];
  return (
    <Sheet open={open} onClose={onClose} title="Compare">
      <div className="-mx-5 max-h-[70vh] overflow-auto px-5">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="w-24" />
              {items.map((l) => (
                <th key={l.id} className="p-1 text-left align-top">
                  {l.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.images[0].sm} alt="" className="mb-1 aspect-[4/3] w-full rounded-xl object-cover" />
                  ) : null}
                  <span className="line-clamp-2 font-semibold">{l.title}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-t border-stone-100">
                <td className="py-2 pr-2 text-xs font-medium text-stone-500">{r.label}</td>
                {items.map((l) => (
                  <td key={l.id} className="p-1 py-2 align-top text-stone-800">
                    {r.get(l)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={onClose} className="press mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-white font-semibold shadow-card">
        <X className="h-4 w-4" /> Close
      </button>
    </Sheet>
  );
}
