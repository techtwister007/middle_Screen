"use client";

import { BRAND_COLORS } from "@/lib/brand-colors";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
import { updateProfileAction } from "@/app/app/_actions/misc";

type P = { name: string; company: string; tagline: string; city: string; areas: string; handle: string; brandColor: string; welcomeMode: "none" | "minimal" | "splash"; watermark: boolean; networkOptIn: boolean; photoUrl: string | null; logoUrl: string | null };
const COLORS = BRAND_COLORS;
const input = "block w-full rounded-[14px] px-3.5 py-3 text-[15px] ring-1 ring-stone-200 outline-none focus:ring-2 focus:ring-brand-600 bg-white placeholder:text-stone-500";

function Img({ kind, url, label }: { kind: "photo" | "logo"; url: string | null; label: string }) {
  const [u, setU] = useState(url);
  const [busy, setBusy] = useState(false);
  const up = async (f?: File) => {
    if (!f) return;
    setBusy(true);
    const fd = new FormData();
    fd.append("file", f);
    fd.append("kind", kind);
    const r = await fetch("/api/brand-image", { method: "POST", body: fd }).then((x) => x.json());
    setBusy(false);
    if (r.ok) setU(r.url);
  };
  return (
    <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl p-3 text-center ring-1 ring-stone-200 hover:bg-stone-50">
      {u ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={u} alt="" className={`h-16 ${kind === "photo" ? "w-16 rounded-full object-cover" : "max-w-[120px] object-contain"}`} />
      ) : (
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-stone-100">{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5 text-stone-400" />}</span>
      )}
      <span className="text-xs font-semibold text-stone-600">{label}</span>
      <input type="file" accept="image/*" hidden onChange={(e) => up(e.target.files?.[0])} />
    </label>
  );
}

export function ProfileForm({ initial, appUrl }: { initial: P; appUrl: string }) {
  const [p, setP] = useState(initial);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const set = <K extends keyof P>(k: K, v: P[K]) => setP((x) => ({ ...x, [k]: v }));
  const save = () =>
    start(async () => {
      const r = await updateProfileAction(p);
      if (r.ok) {
        setMsg("Saved ✓");
        if (r.data?.handle) set("handle", r.data.handle);
        router.refresh();
      } else setMsg(r.error);
    });
  const chip = (on: boolean) => `press rounded-2xl px-3 py-2.5 text-sm font-semibold ring-1 ${on ? "bg-brand-700 text-white ring-brand-700" : "bg-white ring-stone-200"}`;

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-[20px] bg-white p-4 shadow-card">
        <div className="grid grid-cols-2 gap-3">
          <Img kind="photo" url={p.photoUrl} label="Your photo" />
          <Img kind="logo" url={p.logoUrl} label="Company logo" />
        </div>
        <input value={p.name} onChange={(e) => set("name", e.target.value)} placeholder="Your name" aria-label="Name" className={input} />
        <input value={p.company} onChange={(e) => set("company", e.target.value)} placeholder="Company / brokerage" aria-label="Company" className={input} />
        <input value={p.tagline} onChange={(e) => set("tagline", e.target.value)} placeholder="Tagline e.g. Trusted homes in Vadodara since 2010" aria-label="Tagline" className={input} />
        <div className="grid grid-cols-2 gap-3">
          <input value={p.city} onChange={(e) => set("city", e.target.value)} placeholder="City" aria-label="City" className={input} />
          <input value={p.areas} onChange={(e) => set("areas", e.target.value)} placeholder="Areas you serve" aria-label="Areas" className={input} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700" htmlFor="handle">Your website link</label>
          <div className="flex items-center rounded-xl ring-1 ring-stone-300 focus-within:ring-2 focus-within:ring-brand-600">
            <span className="pl-3 text-sm text-stone-500">{appUrl.replace(/^https?:\/\//, "")}/</span>
            <input id="handle" value={p.handle} onChange={(e) => set("handle", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} className="min-w-0 flex-1 rounded-r-xl bg-transparent py-2.5 pr-3 outline-none" />
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded-[20px] bg-white p-4 shadow-card">
        <p className="text-[16px] font-semibold">Brand colour</p>
        <div className="flex flex-wrap gap-2">
          {COLORS.map(([c, n]) => (
            <button key={c} type="button" aria-label={n} title={n} onClick={() => set("brandColor", c)} className={`press h-10 w-10 rounded-full ring-2 ring-offset-2 ring-offset-white ${p.brandColor === c ? "ring-stone-900" : "ring-transparent"}`} style={{ background: c }} />
          ))}
          <input type="color" value={p.brandColor} onChange={(e) => set("brandColor", e.target.value)} aria-label="Custom colour" className="h-9 w-9 cursor-pointer rounded-full" />
        </div>
        <Preview p={p} />
        <p className="text-[16px] font-semibold">When a buyer opens your link</p>
        <div className="grid grid-cols-3 gap-2">
          <button type="button" className={chip(p.welcomeMode === "none")} onClick={() => set("welcomeMode", "none")}>Straight to property</button>
          <button type="button" className={chip(p.welcomeMode === "minimal")} onClick={() => set("welcomeMode", "minimal")}>Small header</button>
          <button type="button" className={chip(p.welcomeMode === "splash")} onClick={() => set("welcomeMode", "splash")}>Branded welcome</button>
        </div>
        <p className="text-xs text-stone-500">Branded welcome shows your name & logo full-screen for 1.5 s (first visit only).</p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={p.watermark} onChange={(e) => set("watermark", e.target.checked)} className="h-4 w-4 accent-brand-700" /> Watermark my name on new photos
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={p.networkOptIn} onChange={(e) => set("networkOptIn", e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-700" /> New listings public by default (agent website & future network). Enquiries always come to you.
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={pending} className="flex h-11 items-center gap-2 rounded-xl bg-brand-700 px-6 font-semibold text-white disabled:opacity-60">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save
        </button>
        {msg ? <span className="text-sm text-stone-600">{msg}</span> : null}
        <a href={`/${p.handle}`} target="_blank" className="ml-auto text-sm font-semibold text-brand-700">View my website →</a>
      </div>
    </div>
  );
}

/** Live preview of how a buyer sees the agent's brand: name tag, price in their colour, action button. */
function Preview({ p }: { p: P }) {
  const name = p.company || p.name || "Your name";
  const initials = name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
  const img = p.logoUrl ?? p.photoUrl;
  return (
    <div style={{ ["--agent" as string]: p.brandColor }} className="overflow-hidden rounded-[18px] bg-stone-100">
      <p className="px-4 pt-3 text-[13px] text-stone-500">Preview: what buyers see</p>
      <div className="m-3 rounded-[16px] bg-white p-4 shadow-card">
        <div className="flex items-center gap-2">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt="" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-semibold text-white transition-colors duration-300" style={{ background: p.brandColor }}>{initials}</span>
          )}
          <span className="truncate text-sm font-semibold">{name}</span>
        </div>
        <p className="mt-3 text-[15px] font-semibold">3 BHK flat in {p.areas?.split(",")[0]?.trim() || p.city || "your area"}</p>
        <p className="tnum mt-1 text-[24px] font-bold tracking-tight text-agent transition-colors duration-300">₹95 L</p>
        <div className="mt-3 flex h-11 items-center justify-center rounded-[14px] text-sm font-semibold text-white transition-colors duration-300" style={{ background: p.brandColor }}>Book site visit</div>
      </div>
    </div>
  );
}
