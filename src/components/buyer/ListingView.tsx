"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Heart, MapPin, Phone, MessageCircle, Share2, CalendarCheck, HelpCircle, Play, BadgeCheck, Flag, ChevronLeft, FileText, Search, CalendarPlus, Clock, TrendingDown } from "lucide-react";
import type { PublicAgent, PublicListing } from "@/modules/public";
import { Gallery } from "./Gallery";
import { Neighbourhood } from "./Neighbourhood";
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
    const t = setTimeout(onDone, 1600);
    return () => clearTimeout(t);
  }, [onDone]);
  const img = agent.logoUrl ?? agent.photoUrl;
  return (
    <button onClick={onDone} className="animate-splash fixed inset-0 z-50 flex flex-col items-center justify-center bg-agent px-8 text-center text-white">
      <span className="[animation:mark-in_.6s_cubic-bezier(.22,1,.36,1)_both]">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" className="h-24 w-24 rounded-[28px] bg-white object-cover shadow-2xl ring-4 ring-white/25" />
        ) : (
          <span className="flex h-24 w-24 items-center justify-center rounded-[28px] bg-white text-3xl font-semibold text-agent shadow-2xl">
            {agent.displayName.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("")}
          </span>
        )}
      </span>
      <p className="mt-6 text-[28px] font-semibold tracking-tight [animation:rise_.5s_.15s_cubic-bezier(.22,1,.36,1)_both]">{agent.displayName}</p>
      <p className="mt-2 max-w-xs text-white/85 [animation:rise_.5s_.25s_cubic-bezier(.22,1,.36,1)_both]">{agent.tagline || "Presenting a property selected for you"}</p>
      <span className="mt-9 h-1 w-24 overflow-hidden rounded-full bg-white/25">
        <span className="block h-full w-full origin-left rounded-full bg-white/85 [animation:bar-grow_1.2s_.1s_cubic-bezier(.22,1,.36,1)_both]" />
      </span>
      <span className="mt-4 text-xs text-white/65">Tap to continue</span>
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
          {mode === "area" ? <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-stone-800 shadow-card">Approximate area</span> : null}
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

  const sections = [
    { id: "overview", label: "Overview", show: true },
    { id: "amenities", label: "Amenities", show: l.amenities.length > 0 },
    { id: "location", label: "Location", show: !!(l.locality || l.city) },
  ].filter((x) => x.show);
  const [tab, setTab] = useState("overview");
  const tabsRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const els = sections.map((x) => document.getElementById(`sec-${x.id}`)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setTab(e.target.id.replace("sec-", ""))), { rootMargin: "-45% 0px -50% 0px" });
    els.forEach((e) => io.observe(e));
    const onScroll = () => setStuck((tabsRef.current?.getBoundingClientRect().top ?? 99) <= 1);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { io.disconnect(); window.removeEventListener("scroll", onScroll); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const jump = (id: string) => {
    const el = document.getElementById(`sec-${id}`);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 64;
    window.scrollTo({ top: y, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  const initials = agent.displayName.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
  const classic = (l.look ?? agent.pageLook) === "classic";
  const card = classic ? "mx-3 rounded-[16px] bg-white p-4 ring-1 ring-stone-200/70 sm:mx-0" : "mx-3 rounded-[22px] bg-white p-5 shadow-card sm:mx-0";

  return (
    <div style={{ ["--agent" as string]: agent.brandColor }} className="min-h-screen bg-stone-50 pb-32">
      {splash ? <Splash agent={agent} onDone={() => setSplash(false)} /> : null}

      <main className="mx-auto max-w-3xl sm:px-4 sm:pt-4">
        {classic ? (
          <>
            <div className="flex h-14 items-center gap-2 bg-agent px-3 text-white sm:rounded-[16px]">
              {backHref ? (
                <Link href={backHref} aria-label="Back" className="press flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
                  <ChevronLeft className="h-5 w-5" />
                </Link>
              ) : null}
              {agent.logoUrl || agent.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={(agent.logoUrl ?? agent.photoUrl)!} alt="" className="h-9 w-9 rounded-full bg-white object-cover" />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-[13px] font-semibold">{initials}</span>
              )}
              <span className="min-w-0 flex-1 truncate font-semibold">{agent.displayName}</span>
              <button onClick={share} aria-label="Share" className="press flex h-10 w-10 items-center justify-center rounded-full bg-white/15"><Share2 className="h-[18px] w-[18px]" /></button>
              <button onClick={toggleSave} aria-label={state.saved ? "Saved" : "Save"} className="press flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
                <Heart key={String(state.saved)} className={`h-[18px] w-[18px] ${state.saved ? "fill-white [animation:pop_.45s_cubic-bezier(.22,1,.36,1)]" : ""}`} />
              </button>
            </div>
            <section className="stagger bg-white px-4 pb-4 pt-4 sm:mt-3 sm:rounded-[16px]">
          {greetingName ? <p className="mb-2 text-sm font-semibold text-agent">Hi {greetingName.split(" ")[0]}, selected for you</p> : null}
              <div className="flex flex-wrap items-center gap-2">
                {sold ? (
                  <span className="rounded-full bg-[#4a544e] px-2.5 py-1 text-xs font-semibold text-white">{l.status === "sold" ? "Sold" : "Rented"}</span>
                ) : l.status === "on_hold" ? (
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">On hold</span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800"><span className="h-1.5 w-1.5 rounded-full bg-current" />Available</span>
                )}
                <span className="text-xs text-stone-500">
                  {l.typeLabel} · For {l.purpose === "rent" ? "rent" : "sale"} · #{l.ref}
                </span>
              </div>
              <h1 className="mt-2.5 text-[24px] font-semibold leading-tight tracking-tight text-stone-900 sm:text-3xl">{l.title}</h1>
              {l.locality || l.city ? (
                <p className="mt-1 flex items-center gap-1.5 text-[15px] text-stone-500">
                  <MapPin className="h-4 w-4" /> {[l.locality, l.city].filter(Boolean).join(", ")}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="tnum font-display text-[32px] font-bold leading-none tracking-tight text-agent">{l.price}</p>
                {l.wasPrice ? <span className="tnum text-[15px] text-stone-500 line-through decoration-stone-400">{l.wasPrice}</span> : null}
                {l.negotiable ? <span className="text-sm font-semibold text-stone-500">Negotiable</span> : null}
              </div>
              {l.wasPrice ? (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[13px] font-semibold text-emerald-800 [animation:pop_.45s_.3s_cubic-bezier(.22,1,.36,1)_backwards]">
                  <TrendingDown className="h-3.5 w-3.5" /> Price reduced
                </p>
              ) : null}
              {l.perSqft || l.emi ? (
                <p className="tnum mt-2 text-sm text-stone-500">
                  {l.perSqft}
                  {l.perSqft && l.emi ? " · " : ""}
                  {l.emi ? <>EMI from <b className="font-semibold text-stone-800">{l.emi}</b><span title="Indicative: 80% loan at 8.5% for 20 years" className="cursor-help">*</span></> : null}
                </p>
              ) : null}
            </section>
            <div className="px-3 pt-3 sm:px-0">
              <Gallery images={l.images} code={code} listingId={l.id} title={l.title} inset />
            </div>
            <section className={`mt-3 ${card}`}>
              {l.specs.length ? <h2 className="mb-3 text-[17px] font-semibold">Key facts</h2> : null}
              {l.specs.length ? (
                <dl className="grid grid-cols-2 overflow-hidden rounded-[12px] ring-1 ring-stone-200/80">
                  {l.specs.slice(0, 8).map((s, i) => (
                    <div key={s.label} className={`px-3 py-2.5 ${i % 2 ? "border-l border-stone-200/80" : ""} ${i > 1 ? "border-t border-stone-200/80" : ""}`}>
                      <dt className="text-xs text-stone-500">{s.label}</dt>
                      <dd className="text-[15px] font-semibold text-stone-900">{s.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              {l.stale ? (
                <p className="mt-3 text-[13px] text-amber-700">Availability is being re-confirmed. Ask {agent.displayName} for the latest status.</p>
              ) : (
                <p className="mt-3 flex items-center gap-1.5 text-[13px] text-stone-500"><BadgeCheck className="h-4 w-4 text-emerald-700" />Updated {daysAgo(l.updatedAt)}</p>
              )}
              {visit ? <VisitStatus visit={visit} l={l} agent={agent} /> : null}
            </section>
          </>
        ) : (
          <>
        <div className="relative">
          <Gallery images={l.images} code={code} listingId={l.id} title={l.title} hero />
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-3 sm:p-4">
            <div className="pointer-events-auto flex min-w-0 items-center gap-2">
              {backHref ? (
                <Link href={backHref} aria-label="Back" className="press flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-stone-900 shadow-card">
                  <ChevronLeft className="h-5 w-5" />
                </Link>
              ) : null}
              <span className="flex h-10 min-w-0 items-center gap-2 rounded-full bg-white/95 pl-1 pr-3.5 text-sm font-semibold text-stone-900 shadow-card [animation:rise_.5s_.1s_cubic-bezier(.22,1,.36,1)_both]">
                {agent.logoUrl || agent.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={(agent.logoUrl ?? agent.photoUrl)!} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-agent text-[12px] font-semibold text-white">{initials}</span>
                )}
                <span className="truncate">{agent.displayName}</span>
              </span>
            </div>
            <div className="pointer-events-auto flex gap-2">
              <button onClick={share} aria-label="Share" className="press flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-stone-900 shadow-card">
                <Share2 className="h-[18px] w-[18px]" />
              </button>
              <button onClick={toggleSave} aria-label={state.saved ? "Saved" : "Save"} className="press flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-stone-900 shadow-card">
                <Heart key={String(state.saved)} className={`h-[18px] w-[18px] ${state.saved ? "fill-rose-500 text-rose-500 [animation:pop_.45s_cubic-bezier(.22,1,.36,1)]" : ""}`} />
              </button>
            </div>
          </div>
        </div>

        <section className={`relative z-10 -mt-8 ${card} stagger sm:-mt-10`}>
          {greetingName ? <p className="mb-2 text-sm font-semibold text-agent">Hi {greetingName.split(" ")[0]}, selected for you</p> : null}
          <div className="flex flex-wrap items-center gap-2">
            {sold ? (
              <span className="rounded-full bg-[#4a544e] px-2.5 py-1 text-xs font-semibold text-white">{l.status === "sold" ? "Sold" : "Rented"}</span>
            ) : l.status === "on_hold" ? (
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">On hold</span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800"><span className="h-1.5 w-1.5 rounded-full bg-current" />Available</span>
            )}
            <span className="text-xs text-stone-500">
              {l.typeLabel} · For {l.purpose === "rent" ? "rent" : "sale"} · #{l.ref}
            </span>
          </div>
          <h1 className="mt-2.5 text-[24px] font-semibold leading-tight tracking-tight text-stone-900 sm:text-3xl">{l.title}</h1>
          {l.locality || l.city ? (
            <p className="mt-1 flex items-center gap-1.5 text-[15px] text-stone-500">
              <MapPin className="h-4 w-4" /> {[l.locality, l.city].filter(Boolean).join(", ")}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="tnum font-display text-[32px] font-bold leading-none tracking-tight text-agent">{l.price}</p>
            {l.wasPrice ? <span className="tnum text-[15px] text-stone-500 line-through decoration-stone-400">{l.wasPrice}</span> : null}
            {l.negotiable ? <span className="text-sm font-semibold text-stone-500">Negotiable</span> : null}
          </div>
          {l.wasPrice ? (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[13px] font-semibold text-emerald-800 [animation:pop_.45s_.3s_cubic-bezier(.22,1,.36,1)_backwards]">
              <TrendingDown className="h-3.5 w-3.5" /> Price reduced
            </p>
          ) : null}
          {l.perSqft || l.emi ? (
            <p className="tnum mt-2 text-sm text-stone-500">
              {l.perSqft}
              {l.perSqft && l.emi ? " · " : ""}
              {l.emi ? <>EMI from <b className="font-semibold text-stone-800">{l.emi}</b><span title="Indicative: 80% loan at 8.5% for 20 years" className="cursor-help">*</span></> : null}
            </p>
          ) : null}
          {l.specs.length ? (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {l.specs.slice(0, 6).map((s) => (
                <div key={s.label} className="rounded-2xl bg-stone-100 px-2 py-3 text-center">
                  <p className="text-[15px] font-semibold leading-tight text-stone-900">{s.value}</p>
                  <p className="mt-1 text-xs text-stone-500">{s.label}</p>
                </div>
              ))}
            </div>
          ) : null}
          {l.stale ? (
            <p className="mt-3 text-[13px] text-amber-700">Availability is being re-confirmed. Ask {agent.displayName} for the latest status.</p>
          ) : (
            <p className="mt-3 flex items-center gap-1.5 text-[13px] text-stone-500"><BadgeCheck className="h-4 w-4 text-emerald-700" />Updated {daysAgo(l.updatedAt)}</p>
          )}
          {visit ? <VisitStatus visit={visit} l={l} agent={agent} /> : null}
        </section>
          </>
        )}

        {sections.length > 1 ? (
          <div ref={tabsRef} className={`sticky top-0 z-20 mt-3 transition-[background-color,box-shadow] duration-300 sm:px-0 ${classic ? "" : "px-3 py-2"} ${stuck && !classic ? "bg-stone-50/95 shadow-[0_8px_16px_-12px_rgba(0,0,0,.25)] backdrop-blur" : ""}`}>
            {classic ? (
            <div className="grid border-b border-stone-200 bg-white sm:rounded-t-[12px]" style={{ gridTemplateColumns: `repeat(${sections.length}, 1fr)` }} role="tablist" aria-label="Sections">
              {sections.map((x) => (
                <button key={x.id} role="tab" aria-selected={tab === x.id} onClick={() => jump(x.id)} className={`relative h-11 text-sm font-semibold transition-colors ${tab === x.id ? "text-agent" : "text-stone-500"}`}>
                  {x.label}
                  <span aria-hidden className={`absolute inset-x-3 bottom-0 h-[3px] rounded-full bg-agent transition-transform duration-300 ${tab === x.id ? "scale-x-100" : "scale-x-0"}`} />
                </button>
              ))}
            </div>
            ) : (
            <div className="relative grid rounded-2xl bg-stone-100 p-1" style={{ gridTemplateColumns: `repeat(${sections.length}, 1fr)` }} role="tablist" aria-label="Sections">
              <span aria-hidden className="absolute bottom-1 top-1 rounded-[12px] bg-white shadow-card transition-[left] duration-300 ease-[cubic-bezier(.22,1,.36,1)]" style={{ width: `calc((100% - 8px) / ${sections.length})`, left: `calc(4px + ${Math.max(0, sections.findIndex((x) => x.id === tab))} * (100% - 8px) / ${sections.length})` }} />
              {sections.map((x) => (
                <button key={x.id} role="tab" aria-selected={tab === x.id} onClick={() => jump(x.id)} className={`relative h-10 rounded-[12px] text-sm font-semibold transition-colors ${tab === x.id ? "text-stone-900" : "text-stone-500"}`}>
                  {x.label}
                </button>
              ))}
            </div>
            )}
          </div>
        ) : null}

        <div className="mt-2 space-y-3">
          <div id="sec-overview" className="space-y-3">
            {l.videos.length || l.youtubeId ? (
              <section className={card}>
                <h2 className="mb-3 flex items-center gap-2 text-[17px] font-semibold">
                  <Play className="h-5 w-5 text-agent" /> Walkthrough
                </h2>
                <div className="space-y-3">
                  {l.youtubeId ? (
                    <div className="aspect-video overflow-hidden rounded-2xl bg-black">
                      <iframe className="h-full w-full" src={`https://www.youtube-nocookie.com/embed/${l.youtubeId}?rel=0`} title="Property video" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen loading="lazy" />
                    </div>
                  ) : null}
                  {l.videos.map((v) => (
                    <video key={v.id} src={v.url} controls playsInline preload="metadata" onPlay={() => track(code, "video", { id: v.id }, l.id)} className="w-full rounded-2xl bg-black" />
                  ))}
                </div>
              </section>
            ) : null}

            {l.description ? (
              <section className={card}>
                <h2 className="mb-2 text-[17px] font-semibold">About this property</h2>
                <div className="space-y-3 whitespace-pre-line text-[15px] leading-relaxed text-stone-700">{l.description}</div>
              </section>
            ) : null}

            {l.docs.length ? (
              <section className={card}>
                <h2 className="mb-3 text-[17px] font-semibold">Floor plan & documents</h2>
                <div className="space-y-2">
                  {l.docs.map((d) => (
                    <a key={d.id} href={d.url} target="_blank" rel="noopener" onClick={() => track(code, "gallery", { doc: d.id }, l.id)} className="press flex items-center gap-3 rounded-2xl bg-stone-100 p-3">
                      <FileText className="h-5 w-5 text-agent" /> <span className="font-medium">{d.name}</span> <span className="ml-auto text-sm font-semibold text-agent">Open</span>
                    </a>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          {l.amenities.length ? (
            <section id="sec-amenities" className={card}>
              <h2 className="mb-3 text-[17px] font-semibold">Amenities</h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {l.amenities.map((a) => (
                  <span key={a} className="flex items-center gap-2 rounded-2xl bg-stone-100 px-3 py-3 text-sm font-medium text-stone-800">
                    <BadgeCheck className="h-[18px] w-[18px] shrink-0 text-agent" /> {a}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {l.locality || l.city ? (
            <section id="sec-location" className={card}>
              <h2 className="mb-3 text-[17px] font-semibold">Location</h2>
              <Location l={l} code={code} />
              {l.nearby || l.location.lat != null ? (
                <div className="mt-5 border-t border-stone-100 pt-5">
                  <h3 className="mb-3 text-[17px] font-semibold">Neighbourhood</h3>
                  <Neighbourhood nearby={l.nearby} lat={l.location.lat} lng={l.location.lng} code={code} listingId={l.id} agentName={agent.displayName} />
                </div>
              ) : null}
            </section>
          ) : null}

          <div className="px-3 sm:px-0">
            <button onClick={() => setSheet("req")} className={`press flex w-full items-center gap-3 rounded-[22px] p-4 text-left ${sold ? "bg-agent text-white" : "bg-white shadow-card"}`}>
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${sold ? "bg-white/20" : "bg-stone-100 text-agent"}`}><Search className="h-5 w-5" /></span>
              <span className="min-w-0">
                <span className="block font-semibold">{sold ? "This one's gone — want similar options?" : "Not quite right?"}</span>
                <span className={`block text-sm ${sold ? "text-white/85" : "text-stone-500"}`}>Tell {agent.displayName} what you&apos;re looking for and get matching properties.</span>
              </span>
            </button>
          </div>

          <section className={card}>
            <div className="flex items-center gap-3">
              {agent.logoUrl || agent.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={(agent.logoUrl ?? agent.photoUrl)!} alt="" className="h-14 w-14 rounded-full object-cover" />
              ) : (
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-agent text-lg font-semibold text-white">{initials}</span>
              )}
              <div className="min-w-0">
                <p className="truncate text-[17px] font-semibold">{agent.displayName}</p>
                <p className="truncate text-sm text-stone-500">{agent.company && agent.name ? `${agent.name} · ` : ""}Your property consultant</p>
              </div>
            </div>
            {agent.tagline ? <p className="mt-3 text-sm text-stone-600">{agent.tagline}</p> : null}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <a href={`tel:+${agent.phone}`} onClick={() => track(code, "call", {}, l.id)} className="press flex h-12 items-center justify-center gap-2 rounded-[14px] bg-stone-100 font-semibold text-stone-900">
                <Phone className="h-4 w-4" /> Call
              </a>
              <a href={`https://wa.me/${agent.phone}?text=${encodeURIComponent(waText)}`} target="_blank" rel="noopener" onClick={() => track(code, "whatsapp", {}, l.id)} className="press flex h-12 items-center justify-center gap-2 rounded-[14px] bg-[#1f8f4e] font-semibold text-white">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            </div>
            <Link href={`/${agent.handle}`} className="mt-4 block text-center text-sm font-semibold text-agent">
              See all properties from {agent.displayName} →
            </Link>
          </section>

          <div className="flex items-center justify-between px-5 pt-3 text-[13px] text-stone-500 sm:px-1">
            <PoweredBy />
            <button onClick={() => setSheet("report")} className="inline-flex items-center gap-1 hover:text-stone-700">
              <Flag className="h-3.5 w-3.5" /> Report listing
            </button>
          </div>
        </div>
      </main>

      {!sold && classic ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)] [animation:rise_.5s_.3s_cubic-bezier(.22,1,.36,1)_backwards]">
          <div className="mx-auto flex max-w-3xl items-center gap-2 px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="tnum truncate text-[17px] font-bold leading-tight text-agent">{l.price}</p>
              <button onClick={() => setSheet("ask")} className="text-[13px] font-semibold text-stone-600 underline underline-offset-2">Ask a question</button>
            </div>
            <a href={`https://wa.me/${agent.phone}?text=${encodeURIComponent(waText)}`} target="_blank" rel="noopener" onClick={() => track(code, "whatsapp", {}, l.id)} aria-label="WhatsApp agent" className="press flex h-12 w-12 items-center justify-center rounded-[12px] bg-[#1f8f4e] text-white">
              <MessageCircle className="h-5 w-5" />
            </a>
            <button onClick={() => setSheet("visit")} disabled={visitBooked} className="press flex h-12 items-center justify-center gap-2 rounded-[12px] bg-agent px-5 text-[15px] font-semibold text-white disabled:opacity-70">
              <CalendarCheck className="h-5 w-5" /> {visit?.status === "confirmed" || visit?.status === "rescheduled" ? "Visit booked ✓" : visitBooked ? "Visit requested" : "Book site visit"}
            </button>
          </div>
        </div>
      ) : null}
      {!sold && !classic ? (
        <div className="fixed inset-x-3 bottom-[calc(10px+env(safe-area-inset-bottom))] z-30 [animation:rise_.5s_.3s_cubic-bezier(.22,1,.36,1)_backwards]">
          <div className="mx-auto grid max-w-3xl grid-cols-[auto_auto_1fr] gap-2 rounded-[22px] bg-white p-2 shadow-float">
            <button onClick={() => setSheet("ask")} className="press flex h-12 items-center justify-center gap-1.5 rounded-[14px] bg-stone-100 px-4 text-sm font-semibold text-stone-900">
              <HelpCircle className="h-4 w-4" /> Ask
            </button>
            <a href={`https://wa.me/${agent.phone}?text=${encodeURIComponent(waText)}`} target="_blank" rel="noopener" onClick={() => track(code, "whatsapp", {}, l.id)} aria-label="WhatsApp agent" className="press flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#1f8f4e] text-white">
              <MessageCircle className="h-5 w-5" />
            </a>
            <button onClick={() => setSheet("visit")} disabled={visitBooked} className="press flex h-12 items-center justify-center gap-2 rounded-[14px] bg-agent text-[15px] font-semibold text-white disabled:opacity-70">
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
    <span>
      with <span className="text-rose-500">❤</span> from{" "}
      <a href={brand.companyUrl} target="_blank" rel="noopener" className="font-semibold text-stone-700 underline decoration-stone-300 underline-offset-[3px] hover:decoration-stone-500">
        {brand.name}
      </a>
    </span>
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
          <button onClick={submit} className="press h-12 w-full rounded-[14px] bg-brand-700 font-semibold text-white">Submit report</button>
        </div>
      )}
    </Sheet>
  );
}
