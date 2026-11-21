"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";
import type { ListingStatus } from "@/db/schema";
import { publishAction, setStatusAction, verifyAction, archiveAction, closeDealAction } from "@/app/app/_actions/listings";

export function StatusControls({ id, status, buyers = [], closedWith }: { id: string; status: ListingStatus; buyers?: { id: string; name: string }[]; closedWith?: string | null }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");
  const [closing, setClosing] = useState<null | "sold" | "rented">(null);
  const router = useRouter();
  const set = (s: ListingStatus) => {
    if (s === "sold" || s === "rented") return setClosing(s);
    start(async () => {
      const r = await setStatusAction(id, s);
      if (!r.ok) setErr(r.error);
      router.refresh();
    });
  };
  const close = (leadId: string | null) =>
    start(async () => {
      const r = await closeDealAction(id, closing!, leadId);
      if (!r.ok) setErr(r.error);
      setClosing(null);
      router.refresh();
    });
  if (closing)
    return (
      <div className="space-y-2">
        <p className="text-sm font-semibold">🎉 {closing === "sold" ? "Sold" : "Rented"} to whom?</p>
        <div className="max-h-56 space-y-1.5 overflow-y-auto">
          {buyers.map((b) => (
            <button key={b.id} disabled={pending} onClick={() => close(b.id)} className="block w-full rounded-lg bg-stone-50 px-3 py-2 text-left text-sm font-medium ring-1 ring-stone-200 hover:bg-brand-50">
              {b.name}
            </button>
          ))}
        </div>
        <button disabled={pending} onClick={() => close(null)} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-stone-600 ring-1 ring-stone-200">Someone else / not via the app</button>
        <button onClick={() => setClosing(null)} className="w-full text-center text-xs text-stone-500">Cancel</button>
      </div>
    );
  const opts: { s: ListingStatus; label: string }[] = [
    { s: "available", label: "Available" },
    { s: "on_hold", label: "On hold" },
    { s: "sold", label: "Sold" },
    { s: "rented", label: "Rented" },
  ];
  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        {opts.map((o) => (
          <button key={o.s} disabled={pending} onClick={() => set(o.s)} className={`h-9 rounded-lg text-sm font-semibold ring-1 ${status === o.s ? "bg-stone-900 text-white ring-stone-900" : "bg-white text-stone-700 ring-stone-200 hover:bg-stone-50"}`}>
            {o.label}
          </button>
        ))}
      </div>
      {closedWith ? <p className="mt-2 text-xs text-emerald-700">Closed with {closedWith} ✓</p> : null}
      {err ? <p className="mt-2 text-xs text-red-600">{err}</p> : null}
      <form action={archiveAction.bind(null, id)} onSubmit={(e) => { if (!confirm("Remove this property? Its links will stop showing it.")) e.preventDefault(); }}>
        <button className="mt-3 w-full text-center text-xs font-semibold text-red-600">Remove property</button>
      </form>
    </div>
  );
}

export function PublishButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");
  const router = useRouter();
  return (
    <>
      <button
        disabled={pending}
        onClick={() => start(async () => {
          const r = await publishAction(id);
          if (!r.ok) setErr(r.error);
          router.refresh();
        })}
        className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold ring-1 ring-stone-200"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Publish as is
      </button>
      {err ? <p className="text-xs text-red-600">{err}</p> : null}
    </>
  );
}

export function VerifyBanner({ id }: { id: string }) {
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  if (done)
    return (
      <p className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
        <CheckCircle2 className="h-4 w-4" /> Marked available — buyers see it&apos;s fresh.
      </p>
    );
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-amber-50 p-3 text-sm ring-1 ring-amber-200">
      <span className="text-amber-900">Is this property still available?</span>
      <button disabled={pending} onClick={() => start(async () => { await verifyAction(id); setDone(true); })} className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 font-semibold text-white">
        Yes, still available
      </button>
    </div>
  );
}
