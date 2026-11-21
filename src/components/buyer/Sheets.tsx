"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { X, MessageCircle, Loader2, CheckCircle2 } from "lucide-react";
import { buyerAction } from "./api";

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className="animate-fade-up safe-bottom w-full max-w-md rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-stone-500 hover:bg-stone-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const input = "block w-full rounded-xl border-0 px-3.5 py-3 text-[15px] ring-1 ring-stone-300 focus:ring-2 focus:ring-agent outline-none";

/** Name + mobile form, plus one-tap "Confirm on WhatsApp" (verified number, free). */
export function IdentifyFields({ code, agentName, onDone, cta }: { code: string; agentName: string; onDone: (name: string) => void; cta: string }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [waWaiting, setWaWaiting] = useState(false);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (poll.current) clearInterval(poll.current); }, []);

  const submit = async () => {
    setErr("");
    if (name.trim().length < 2) return setErr("Please enter your name");
    if (phone.replace(/\D/g, "").length < 10) return setErr("Please enter a valid mobile number");
    setBusy(true);
    const r = await buyerAction({ code, action: "identify", name, phone });
    setBusy(false);
    if (!r.ok) return setErr(r.error ?? "Something went wrong");
    onDone(name);
  };

  const viaWhatsApp = async () => {
    setErr("");
    const r = await fetch("/api/buyer/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, name }) }).then((x) => x.json());
    if (!r.ok) return setErr(r.error ?? "Could not start verification");
    window.open(r.waUrl, "_blank");
    setWaWaiting(true);
    let n = 0;
    poll.current = setInterval(async () => {
      n++;
      const s = await fetch(`/api/buyer/verify?v=${r.vcode}&code=${code}&name=${encodeURIComponent(name)}`).then((x) => x.json()).catch(() => null);
      if (s?.status === "verified") {
        clearInterval(poll.current!);
        onDone(s.name || name);
      } else if (s?.status === "expired" || n > 120) {
        clearInterval(poll.current!);
        setWaWaiting(false);
        setErr("Verification timed out. Please try again.");
      }
    }, 2500);
  };

  return (
    <div className="space-y-3">
      <input className={input} placeholder="Your name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
      <input className={input} placeholder="Mobile number" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      <button disabled={busy} onClick={submit} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-agent font-semibold text-white disabled:opacity-60">
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : null} {cta}
      </button>
      <div className="flex items-center gap-3 text-xs text-stone-400">
        <span className="h-px flex-1 bg-stone-200" /> or <span className="h-px flex-1 bg-stone-200" />
      </div>
      <button onClick={viaWhatsApp} disabled={waWaiting} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] font-semibold text-white disabled:opacity-80">
        {waWaiting ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageCircle className="h-5 w-5" />}
        {waWaiting ? "Waiting for your WhatsApp message…" : "Confirm with WhatsApp (1 tap)"}
      </button>
      <p className="text-center text-xs leading-relaxed text-stone-500">Your details are shared only with {agentName}. Never sold, never used for marketing.</p>
    </div>
  );
}

function Done({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center py-4 text-center">
      <CheckCircle2 className="h-12 w-12 text-emerald-500" />
      <p className="mt-3 font-semibold">{text}</p>
    </div>
  );
}

export function AskSheet(props: { open: boolean; onClose: () => void; code: string; listingId: string; agentName: string; identified: boolean; onIdentified: (n: string) => void }) {
  const [text, setText] = useState("");
  const [step, setStep] = useState<"ask" | "identify" | "done">("ask");
  const [err, setErr] = useState("");
  useEffect(() => { if (props.open) { setStep("ask"); setErr(""); } }, [props.open]);
  const send = async () => {
    if (text.trim().length < 2) return setErr("Type your question");
    const r = await buyerAction({ code: props.code, action: "ask", listingId: props.listingId, text });
    if (r.needIdentity) return setStep("identify");
    if (!r.ok) return setErr(r.error ?? "Failed");
    setStep("done");
  };
  return (
    <Sheet open={props.open} onClose={props.onClose} title={step === "identify" ? "Where should we reply?" : "Ask a question"}>
      {step === "ask" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {["Is it still available?", "Is the price negotiable?", "What's the maintenance?", "Is parking included?"].map((q) => (
              <button key={q} onClick={() => setText(q)} className="rounded-full bg-stone-100 px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-200">
                {q}
              </button>
            ))}
          </div>
          <textarea className={`${input} min-h-24`} placeholder="Type your question…" value={text} onChange={(e) => setText(e.target.value)} />
          {err ? <p className="text-sm text-red-600">{err}</p> : null}
          <button onClick={send} className="h-12 w-full rounded-xl bg-agent font-semibold text-white">Send to {props.agentName}</button>
        </div>
      ) : step === "identify" ? (
        <IdentifyFields code={props.code} agentName={props.agentName} cta="Send question" onDone={async (n) => { props.onIdentified(n); await send(); }} />
      ) : (
        <Done text={`Sent! ${props.agentName} will get back to you shortly.`} />
      )}
    </Sheet>
  );
}

function nextDays() {
  const fmt = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const out: { value: string; label: string }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(Date.now() + i * 86400000);
    out.push({ value: fmt(d), label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" }) });
  }
  return out;
}

export function VisitSheet(props: { open: boolean; onClose: () => void; code: string; listingId: string; agentName: string; onIdentified: (n: string) => void; onRequested: (v: { date: string; slot: string }) => void }) {
  const days = nextDays();
  const [date, setDate] = useState(days[1].value);
  const [slot, setSlot] = useState<"morning" | "afternoon" | "evening">("morning");
  const [message, setMessage] = useState("");
  const [step, setStep] = useState<"pick" | "identify" | "done">("pick");
  const [err, setErr] = useState("");
  useEffect(() => { if (props.open) { setStep("pick"); setErr(""); } }, [props.open]);
  const send = async () => {
    const r = await buyerAction({ code: props.code, action: "visit", listingId: props.listingId, date, slot, text: message });
    if (r.needIdentity) return setStep("identify");
    if (!r.ok) return setErr(r.error ?? "Failed");
    setStep("done");
    props.onRequested({ date, slot });
  };
  const chip = (on: boolean) => `rounded-xl px-3 py-2.5 text-sm font-semibold ring-1 transition ${on ? "bg-agent text-white ring-transparent" : "bg-white text-stone-700 ring-stone-200"}`;
  return (
    <Sheet open={props.open} onClose={props.onClose} title={step === "identify" ? "Your contact details" : "Request a site visit"}>
      {step === "pick" ? (
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium text-stone-600">Preferred day</p>
            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
              {days.map((d) => (
                <button key={d.value} onClick={() => setDate(d.value)} className={`${chip(date === d.value)} shrink-0`}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-stone-600">Preferred time</p>
            <div className="grid grid-cols-3 gap-2">
              {(["morning", "afternoon", "evening"] as const).map((s) => (
                <button key={s} onClick={() => setSlot(s)} className={chip(slot === s)}>
                  {s === "morning" ? "Morning" : s === "afternoon" ? "Afternoon" : "Evening"}
                </button>
              ))}
            </div>
          </div>
          <input className={input} placeholder="Message (optional)" value={message} onChange={(e) => setMessage(e.target.value)} />
          {err ? <p className="text-sm text-red-600">{err}</p> : null}
          <button onClick={send} className="h-12 w-full rounded-xl bg-agent font-semibold text-white">Request visit</button>
          <p className="text-center text-xs text-stone-500">{props.agentName} will confirm the exact time with you.</p>
        </div>
      ) : step === "identify" ? (
        <IdentifyFields code={props.code} agentName={props.agentName} cta="Request visit" onDone={async (n) => { props.onIdentified(n); await send(); }} />
      ) : (
        <Done text={`Visit requested! ${props.agentName} will confirm the time with you.`} />
      )}
    </Sheet>
  );
}

export function IdentifySheet(props: { open: boolean; onClose: () => void; code: string; agentName: string; title: string; cta: string; onDone: (n: string) => void }) {
  return (
    <Sheet open={props.open} onClose={props.onClose} title={props.title}>
      <IdentifyFields code={props.code} agentName={props.agentName} cta={props.cta} onDone={(n) => { props.onDone(n); props.onClose(); }} />
    </Sheet>
  );
}

const BUDGETS_SALE = [["", "Any budget"], ["3000000", "Up to ₹30 L"], ["5000000", "Up to ₹50 L"], ["7500000", "Up to ₹75 L"], ["10000000", "Up to ₹1 Cr"], ["15000000", "Up to ₹1.5 Cr"], ["25000000", "Up to ₹2.5 Cr"], ["50000000", "Up to ₹5 Cr"]];
const BUDGETS_RENT = [["", "Any budget"], ["10000", "Up to ₹10k/mo"], ["15000", "Up to ₹15k/mo"], ["25000", "Up to ₹25k/mo"], ["40000", "Up to ₹40k/mo"], ["75000", "Up to ₹75k/mo"], ["150000", "Up to ₹1.5 L/mo"]];

/** "Not quite right? Tell me what you're looking for" — turns a dead end into a requirement + match. */
export function RequirementSheet(props: { open: boolean; onClose: () => void; code: string; agentName: string; identified: boolean; defaultPurpose: "sale" | "rent"; onIdentified: (n: string) => void }) {
  const [purpose, setPurpose] = useState<"sale" | "rent">(props.defaultPurpose);
  const [bhk, setBhk] = useState<number[]>([]);
  const [budget, setBudget] = useState("");
  const [areas, setAreas] = useState("");
  const [notes, setNotes] = useState("");
  const [step, setStep] = useState<"form" | "identify" | "done">("form");
  const [err, setErr] = useState("");
  useEffect(() => { if (props.open) { setStep("form"); setErr(""); } }, [props.open]);
  const send = async () => {
    const r = await buyerAction({
      code: props.code,
      action: "requirement",
      requirement: { purpose, bhk: bhk.length ? bhk : undefined, budgetMax: budget ? Number(budget) : undefined, localities: areas.split(",").map((a) => a.trim()).filter(Boolean).slice(0, 5), notes: notes.trim() || undefined },
    });
    if (r.needIdentity) return setStep("identify");
    if (!r.ok) return setErr(r.error ?? "Failed");
    setStep("done");
  };
  const chip = (on: boolean) => `rounded-xl px-3 py-2 text-sm font-semibold ring-1 ${on ? "bg-agent text-white ring-transparent" : "bg-white text-stone-700 ring-stone-200"}`;
  return (
    <Sheet open={props.open} onClose={props.onClose} title={step === "identify" ? "Where should we send options?" : "What are you looking for?"}>
      {step === "form" ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button className={chip(purpose === "sale")} onClick={() => setPurpose("sale")}>Buy</button>
            <button className={chip(purpose === "rent")} onClick={() => setPurpose("rent")}>Rent</button>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((b) => (
              <button key={b} className={`${chip(bhk.includes(b))} flex-1`} onClick={() => setBhk((x) => (x.includes(b) ? x.filter((y) => y !== b) : [...x, b]))}>
                {b}{b === 5 ? "+" : ""} BHK
              </button>
            ))}
          </div>
          <select aria-label="Budget" value={budget} onChange={(e) => setBudget(e.target.value)} className={input}>
            {(purpose === "rent" ? BUDGETS_RENT : BUDGETS_SALE).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <input className={input} placeholder="Preferred areas (e.g. Gotri, Vasna)" value={areas} onChange={(e) => setAreas(e.target.value)} />
          <input className={input} placeholder="Anything else? (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          {err ? <p className="text-sm text-red-600">{err}</p> : null}
          <button onClick={send} className="h-12 w-full rounded-xl bg-agent font-semibold text-white">Send to {props.agentName}</button>
        </div>
      ) : step === "identify" ? (
        <IdentifyFields code={props.code} agentName={props.agentName} cta="Send my requirement" onDone={async (n) => { props.onIdentified(n); await send(); }} />
      ) : (
        <Done text={`Got it! ${props.agentName} will send you matching options.`} />
      )}
    </Sheet>
  );
}

/** Show the prompt to save contact details at most once per browser session. */
export function shouldPromptIdentity(): boolean {
  try {
    if (sessionStorage.getItem("pp_idprompt")) return false;
    sessionStorage.setItem("pp_idprompt", "1");
  } catch {}
  return true;
}
