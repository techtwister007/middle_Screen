"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GraduationCap, Cross, ShoppingBag, Trees, Bus, Search, Loader2, Car, Bike, Footprints, MapPin } from "lucide-react";
import { NEARBY_CATS, NEARBY_LABELS, NEARBY_SINGULAR, bikeMin, driveMin, haversineKm, walkMin, type NearbyCat, type PublicNearby } from "@/lib/geo";
import { track } from "./api";

const ICON: Record<NearbyCat, typeof GraduationCap> = { school: GraduationCap, health: Cross, daily: ShoppingBag, park: Trees, transport: Bus };
/** Category dot colours, readable on both light and dark cards. */
const DOT: Record<NearbyCat, string> = { school: "#2f6fde", health: "#d0453f", daily: "#c47f12", park: "#2f8a4e", transport: "#7a5cc4" };

type Place = { name: string; sub: string; lat: number; lng: number };

export function Neighbourhood({ nearby, lat, lng, code, listingId, agentName }: { nearby: PublicNearby | null; lat: number | null; lng: number | null; code: string; listingId: string; agentName: string }) {
  const [cat, setCat] = useState<NearbyCat | "all">("all");
  const [all, setAll] = useState(false);
  const places = useMemo(() => (nearby?.places ?? []).filter((p) => cat === "all" || p.cat === cat), [nearby, cat]);
  const shown = all || cat !== "all" ? places : places.slice(0, 5);
  const present = NEARBY_CATS.filter((c) => nearby?.places.some((p) => p.cat === c));

  if (!nearby && (lat == null || lng == null)) return null;
  return (
    <div className="space-y-4">
      {nearby ? (
        <>
          <div className="grid grid-cols-3 gap-2">
            {(["school", "health", "daily"] as NearbyCat[]).map((c) => {
              const I = ICON[c];
              return (
                <div key={c} className="rounded-2xl bg-stone-100 p-3">
                  <I className="h-[18px] w-[18px]" style={{ color: DOT[c] }} />
                  <p className="tnum mt-1.5 text-[22px] font-bold leading-none">{nearby.counts[c]}</p>
                  <p className="mt-1 text-xs leading-tight text-stone-500">{NEARBY_LABELS[c].toLowerCase()} within 2 km</p>
                </div>
              );
            })}
          </div>

          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5" role="group" aria-label="Show places">
            {(["all", ...present] as const).map((c) => (
              <button key={c} onClick={() => setCat(c)} aria-pressed={cat === c} className={`press flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold ${cat === c ? "bg-stone-900 text-stone-50" : "bg-stone-100 text-stone-700"}`}>
                {c !== "all" ? <span className="h-2 w-2 rounded-full" style={{ background: DOT[c] }} /> : null}
                {c === "all" ? "All" : NEARBY_LABELS[c]}
              </button>
            ))}
          </div>

          <Rings nearby={nearby} cat={cat} />

          <ul className="tnum divide-y divide-stone-100">
            {shown.map((p, i) => {
              const I = ICON[p.cat];
              return (
                <li key={`${p.name}-${i}`} className="flex items-center gap-3 py-2.5 [animation:rise_.35s_cubic-bezier(.22,1,.36,1)_backwards]" style={{ animationDelay: `${i * 30}ms` }}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-stone-100"><I className="h-[18px] w-[18px]" style={{ color: DOT[p.cat] }} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium">{p.name}</p>
                    <p className="text-xs text-stone-500">{NEARBY_SINGULAR[p.cat]} · {p.drive} min drive{p.walk ? ` · ${p.walk} min walk` : ""}</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold">{nearby.approx ? "~" : ""}{p.km} km</span>
                </li>
              );
            })}
          </ul>
          {cat === "all" && places.length > 5 ? (
            <button onClick={() => setAll((x) => !x)} className="press h-11 w-full rounded-[14px] bg-stone-100 text-sm font-semibold">
              {all ? "Show fewer" : `Show all ${places.length} places`}
            </button>
          ) : null}
        </>
      ) : null}

      {lat != null && lng != null ? <YourPlace lat={lat} lng={lng} code={code} listingId={listingId} agentName={agentName} /> : null}

      <p className="text-xs text-stone-500">Distances are {nearby?.approx ? "approximate (area only) and " : ""}without traffic. Map data © OpenStreetMap contributors.</p>
    </div>
  );
}

function Rings({ nearby, cat }: { nearby: PublicNearby; cat: NearbyCat | "all" }) {
  const S = 300, c = S / 2, R = (km: number) => (Math.min(km, 3.2) / 3) * 128;
  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="mx-auto block w-full max-w-[320px]" role="img" aria-label="Places around the home within 3 km">
      {[1, 2, 3].map((k) => (
        <g key={k}>
          <circle cx={c} cy={c} r={R(k)} fill="none" className="stroke-stone-200" strokeDasharray="3 5" />
          <text x={c + R(k) * 0.71 + 4} y={c - R(k) * 0.71 - 4} fontSize="11" className="fill-stone-500">{k} km</text>
        </g>
      ))}
      {nearby.places.filter((p) => p.km <= 3.2).map((p, i) => {
        const a = (p.bearing * Math.PI) / 180;
        const x = c + Math.sin(a) * R(p.km), y = c - Math.cos(a) * R(p.km);
        const on = cat === "all" || cat === p.cat;
        return <circle key={i} cx={x} cy={y} r={5} fill={DOT[p.cat]} stroke="var(--card)" strokeWidth="1.5" style={{ opacity: on ? 1 : 0.12, transition: "opacity .25s" }}><title>{p.name}</title></circle>;
      })}
      <circle cx={c} cy={c} r={nearby.approx ? 20 : 12} style={{ fill: "var(--agent)" }} fillOpacity={0.16} />
      <circle cx={c} cy={c} r={9} style={{ fill: "var(--agent)" }} />
      <path d={`M${c - 4.5} ${c + 0.5}l4.5-4 4.5 4v4h-3v-2.5h-3v2.5h-3z`} fill="#fff" />
    </svg>
  );
}

function YourPlace({ lat, lng, code, listingId, agentName }: { lat: number; lng: number; code: string; listingId: string; agentName: string }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [list, setList] = useState<Place[]>([]);
  const [pick, setPick] = useState<Place | null>(null);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (t.current) clearTimeout(t.current);
    if (q.trim().length < 3 || (pick && pick.name === q)) return setList([]);
    t.current = setTimeout(async () => {
      setBusy(true);
      const r = await fetch(`/api/places?${new URLSearchParams({ q, code, lat: String(lat), lng: String(lng) })}`).then((x) => x.json()).catch(() => ({ places: [] }));
      setBusy(false);
      setList(r.places ?? []);
    }, 350);
  }, [q, code, lat, lng, pick]);
  const km = pick ? Math.round(haversineKm(lat, lng, pick.lat, pick.lng) * 1.0 * 10) / 10 : 0;
  const choose = (p: Place) => {
    setPick(p);
    setQ(p.name);
    setList([]);
    track(code, "place", { name: p.name, km: Math.round(haversineKm(lat, lng, p.lat, p.lng) * 10) / 10 }, listingId);
  };
  return (
    <div className="rounded-[18px] bg-stone-100 p-4">
      <label htmlFor="yourplace" className="text-[15px] font-semibold">How far is your place?</label>
      <div className="mt-2 flex h-12 items-center gap-2 rounded-[14px] bg-white px-3.5 ring-1 ring-stone-200 focus-within:ring-2 focus-within:ring-agent">
        <Search className="h-4 w-4 text-stone-500" />
        <input id="yourplace" value={q} onChange={(e) => { setQ(e.target.value); setPick(null); }} placeholder="Office, school or family home" autoComplete="off" className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-stone-500" />
        {busy ? <Loader2 className="h-4 w-4 animate-spin text-stone-500" /> : null}
      </div>
      {list.length ? (
        <ul className="mt-2 overflow-hidden rounded-[14px] bg-white shadow-card">
          {list.map((p, i) => (
            <li key={i}>
              <button onClick={() => choose(p)} className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left hover:bg-stone-50">
                <MapPin className="h-4 w-4 shrink-0 text-stone-500" />
                <span className="min-w-0"><span className="block truncate text-[15px]">{p.name}</span><span className="block truncate text-xs text-stone-500">{p.sub}</span></span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {pick ? (
        <div className="mt-3 [animation:rise_.35s_cubic-bezier(.22,1,.36,1)_backwards]">
          <p className="tnum text-sm font-semibold">{pick.name} is about {km} km away</p>
          <div className="tnum mt-2 grid grid-cols-3 gap-2">
            {[
              { I: Car, v: `${driveMin(km)} min`, l: "Car" },
              { I: Bike, v: `${bikeMin(km)} min`, l: "Two-wheeler" },
              { I: Footprints, v: walkMin(km) ? `${walkMin(km)} min` : "–", l: walkMin(km) ? "Walk" : "Too far to walk" },
            ].map((m) => (
              <div key={m.l} className="rounded-xl bg-white p-2.5 text-center">
                <m.I className="mx-auto h-4 w-4 text-stone-500" />
                <p className="mt-1 text-[17px] font-semibold leading-tight">{m.v}</p>
                <p className="text-[11px] text-stone-500">{m.l}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <p className="mt-2 text-xs text-stone-500">Shared only with {agentName}.</p>
    </div>
  );
}
