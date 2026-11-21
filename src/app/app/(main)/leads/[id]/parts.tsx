"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import type { LeadStage } from "@/db/schema";
import { addNoteAction, setFollowUpAction, setStageAction, updateLeadInfoAction } from "@/app/app/_actions/leads";

const stages: { v: LeadStage; l: string }[] = [
  { v: "new", l: "New" },
  { v: "exploring", l: "Exploring" },
  { v: "interested", l: "Interested" },
  { v: "visit", l: "Site visit" },
  { v: "negotiating", l: "Negotiating" },
  { v: "closed", l: "Closed 🎉" },
  { v: "lost", l: "Lost" },
];

export function StageSelect({ id, stage }: { id: string; stage: LeadStage }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <select
      aria-label="Stage"
      defaultValue={stage}
      disabled={pending}
      onChange={(e) => start(async () => { await setStageAction(id, e.target.value as LeadStage); router.refresh(); })}
      className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-700 outline-none"
    >
      {stages.map((s) => (
        <option key={s.v} value={s.v}>{s.l}</option>
      ))}
    </select>
  );
}

const toLocalInput = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() + 5.5 * 3600000).toISOString().slice(0, 16) : "");

export function FollowUp({ id, at, note }: { id: string; at: string | null; note: string | null }) {
  const [when, setWhen] = useState(toLocalInput(at));
  const [n, setN] = useState(note ?? "");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const router = useRouter();
  const quick = (days: number) => {
    const d = new Date(Date.now() + days * 86400000);
    d.setUTCHours(4, 30, 0, 0); // 10:00 IST
    setWhen(toLocalInput(d.toISOString()));
  };
  const save = (clear = false) =>
    start(async () => {
      const r = await setFollowUpAction(id, clear ? null : when || null, n);
      setMsg(r.ok ? (clear ? "Cleared" : "Saved ✓") : r.error);
      if (clear) setWhen("");
      router.refresh();
    });
  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        {[["Tomorrow", 1], ["3 days", 3], ["1 week", 7]].map(([l, d]) => (
          <button key={l} type="button" onClick={() => quick(Number(d))} className="rounded-lg bg-stone-100 px-2.5 py-1 text-xs font-semibold">{l}</button>
        ))}
      </div>
      <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} aria-label="Follow-up time" className="block w-full rounded-xl px-3 py-2 text-sm ring-1 ring-stone-300" />
      <input value={n} onChange={(e) => setN(e.target.value)} placeholder="What to discuss (optional)" className="block w-full rounded-xl px-3 py-2 text-sm ring-1 ring-stone-300" />
      <div className="flex gap-2">
        <button disabled={pending || !when} onClick={() => save()} className="h-9 flex-1 rounded-lg bg-brand-700 text-sm font-semibold text-white disabled:opacity-50">Set reminder</button>
        {at ? <button disabled={pending} onClick={() => save(true)} className="h-9 rounded-lg bg-stone-100 px-3 text-sm font-semibold">Done</button> : null}
      </div>
      {msg ? <p className="text-xs text-stone-500">{msg}</p> : null}
    </div>
  );
}

export function NoteForm({ id }: { id: string }) {
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="space-y-2">
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="Call notes, budget, family preferences…" aria-label="New note" className="block w-full rounded-xl px-3 py-2 text-sm ring-1 ring-stone-300" />
      <button disabled={pending || !text.trim()} onClick={() => start(async () => { const r = await addNoteAction(id, text); if (r.ok) setText(""); router.refresh(); })} className="h-9 w-full rounded-lg bg-stone-900 text-sm font-semibold text-white disabled:opacity-50">
        Add note
      </button>
    </div>
  );
}

export function EditInfo({ id, name, phone }: { id: string; name: string; phone: string }) {
  const [n, setN] = useState(name);
  const [p, setP] = useState(phone);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const router = useRouter();
  return (
    <div className="space-y-2">
      <input value={n} onChange={(e) => setN(e.target.value)} placeholder="Name" aria-label="Lead name" className="block w-full rounded-xl px-3 py-2 text-sm ring-1 ring-stone-300" />
      <input value={p} onChange={(e) => setP(e.target.value)} placeholder="Phone" aria-label="Lead phone" inputMode="tel" className="block w-full rounded-xl px-3 py-2 text-sm ring-1 ring-stone-300" />
      <button disabled={pending} onClick={() => start(async () => { const r = await updateLeadInfoAction(id, { name: n, phone: p }); setMsg(r.ok ? "Saved ✓" : r.error); router.refresh(); })} className="h-9 w-full rounded-lg bg-stone-100 text-sm font-semibold">
        Save
      </button>
      {msg ? <p className="text-xs text-stone-500">{msg}</p> : null}
    </div>
  );
}

export function SubmitReq() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand-700 text-sm font-semibold text-white">
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save requirement
    </button>
  );
}
