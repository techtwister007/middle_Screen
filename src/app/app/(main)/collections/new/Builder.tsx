"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Search } from "lucide-react";
import { createCollectionAction } from "@/app/app/_actions/misc";

type Item = { id: string; title: string; price: string; locality: string; thumb: string | null; match: boolean };

export function CollectionBuilder({ items, leads, presetLead }: { items: Item[]; leads: { id: string; name: string; phone: string | null }[]; presetLead: { id: string; name: string } | null }) {
  const router = useRouter();
  const [sel, setSel] = useState<string[]>(items.filter((i) => i.match).map((i) => i.id).slice(0, 6));
  const [q, setQ] = useState("");
  const [title, setTitle] = useState(presetLead ? `Properties selected for ${presetLead.name.split(" ")[0]}` : "Properties selected for you");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const shown = useMemo(() => items.filter((i) => !q || `${i.title} ${i.locality}`.toLowerCase().includes(q.toLowerCase())), [items, q]);
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const create = async () => {
    setBusy(true);
    setErr("");
    const r = await createCollectionAction({ title, listingIds: sel, leadId: presetLead?.id ?? null, note });
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    router.push(`/app/collections/${r.data!.id}${presetLead ? `?shareTo=${presetLead.id}` : "?created=1"}`);
  };

  return (
    <div className="space-y-4 pb-24">
      <div className="space-y-2 rounded-2xl bg-white p-4 ring-1 ring-stone-200">
        <input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Collection title" className="block w-full rounded-xl px-3 py-2.5 font-semibold ring-1 ring-stone-300" />
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Personal note for the buyer (optional)" className="block w-full rounded-xl px-3 py-2.5 text-sm ring-1 ring-stone-300" />
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search properties" className="block w-full rounded-xl bg-white py-2.5 pl-9 pr-3 ring-1 ring-stone-200" />
      </div>
      <div className="divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200">
        {shown.map((i) => {
          const on = sel.includes(i.id);
          return (
            <button key={i.id} onClick={() => toggle(i.id)} className={`flex w-full items-center gap-3 p-3 text-left ${on ? "bg-brand-50" : "hover:bg-stone-50"}`}>
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ring-1 ${on ? "bg-brand-700 text-white ring-brand-700" : "ring-stone-300"}`}>{on ? <Check className="h-4 w-4" /> : null}</span>
              {i.thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={i.thumb} alt="" className="h-12 w-16 rounded-lg object-cover" />
              ) : (
                <span className="h-12 w-16 rounded-lg bg-stone-100" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{i.title}</span>
                <span className="block truncate text-xs text-stone-500">{i.price} · {i.locality}</span>
              </span>
              {i.match ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">Match</span> : null}
            </button>
          );
        })}
      </div>
      <div className="safe-bottom fixed inset-x-0 bottom-16 z-20 border-t border-stone-200 bg-white/95 backdrop-blur lg:bottom-0">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <span className="mr-auto text-sm font-semibold">{sel.length} selected {err ? <span className="ml-2 text-red-600">{err}</span> : null}</span>
          <button disabled={busy || !sel.length} onClick={create} className="flex h-11 items-center gap-2 rounded-xl bg-brand-700 px-5 font-semibold text-white disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Create & share
          </button>
        </div>
      </div>
      <input type="hidden" value={leads.length} readOnly />
    </div>
  );
}
