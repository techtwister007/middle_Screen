"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Heart, ThumbsDown, ThumbsUp, Scale, MapPin, X, MessageCircle, Phone } from "lucide-react";
import type { PublicAgent, PublicListing } from "@/modules/public";
import { AgentBar, PoweredBy, Splash } from "./ListingView";
import { IdentifySheet, Sheet } from "./Sheets";
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
    if (next === "like" && !identified) setAskId(true);
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

  return (
    <div style={{ ["--agent" as string]: agent.brandColor }} className="min-h-screen bg-stone-50 pb-28">
      {splash ? <Splash agent={agent} onDone={() => setSplash(false)} /> : null}
      <header className="bg-white">
        <div className="mx-auto max-w-3xl px-4 pb-6 pt-5">
          <AgentBar agent={agent} />
          <h1 className="mt-5 font-display text-[26px] font-extrabold leading-tight tracking-tight">{greetingName ? `Properties selected for ${greetingName.split(" ")[0]}` : title}</h1>
          <p className="mt-1 text-stone-500">
            {listings.length} propert{listings.length === 1 ? "y" : "ies"} · curated by {agent.displayName}
          </p>
          {note ? <p className="mt-3 rounded-2xl bg-stone-50 p-3 text-sm text-stone-700 ring-1 ring-stone-200">“{note}”</p> : null}
          <p className="mt-4 text-sm text-stone-500">👍 Like, 👎 skip, or tap the number to rank your favourites. {agent.displayName} sees what you prefer.</p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 pt-4">
        {sorted.map((l) => {
          const s = get(l.id);
          return (
            <article key={l.id} className={`overflow-hidden rounded-3xl bg-white ring-1 transition ${s.reaction === "dislike" ? "opacity-55 ring-stone-200" : s.rank ? "ring-2 ring-agent" : "ring-stone-200"}`}>
              <Link href={`/c/${code}/${l.ref}`} className="block">
                <div className="relative aspect-[16/10] bg-stone-200">
                  {l.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.images[0].md} alt={l.title} loading="lazy" className="h-full w-full object-cover" />
                  ) : null}
                  {s.rank ? <span className="absolute left-3 top-3 rounded-full bg-agent px-2.5 py-1 text-xs font-bold text-white shadow">Priority {s.rank}</span> : null}
                  {l.status === "sold" || l.status === "rented" ? (
                    <span className="absolute right-3 top-3 rounded-full bg-stone-900 px-2.5 py-1 text-xs font-bold uppercase text-white">{l.status}</span>
                  ) : l.images.length ? (
                    <span className="absolute right-3 top-3 rounded-full bg-black/55 px-2 py-0.5 text-xs font-semibold text-white">{l.images.length} photo{l.images.length === 1 ? "" : "s"}</span>
                  ) : null}
                </div>
                <div className="p-4 pb-2">
                  <p className="font-display text-xl font-extrabold text-agent">{l.price}</p>
                  <h2 className="mt-0.5 font-semibold text-stone-900">{l.title}</h2>
                  <p className="mt-0.5 flex items-center gap-1 text-sm text-stone-500">
                    <MapPin className="h-3.5 w-3.5" /> {[l.locality, l.city].filter(Boolean).join(", ") || "—"}
                  </p>
                  <p className="mt-2 text-sm text-stone-600">{[l.bhk ? `${l.bhk} BHK` : null, l.area, l.specs.find((x) => x.label === "Furnishing")?.value].filter(Boolean).join(" · ")}</p>
                </div>
              </Link>
              <div className="flex items-center gap-2 px-4 pb-4 pt-2">
                <button onClick={() => react(l.id, "like")} aria-label="Like" className={`flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold ${s.reaction === "like" ? "bg-emerald-600 text-white" : "bg-stone-100 text-stone-700"}`}>
                  <ThumbsUp className="h-4 w-4" /> Like
                </button>
                <button onClick={() => react(l.id, "dislike")} aria-label="Not for me" className={`flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold ${s.reaction === "dislike" ? "bg-stone-800 text-white" : "bg-stone-100 text-stone-700"}`}>
                  <ThumbsDown className="h-4 w-4" /> Skip
                </button>
                <button onClick={() => toggleRank(l.id)} aria-label="Rank" className={`flex h-10 w-12 items-center justify-center rounded-xl text-sm font-bold ${s.rank ? "bg-agent text-white" : "bg-stone-100 text-stone-500"}`}>
                  {s.rank ? `#${s.rank}` : "#"}
                </button>
                <button onClick={() => toggleCompare(l.id)} aria-label="Compare" className={`flex h-10 w-12 items-center justify-center rounded-xl ${compare.includes(l.id) ? "bg-sky-600 text-white" : "bg-stone-100 text-stone-500"}`}>
                  <Scale className="h-4 w-4" />
                </button>
              </div>
            </article>
          );
        })}
        <div className="flex justify-center py-6 text-xs text-stone-400">
          <PoweredBy />
        </div>
      </main>

      <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl gap-2 px-4 py-3">
          {compare.length >= 2 ? (
            <button onClick={() => { setShowCompare(true); track(code, "compare", { ids: compare }); }} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-sky-600 font-bold text-white">
              <Scale className="h-5 w-5" /> Compare {compare.length}
            </button>
          ) : (
            <>
              <a href={`tel:+${agent.phone}`} onClick={() => track(code, "call")} className="flex h-12 w-12 items-center justify-center rounded-xl bg-stone-100 text-stone-800" aria-label="Call agent">
                <Phone className="h-5 w-5" />
              </a>
              <a
                href={`https://wa.me/${agent.phone}?text=${encodeURIComponent(`Hi ${agent.name || agent.displayName}, about the properties you shared${ranked.length ? ` — my top pick is "${listings.find((l) => l.id === ranked[0])?.title}"` : ""}.`)}`}
                target="_blank"
                rel="noopener"
                onClick={() => track(code, "whatsapp")}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] font-bold text-white"
              >
                <MessageCircle className="h-5 w-5" /> {ranked.length ? "Send my top picks" : `WhatsApp ${agent.name?.split(" ")[0] || "agent"}`}
              </a>
            </>
          )}
        </div>
      </div>

      <CompareSheet open={showCompare} onClose={() => setShowCompare(false)} items={listings.filter((l) => compare.includes(l.id))} />
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
                    <img src={l.images[0].sm} alt="" className="mb-1 aspect-[4/3] w-full rounded-lg object-cover" />
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
      <button onClick={onClose} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-stone-100 font-semibold">
        <X className="h-4 w-4" /> Close
      </button>
    </Sheet>
  );
}
