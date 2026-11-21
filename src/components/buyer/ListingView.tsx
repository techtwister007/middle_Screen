"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, MapPin, Phone, MessageCircle, Share2, CalendarCheck, HelpCircle, Play, BadgeCheck, Flag, ChevronLeft, FileText, Search, CalendarPlus, Clock } from "lucide-react";
import type { PublicAgent, PublicListing } from "@/modules/public";
import { Gallery } from "./Gallery";
import { AskSheet, VisitSheet, IdentifySheet, Sheet, RequirementSheet, shouldPromptIdentity } from "./Sheets";
import { buyerAction, startDwell, track } from "./api";
import { brand } from "@/config/brand";

export type BuyerState = { identified: boolean; name: string | null; saved: boolean; reaction: "like" | "dislike" | null };
export type BuyerVisit = { status: string; scheduledAt: string | null; requestedDate: string | null; requestedSlot: string | null } | null;

const fmtVisit = (iso: string) => new Date(iso).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

function icsHref(title: string, startIso: string, place: string, agentName: string, agentPhone: string) {
  const d = (x: Date) => x.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const s = new Date(startIso);
  const e = new Date(s.getTime() + 3600000);
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//PropPulse//Visit//EN", "BEGIN:VEVENT", `UID:${s.getTime()}@visit`, `DTSTAMP:${d(new Date())}`, `DTSTART:${d(s)}`, `DTEND:${d(e)}`, `SUMMARY:Site visit: ${title}`, `LOCATION:${place}`, `DESCRIPTION:With ${agentName} (+${agentPhone})`, "BEGIN:VALARM", "TRIGGER:-PT2H", "ACTION:DISPLAY", "DESCRIPTION:Site visit in 2 hours", "END:VALARM", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}

/** The buyer always knows where their visit stands — and can add it to their calendar. */
function VisitStatus({ visit, l, agent }: { visit: NonNullable<BuyerVisit>; l: PublicListing; agent: PublicAgent }) {
  const place = [l.locality, l.city].filter(Boolean).join(", ");
  const change = `https://wa.me/${agent.phone}?text=${encodeURIComponent(`Hi ${agent.name || agent.displayName}, I need to change my site visit for "${l.title}".`)}`;
  if (visit.status === "requested")
    return (
      <div className="mt-4 flex items-start gap-3 rounded-2xl bg-amber-50 p-3 text-sm ring-1 ring-amber-200">
        <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        <div>
          <p className="font-semibold text-amber-900">Visit requested · {visit.requestedDate} {visit.requestedSlot}</p>
          <p className="text-amber-800">{agent.displayName} will confirm the exact time with you.</p>
        </div>
      </div>
    );
  if ((visit.status === "confirmed" || visit.status === "rescheduled") && visit.scheduledAt)
    return (
      <div className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm ring-1 ring-emerald-200">
        <p className="flex items-center gap-2 font-semibold text-emerald-900"><CalendarCheck className="h-5 w-5" /> Site visit confirmed · {fmtVisit(visit.scheduledAt)}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <a href={icsHref(l.title, visit.scheduledAt, place, agent.displayName, agent.phone)} download="site-visit.ics" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-3 font-semibold text-emerald-800 ring-1 ring-emerald-200"><CalendarPlus className="h-4 w-4" /> Add to calendar</a>
          <a href={change} target="_blank" rel="noopener" className="inline-flex h-9 items-center rounded-lg px-3 font-semibold text-emerald-800">Need to change?</a>
        </div>
      </div>
    );
  if (visit.status === "declined" || visit.status === "cancelled")
    return <p className="mt-4 rounded-2xl bg-stone-100 p-3 text-sm text-stone-700">Your visit request couldn&apos;t be scheduled. <a href={change} className="font-semibold underline">Message {agent.displayName}</a> to pick another time.</p>;
  return null;
}

export function AgentBar({ agent, compact }: { agent: PublicAgent; compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      {agent.logoUrl || agent.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={(agent.logoUrl ?? agent.photoUrl)!} alt="" className={`${compact ? "h-9 w-9" : "h-11 w-11"} rounded-full bg-white object-cover ring-2 ring-white`} />
      ) : (
        <span className={`${compact ? "h-9 w-9 text-sm" : "h-11 w-11"} inline-flex items-center justify-center rounded-full bg-agent font-bold text-white`}>
          {agent.displayName.slice(0, 1).toUpperCase()}
        </span>
      )}
      <div className="min-w-0 leading-tight">
        <p className="truncate font-semibold text-stone-900">{agent.displayName}</p>
        <p className="truncate text-xs text-stone-500">{agent.company && agent.name ? `${agent.name} · ` : ""}Your property consultant</p>
      </div>
    </div>
  );
}

export function Splash({ agent, onDone }: { agent: PublicAgent; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1500);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <button onClick={onDone} className="animate-splash fixed inset-0 z-50 flex flex-col items-center justify-center bg-agent px-8 text-center text-white">
      {agent.logoUrl || agent.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={(agent.logoUrl ?? agent.photoUrl)!} alt="" className="mb-5 h-24 w-24 rounded-full bg-white object-cover shadow-xl ring-4 ring-white/30" />
      ) : null}
      <p className="font-display text-3xl font-extrabold tracking-tight">{agent.displayName}</p>
      {agent.tagline ? <p className="mt-2 max-w-xs text-white/85">{agent.tagline}</p> : <p className="mt-2 text-white/80">Presenting a property selected for you</p>}
      <span className="mt-8 text-xs uppercase tracking-[0.2em] text-white/60">Tap to continue</span>
    </button>
  );
}

function Location({ l, code }: { l: PublicListing; code: string }) {
  const place = [l.locality, l.city].filter(Boolean).join(", ");
  const { mode, lat, lng } = l.location;
  if (mode === "hidden" || !place) {
    return place ? (
      <p className="flex items-center gap-2 text-stone-700">
        <MapPin className="h-4 w-4 text-agent" /> {place}
      </p>
    ) : null;
  }
  const d = mode === "area" ? 0.012 : 0.006;
  const embed = lat != null && lng != null ? `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d},${lat - d},${lng + d},${lat + d}&layer=mapnik${mode === "exact" ? `&marker=${lat},${lng}` : ""}` : null;
  const maps = mode === "exact" && lat != null ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;
  return (
    <div>
      <p className="mb-3 flex items-center gap-2 text-stone-700">
        <MapPin className="h-4 w-4 text-agent" /> {l.building ? `${l.building}, ` : ""}
        {place}
      </p>
      {embed ? (
        <div className="relative overflow-hidden rounded-2xl ring-1 ring-stone-200">
          <iframe title="Map" src={embed} className="h-56 w-full" loading="lazy" />
          {mode === "area" ? <span className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-stone-700 shadow">Approximate area</span> : null}
        </div>
      ) : null}
      <a href={maps} target="_blank" rel="noopener" onClick={() => track(code, "map", {}, l.id)} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-agent">
        Open in Google Maps →
      </a>
    </div>
  );
}

export function ListingView({
  listing: l,
  agent,
  code,
  initial,
  greetingName,
  backHref,
  showSplash,
  trackOpen = true,
  visit: initialVisit = null,
}: {
  listing: PublicListing;
  agent: PublicAgent;
  code: string;
  initial: BuyerState;
  greetingName?: string | null;
  backHref?: string;
  showSplash?: boolean;
  trackOpen?: boolean;
  visit?: BuyerVisit;
}) {
  const [state, setState] = useState(initial);
  const [splash, setSplash] = useState(!!showSplash);
  const [sheet, setSheet] = useState<null | "ask" | "visit" | "save" | "report" | "req">(null);
  const [visit, setVisit] = useState<BuyerVisit>(initialVisit);
  const visitBooked = !!visit && ["requested", "confirmed", "rescheduled"].includes(visit.status);
  const sold = l.status === "sold" || l.status === "rented";

  useEffect(() => {
    if (trackOpen) track(code, "open", { ref: document.referrer ? "link" : "direct" }, l.id);
    else track(code, "open", { inCollection: true }, l.id);
    return startDwell(code, l.id);
  }, [code, l.id, trackOpen]);

  const waText = `Hi ${agent.name || agent.displayName}, I'm interested in "${l.title}" (${l.price}).`;
  const toggleSave = async () => {
    const next = !state.saved;
    setState((s) => ({ ...s, saved: next }));
    const r = await buyerAction({ code, action: next ? "save" : "unsave", listingId: l.id });
    if (!r.ok) setState((s) => ({ ...s, saved: !next }));
    else if (next && !state.identified && shouldPromptIdentity()) setSheet("save");
  };
  const share = async () => {
    track(code, "share", {}, l.id);
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: l.title, text: `${l.title} — ${l.price}`, url });
      } catch {}
    } else window.open(`https://wa.me/?text=${encodeURIComponent(`${l.title} — ${l.price}\n${url}`)}`, "_blank");
  };
  const onIdentified = (name: string) => setState((s) => ({ ...s, identified: true, name }));

  return (
    <div style={{ ["--agent" as string]: agent.brandColor }} className="min-h-screen bg-stone-50 pb-28">
      {splash ? <Splash agent={agent} onDone={() => setSplash(false)} /> : null}

      <header className="sticky top-0 z-30 border-b border-stone-200/70 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            {backHref ? (
              <Link href={backHref} aria-label="Back" className="-ml-1 rounded-full p-1.5 text-stone-600 hover:bg-stone-100">
                <ChevronLeft className="h-5 w-5" />
              </Link>
            ) : null}
            {agent.welcomeMode === "none" ? <span className="font-semibold text-stone-800">{agent.displayName}</span> : <AgentBar agent={agent} compact />}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={share} aria-label="Share" className="rounded-full p-2 text-stone-600 hover:bg-stone-100">
              <Share2 className="h-5 w-5" />
            </button>
            <button onClick={toggleSave} aria-label={state.saved ? "Saved" : "Save"} className="rounded-full p-2 hover:bg-stone-100">
              <Heart className={`h-5 w-5 ${state.saved ? "fill-rose-500 text-rose-500" : "text-stone-600"}`} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl sm:px-4 sm:pt-4">
        <Gallery images={l.images} code={code} listingId={l.id} title={l.title} />

        <section className="animate-fade-up px-4 pt-5 sm:px-0">
          {greetingName ? <p className="mb-2 text-sm font-medium text-agent">Hi {greetingName.split(" ")[0]}, selected for you ✨</p> : null}
          <div className="flex flex-wrap items-center gap-2">
            {sold ? (
              <span className="rounded-full bg-stone-800 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-white">{l.status === "sold" ? "Sold" : "Rented"}</span>
            ) : l.status === "on_hold" ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-amber-800">On hold</span>
            ) : (
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200">Available</span>
            )}
            <span className="text-xs font-medium text-stone-500">
              {l.typeLabel} · For {l.purpose === "rent" ? "rent" : "sale"} · #{l.ref}
            </span>
          </div>
          <h1 className="mt-2 font-display text-[26px] font-extrabold leading-tight tracking-tight text-stone-900 sm:text-3xl">{l.title}</h1>
          {l.locality || l.city ? (
            <p className="mt-1 flex items-center gap-1.5 text-stone-600">
              <MapPin className="h-4 w-4" /> {[l.locality, l.city].filter(Boolean).join(", ")}
            </p>
          ) : null}
          <p className="mt-3 font-display text-3xl font-extrabold text-agent">
            {l.price}
            {l.negotiable ? <span className="ml-2 align-middle text-sm font-semibold text-stone-500">Negotiable</span> : null}
          </p>
          {l.perSqft || l.emi ? (
            <p className="mt-1 text-sm text-stone-500">
              {l.perSqft}
              {l.perSqft && l.emi ? " · " : ""}
              {l.emi ? <>EMI from <b className="text-stone-700">{l.emi}</b><span title="Indicative: 80% loan at 8.5% for 20 years" className="cursor-help">*</span></> : null}
            </p>
          ) : null}
          {l.stale ? (
            <p className="mt-2 text-xs text-amber-700">Availability is being re-confirmed — ask {agent.displayName} for the latest status.</p>
          ) : (
            <p className="mt-2 text-xs text-stone-400">Updated {daysAgo(l.updatedAt)}</p>
          )}
          {visit ? <VisitStatus visit={visit} l={l} agent={agent} /> : null}

          {l.specs.length ? (
            <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {l.specs.slice(0, 8).map((s) => (
                <div key={s.label} className="rounded-2xl bg-white p-3 ring-1 ring-stone-200/80">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-stone-500">{s.label}</p>
                  <p className="mt-0.5 text-[15px] font-bold text-stone-900">{s.value}</p>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        {l.videos.length || l.youtubeId ? (
          <section className="mt-7 px-4 sm:px-0">
            <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
              <Play className="h-5 w-5 text-agent" /> Walkthrough
            </h2>
            <div className="space-y-3">
              {l.youtubeId ? (
                <div className="aspect-video overflow-hidden rounded-2xl bg-black">
                  <iframe
                    className="h-full w-full"
                    src={`https://www.youtube-nocookie.com/embed/${l.youtubeId}?rel=0`}
                    title="Property video"
                    allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                    onLoad={() => {}}
                  />
                </div>
              ) : null}
              {l.videos.map((v) => (
                <video key={v.id} src={v.url} controls playsInline preload="metadata" onPlay={() => track(code, "video", { id: v.id }, l.id)} className="w-full rounded-2xl bg-black" />
              ))}
            </div>
          </section>
        ) : null}

        {l.description ? (
          <section className="mt-7 px-4 sm:px-0">
            <h2 className="mb-2 font-display text-lg font-bold">About this property</h2>
            <div className="space-y-3 whitespace-pre-line text-[15px] leading-relaxed text-stone-700">{l.description}</div>
          </section>
        ) : null}

        {l.amenities.length ? (
          <section className="mt-7 px-4 sm:px-0">
            <h2 className="mb-3 font-display text-lg font-bold">Amenities</h2>
            <div className="flex flex-wrap gap-2">
              {l.amenities.map((a) => (
                <span key={a} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm text-stone-700 ring-1 ring-stone-200">
                  <BadgeCheck className="h-4 w-4 text-agent" /> {a}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {l.docs.length ? (
          <section className="mt-7 px-4 sm:px-0">
            <h2 className="mb-3 font-display text-lg font-bold">Floor plan & documents</h2>
            <div className="space-y-2">
              {l.docs.map((d) => (
                <a key={d.id} href={d.url} target="_blank" rel="noopener" onClick={() => track(code, "gallery", { doc: d.id }, l.id)} className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-stone-200">
                  <FileText className="h-5 w-5 text-agent" /> <span className="font-medium">{d.name}</span> <span className="ml-auto text-sm font-semibold text-agent">Open</span>
                </a>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-7 px-4 sm:px-0">
          <h2 className="mb-3 font-display text-lg font-bold">Location</h2>
          <Location l={l} code={code} />
        </section>

        <section className="mt-8 px-4 sm:px-0">
          <button onClick={() => setSheet("req")} className={`mb-4 flex w-full items-center gap-3 rounded-2xl p-4 text-left ring-1 ${sold ? "bg-agent text-white ring-transparent" : "bg-white ring-stone-200"}`}>
            <Search className={`mr-3 h-5 w-5 shrink-0 ${sold ? "" : "text-agent"}`} />
            <span className="min-w-0">
              <span className="block font-semibold">{sold ? "This one's gone — want similar options?" : "Not quite right?"}</span>
              <span className={`block text-sm ${sold ? "text-white/85" : "text-stone-500"}`}>Tell {agent.displayName} what you&apos;re looking for and get matching properties.</span>
            </span>
          </button>
          <div className="rounded-3xl bg-white p-5 ring-1 ring-stone-200">
            <AgentBar agent={agent} />
            {agent.tagline ? <p className="mt-3 text-sm text-stone-600">{agent.tagline}</p> : null}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <a href={`tel:+${agent.phone}`} onClick={() => track(code, "call", {}, l.id)} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-stone-100 font-semibold text-stone-800">
                <Phone className="h-4 w-4" /> Call
              </a>
              <a href={`https://wa.me/${agent.phone}?text=${encodeURIComponent(waText)}`} target="_blank" rel="noopener" onClick={() => track(code, "whatsapp", {}, l.id)} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#25D366] font-semibold text-white">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            </div>
            <Link href={`/${agent.handle}`} className="mt-3 block text-center text-sm font-semibold text-agent">
              See all properties from {agent.displayName} →
            </Link>
          </div>
          <div className="mt-6 flex items-center justify-between text-xs text-stone-400">
            <button onClick={() => setSheet("report")} className="inline-flex items-center gap-1 hover:text-stone-600">
              <Flag className="h-3.5 w-3.5" /> Report listing
            </button>
            <PoweredBy />
          </div>
        </section>
      </main>

      {!sold ? (
        <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95 backdrop-blur">
          <div className="mx-auto grid max-w-3xl grid-cols-[auto_auto_1fr] gap-2 px-4 py-3">
            <button onClick={() => setSheet("ask")} className="flex h-12 items-center justify-center gap-1.5 rounded-xl bg-stone-100 px-4 text-sm font-semibold text-stone-800">
              <HelpCircle className="h-4 w-4" /> Ask
            </button>
            <a href={`https://wa.me/${agent.phone}?text=${encodeURIComponent(waText)}`} target="_blank" rel="noopener" onClick={() => track(code, "whatsapp", {}, l.id)} aria-label="WhatsApp agent" className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#25D366] text-white">
              <MessageCircle className="h-5 w-5" />
            </a>
            <button onClick={() => setSheet("visit")} disabled={visitBooked} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-agent text-[15px] font-bold text-white disabled:opacity-70">
              <CalendarCheck className="h-5 w-5" /> {visit?.status === "confirmed" || visit?.status === "rescheduled" ? "Visit booked ✓" : visitBooked ? "Visit requested" : "Book site visit"}
            </button>
          </div>
        </div>
      ) : null}

      <AskSheet open={sheet === "ask"} onClose={() => setSheet(null)} code={code} listingId={l.id} agentName={agent.displayName} identified={state.identified} onIdentified={onIdentified} />
      <VisitSheet open={sheet === "visit"} onClose={() => setSheet(null)} code={code} listingId={l.id} agentName={agent.displayName} onIdentified={onIdentified} onRequested={(v) => setVisit({ status: "requested", scheduledAt: null, requestedDate: v.date, requestedSlot: v.slot })} />
      <RequirementSheet open={sheet === "req"} onClose={() => setSheet(null)} code={code} agentName={agent.displayName} identified={state.identified} defaultPurpose={l.purpose} onIdentified={onIdentified} />
      <IdentifySheet open={sheet === "save"} onClose={() => setSheet(null)} code={code} agentName={agent.displayName} title="Saved ♥ — keep your shortlist" cta="Save & get updates" onDone={onIdentified} />
      <ReportSheet open={sheet === "report"} onClose={() => setSheet(null)} listingId={l.id} />
    </div>
  );
}

function daysAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
}

export function PoweredBy() {
  return (
    <a href="/" className="hover:text-stone-600">
      Powered by <span className="font-semibold">{brand.name}</span>
    </a>
  );
}

function ReportSheet({ open, onClose, listingId }: { open: boolean; onClose: () => void; listingId: string }) {
  const [reason, setReason] = useState("incorrect");
  const [details, setDetails] = useState("");
  const [done, setDone] = useState(false);
  const submit = async () => {
    await fetch("/api/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listingId, reason, details }) });
    setDone(true);
  };
  return (
    <Sheet open={open} onClose={onClose} title="Report this listing">
      {done ? (
        <p className="py-4 text-center text-stone-700">Thank you — our team will review it.</p>
      ) : (
        <div className="space-y-3">
          <select value={reason} onChange={(e) => setReason(e.target.value)} className="block w-full rounded-xl px-3 py-3 ring-1 ring-stone-300">
            <option value="incorrect">Incorrect or misleading details</option>
            <option value="unavailable">Property no longer available</option>
            <option value="fraud">Suspected fraud</option>
            <option value="other">Other</option>
          </select>
          <textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Details (optional)" className="block min-h-20 w-full rounded-xl px-3 py-3 ring-1 ring-stone-300" />
          <button onClick={submit} className="h-11 w-full rounded-xl bg-stone-900 font-semibold text-white">Submit report</button>
        </div>
      )}
    </Sheet>
  );
}
