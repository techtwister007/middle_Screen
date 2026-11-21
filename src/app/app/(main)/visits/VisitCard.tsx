"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle, Phone } from "lucide-react";
import { visitAction } from "@/app/app/_actions/misc";

type V = { id: string; status: string; requestedDate: string | null; requestedSlot: string | null; scheduledAt: string | null; message: string | null; outcome: string | null };
const slotHour: Record<string, string> = { morning: "10:00", afternoon: "14:00", evening: "17:00" };
const fmt = (iso: string) => new Date(iso).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

export function VisitCard({ v, lead, listing }: { v: V; lead: { id: string; name: string; phone: string | null } | null; listing: { id: string; title: string } | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [when, setWhen] = useState(v.scheduledAt ? new Date(new Date(v.scheduledAt).getTime() + 5.5 * 3600000).toISOString().slice(0, 16) : v.requestedDate ? `${v.requestedDate}T${slotHour[v.requestedSlot ?? "morning"]}` : "");
  const [mode, setMode] = useState<null | "time" | "outcome">(null);
  const [fb, setFb] = useState("");
  const [err, setErr] = useState("");
  const run = (op: Parameters<typeof visitAction>[1], extra: Parameters<typeof visitAction>[2] = {}) =>
    start(async () => {
      const r = await visitAction(v.id, op, extra);
      if (!r.ok) setErr(r.error);
      else setMode(null);
      router.refresh();
    });
  const timeText = v.scheduledAt ? fmt(v.scheduledAt) : when ? fmt(`${when}:00+05:30`) : "";
  const confirmMsg = lead ? `Hi ${lead.name.split(" ")[0] || ""}! Your site visit for ${listing?.title ?? "the property"} is confirmed for ${timeText}. See you there!` : "";
  const isPast = ["completed", "declined", "cancelled", "no_show"].includes(v.status);

  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold">{lead ? <Link href={`/app/leads/${lead.id}`}>{lead.name || lead.phone}</Link> : "Buyer"}</p>
          <p className="truncate text-sm text-stone-500">{listing ? <Link href={`/app/properties/${listing.id}`}>{listing.title}</Link> : "—"}</p>
        </div>
        <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-semibold capitalize text-stone-700">{v.status.replace("_", " ")}</span>
      </div>
      <p className="mt-2 text-sm">
        {v.scheduledAt ? <b>{fmt(v.scheduledAt)}</b> : <>Requested: <b>{v.requestedDate}</b> · {v.requestedSlot}</>}
        {v.outcome ? <span className="ml-2 text-stone-500">· {v.outcome.replace("_", " ")}</span> : null}
      </p>
      {v.message ? <p className="mt-1 text-sm text-stone-600">“{v.message}”</p> : null}

      {!isPast ? (
        <div className="mt-3 space-y-2">
          {mode === "time" || v.status === "requested" ? (
            <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} aria-label="Visit time" className="block w-full rounded-xl px-3 py-2 text-sm ring-1 ring-stone-300" />
          ) : null}
          <div className="flex flex-wrap gap-2">
            {v.status === "requested" ? (
              <>
                <button disabled={pending} onClick={() => run("confirm", { when })} className="h-9 rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white">Confirm</button>
                <button disabled={pending} onClick={() => run("decline")} className="h-9 rounded-lg bg-stone-100 px-3 text-sm font-semibold">Decline</button>
              </>
            ) : mode === "time" ? (
              <button disabled={pending} onClick={() => run("reschedule", { when })} className="h-9 rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white">Save new time</button>
            ) : mode === "outcome" ? null : (
              <>
                <button disabled={pending} onClick={() => setMode("outcome")} className="h-9 rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white">Mark done</button>
                <button disabled={pending} onClick={() => setMode("time")} className="h-9 rounded-lg bg-stone-100 px-3 text-sm font-semibold">Reschedule</button>
                <button disabled={pending} onClick={() => run("no_show")} className="h-9 rounded-lg bg-stone-100 px-3 text-sm font-semibold">No-show</button>
                <button disabled={pending} onClick={() => run("cancel")} className="h-9 rounded-lg bg-stone-100 px-3 text-sm font-semibold">Cancel</button>
              </>
            )}
            {lead?.phone ? (
              <>
                <a href={`https://wa.me/${lead.phone}?text=${encodeURIComponent(confirmMsg)}`} target="_blank" rel="noopener" className="flex h-9 items-center gap-1.5 rounded-lg bg-[#25D366] px-3 text-sm font-semibold text-white">
                  <MessageCircle className="h-4 w-4" /> {v.status === "requested" ? "Message" : "Send confirmation"}
                </a>
                <a href={`tel:+${lead.phone}`} aria-label="Call" className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-100"><Phone className="h-4 w-4" /></a>
              </>
            ) : null}
          </div>
          {mode === "outcome" ? (
            <div className="space-y-2 rounded-xl bg-stone-50 p-3">
              <p className="text-sm font-semibold">How did it go?</p>
              <input value={fb} onChange={(e) => setFb(e.target.value)} placeholder="Feedback (optional)" className="block w-full rounded-lg px-3 py-2 text-sm ring-1 ring-stone-300" />
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => run("complete", { outcome: "liked", feedback: fb })} className="h-9 rounded-lg bg-emerald-600 text-sm font-semibold text-white">Liked it</button>
                <button onClick={() => run("complete", { outcome: "negotiating", feedback: fb })} className="h-9 rounded-lg bg-amber-500 text-sm font-semibold text-white">Negotiating</button>
                <button onClick={() => run("complete", { outcome: "not_liked", feedback: fb })} className="h-9 rounded-lg bg-stone-700 text-sm font-semibold text-white">Not for them</button>
              </div>
            </div>
          ) : null}
          {err ? <p className="text-xs text-red-600">{err}</p> : null}
        </div>
      ) : v.status === "completed" ? null : null}
    </div>
  );
}
