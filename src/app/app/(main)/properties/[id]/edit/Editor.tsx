"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, LocateFixed, Star, Trash2, Video, AlertTriangle, FileText } from "lucide-react";
import type { ListingFields, LocationPrivacy, PriceMode, PropertyType, Purpose } from "@/db/schema";
import { parseAmount } from "@/lib/ai/parse";
import { inr } from "@/lib/format";
import { saveListingAction, reorderMediaAction, deleteMediaAction } from "@/app/app/_actions/listings";

export type EditorMedia = { id: string; kind: "image" | "video" | "doc"; thumb: string; url: string };
export type EditorData = {
  purpose: Purpose;
  type: PropertyType;
  title: string;
  description: string;
  priceMode: PriceMode;
  price: number | null;
  priceMax: number | null;
  negotiable: boolean;
  fields: ListingFields;
  locality: string;
  city: string;
  lat: number | null;
  lng: number | null;
  building: string;
  unit: string;
  showBuilding: boolean;
  locationPrivacy: LocationPrivacy;
  youtubeUrl: string;
  visibility: "private" | "network";
  look: "signature" | "classic" | null;
  /** The agent's default look, shown as "Use my default (…)" */
  defaultLook: "signature" | "classic";
};

const AMENITIES = ["Lift", "Covered parking", "Gym", "Swimming pool", "Club house", "Garden", "24×7 security", "Power backup", "CCTV", "Gated community", "Children's play area", "Intercom", "24×7 water", "Piped gas", "Modular kitchen", "Wardrobes", "Air conditioning", "Jogging track", "Temple"];

const types: { v: PropertyType; label: string }[] = [
  { v: "flat", label: "Flat" },
  { v: "house", label: "House / Villa" },
  { v: "plot", label: "Plot" },
  { v: "commercial", label: "Shop / Office" },
  { v: "pg", label: "PG" },
];

const specFields: Record<PropertyType, (keyof ListingFields)[]> = {
  flat: ["bhk", "areaSqft", "carpetSqft", "floor", "totalFloors", "furnishing", "bathrooms", "balconies", "parking", "facing", "ageYears", "possession"],
  house: ["bhk", "areaSqft", "plotSqyd", "totalFloors", "furnishing", "bathrooms", "parking", "facing", "ageYears", "possession"],
  plot: ["plotSqyd", "areaSqft", "facing", "possession"],
  commercial: ["areaSqft", "carpetSqft", "floor", "furnishing", "bathrooms", "parking", "ageYears", "possession"],
  pg: ["furnishing", "bathrooms", "parking"],
};
const labels: Partial<Record<keyof ListingFields, string>> = {
  bhk: "BHK",
  areaSqft: "Built-up area (sq ft)",
  carpetSqft: "Carpet area (sq ft)",
  plotSqyd: "Plot area (sq yd)",
  floor: "Floor",
  totalFloors: "Total floors",
  furnishing: "Furnishing",
  bathrooms: "Bathrooms",
  balconies: "Balconies",
  parking: "Parking",
  facing: "Facing",
  ageYears: "Age (years)",
  possession: "Possession",
};
const numeric = new Set<keyof ListingFields>(["bhk", "areaSqft", "carpetSqft", "plotSqyd", "totalFloors", "bathrooms", "balconies", "ageYears"]);

const inputCls = "block w-full rounded-[14px] px-3.5 py-3 text-[15px] ring-1 ring-stone-200 outline-none focus:ring-2 focus:ring-brand-600 bg-white placeholder:text-stone-500";
const chip = (on: boolean) => `press rounded-2xl px-3.5 py-2.5 text-sm font-semibold ring-1 ${on ? "bg-brand-700 text-white ring-brand-700" : "bg-white text-stone-700 ring-stone-200 hover:bg-stone-50"}`;

function Section({ title, children, warn }: { title: string; children: React.ReactNode; warn?: boolean }) {
  return (
    <section className="rounded-[20px] bg-white p-4 shadow-card sm:p-5">
      <h2 className="mb-3 flex items-center gap-2 text-[17px] font-semibold">
        {title} {warn ? <AlertTriangle className="h-4 w-4 text-amber-500" /> : null}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

/** Compress in the browser so uploads are fast on mobile data and fit serverless limits. */
async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
    const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.85));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

/** 9500000 → "95L", 21000000 → "2.1cr", 18000 → "18000" (what agents type). */
function compact(n: number | null) {
  if (!n) return "";
  const t = (x: number) => x.toFixed(2).replace(/\.?0+$/, "");
  if (n >= 1e7) return `${t(n / 1e7)}cr`;
  if (n >= 1e5) return `${t(n / 1e5)}L`;
  return String(n);
}

/** Extract coordinates from a Google Maps link or "lat, lng". */
function parseCoords(s: string): { lat: number; lng: number } | null {
  const m = s.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) ?? s.match(/[?&](?:q|query|ll)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/) ?? s.match(/^\s*(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*$/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}

export function Editor({ id, initial, media: initialMedia, missing, isDraft }: { id: string; initial: EditorData; media: EditorMedia[]; missing: string[]; isDraft: boolean }) {
  const router = useRouter();
  const [d, setD] = useState<EditorData>(initial);
  const [priceText, setPriceText] = useState(compact(initial.price));
  const [priceMaxText, setPriceMaxText] = useState(compact(initial.priceMax));
  const [media, setMedia] = useState(initialMedia);
  const [uploading, setUploading] = useState<string | null>(null);
  const [saving, setSaving] = useState<null | "save" | "publish">(null);
  const [err, setErr] = useState("");
  const [pinText, setPinText] = useState(initial.lat != null ? `${initial.lat}, ${initial.lng}` : "");
  const [customAmenity, setCustomAmenity] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof EditorData>(k: K, v: EditorData[K]) => setD((x) => ({ ...x, [k]: v }));
  const setF = <K extends keyof ListingFields>(k: K, v: ListingFields[K] | undefined) => setD((x) => ({ ...x, fields: { ...x.fields, [k]: v } }));

  const uploadImages = async (files: FileList | null) => {
    if (!files?.length) return;
    setErr("");
    const list = [...files];
    for (let i = 0; i < list.length; i++) {
      setUploading(`Uploading photo ${i + 1} of ${list.length}…`);
      const blob = await compressImage(list[i]);
      const fd = new FormData();
      fd.append("file", blob, list[i].name.replace(/\.\w+$/, ".jpg"));
      fd.append("listingId", id);
      const r = await fetch("/api/upload", { method: "POST", body: fd }).then((x) => x.json()).catch(() => ({ ok: false, error: "Network error" }));
      if (!r.ok) {
        setErr(r.error);
        break;
      }
    }
    setUploading(null);
    router.refresh();
  };

  const uploadVideo = async (file: File | undefined) => {
    if (!file) return;
    setErr("");
    if (file.size > 50 * 1024 * 1024) return setErr("Video is over 50 MB. Upload it to YouTube (unlisted) and paste the link instead.");
    setUploading("Uploading video…");
    try {
      const sign = await fetch("/api/upload/video-sign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listingId: id, type: file.type || "video/mp4", size: file.size }) }).then((x) => x.json());
      if (!sign.ok) throw new Error(sign.error);
      if (sign.direct) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("listingId", id);
        const r = await fetch("/api/upload", { method: "POST", body: fd }).then((x) => x.json());
        if (!r.ok) throw new Error(r.error);
      } else {
        const put = await fetch(sign.url, { method: "PUT", headers: { "Content-Type": file.type || "video/mp4" }, body: file });
        if (!put.ok) throw new Error("Upload failed");
        const r = await fetch("/api/upload/video-register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listingId: id, key: sign.key, type: file.type || "video/mp4", size: file.size }) }).then((x) => x.json());
        if (!r.ok) throw new Error(r.error);
      }
    } catch (e) {
      setErr((e as Error).message);
    }
    setUploading(null);
    router.refresh();
  };

  const move = async (idx: number, dir: -1 | 1 | "top") => {
    const next = [...media];
    const [m] = next.splice(idx, 1);
    if (dir === "top") next.unshift(m);
    else next.splice(Math.max(0, Math.min(next.length, idx + dir)), 0, m);
    setMedia(next);
    await reorderMediaAction(id, next.map((x) => x.id));
  };
  const remove = async (mid: string) => {
    setMedia((m) => m.filter((x) => x.id !== mid));
    await deleteMediaAction(id, mid);
  };

  const locate = () => {
    navigator.geolocation?.getCurrentPosition(
      (p) => {
        const lat = Number(p.coords.latitude.toFixed(6));
        const lng = Number(p.coords.longitude.toFixed(6));
        setD((x) => ({ ...x, lat, lng }));
        setPinText(`${lat}, ${lng}`);
      },
      () => setErr("Could not get location — paste a Google Maps link instead."),
    );
  };

  const save = async (publish: boolean) => {
    setErr("");
    setSaving(publish ? "publish" : "save");
    const coords = pinText.trim() ? parseCoords(pinText) : null;
    if (pinText.trim() && !coords) {
      setSaving(null);
      return setErr("Map pin: paste a Google Maps link or “lat, lng”.");
    }
    const payload = {
      ...d,
      price: parseAmount(priceText.replace(/\s/g, "")),
      priceMax: parseAmount(priceMaxText.replace(/\s/g, "")),
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      locality: d.locality || null,
      city: d.city || null,
      building: d.building || null,
      unit: d.unit || null,
      youtubeUrl: d.youtubeUrl || null,
      look: d.look,
    };
    const r = await saveListingAction(id, payload, publish);
    setSaving(null);
    if (!r.ok) return setErr(r.error);
    router.push(`/app/properties/${id}${publish ? "?published=1" : ""}`);
    router.refresh();
  };

  const priceHint = (t: string) => {
    const v = parseAmount(t.replace(/\s/g, ""));
    return v ? inr(v, { short: d.purpose === "sale" || v >= 1e5 }) : "";
  };
  const fields = specFields[d.type];
  const amen = d.fields.amenities ?? [];

  return (
    <div className="stagger space-y-4 pb-44">
      <Strength d={d} media={media} />
      {missing.length ? (
        <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> Please check: <b>{missing.join(", ")}</b>. We never guess details — fill what you know.
        </p>
      ) : null}

      <Section title="Photos & video">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {media.map((m, i) => (
            <div key={m.id} className="group relative aspect-square overflow-hidden rounded-2xl bg-stone-100 [animation:rise_.35s_cubic-bezier(.22,1,.36,1)_backwards]">
              {m.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.thumb} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-stone-500">{m.kind === "doc" ? <FileText className="h-6 w-6" /> : <Video className="h-6 w-6" />}</div>
              )}
              {i === 0 ? <span className="absolute left-1.5 top-1.5 rounded-full bg-brand-700 px-2 py-0.5 text-[11px] font-semibold text-white shadow-card">Cover</span> : null}
              {i > 0 && m.kind === "image" ? <button type="button" aria-label="Make cover" onClick={() => move(i, "top")} className="press absolute left-1.5 top-1.5 flex h-7 items-center gap-1 rounded-full bg-white/95 px-2 text-[11px] font-semibold text-stone-900 shadow-card"><Star className="h-3 w-3" />Set cover</button> : null}
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/55 to-transparent p-1.5 pt-4">
                <div className="flex gap-1">
                  <button type="button" aria-label="Move left" onClick={() => move(i, -1)} className="press flex h-[30px] w-[30px] items-center justify-center rounded-full bg-white/95 text-stone-900"><ArrowUp className="h-4 w-4 -rotate-90" /></button>
                  <button type="button" aria-label="Move right" onClick={() => move(i, 1)} className="press flex h-[30px] w-[30px] items-center justify-center rounded-full bg-white/95 text-stone-900"><ArrowDown className="h-4 w-4 -rotate-90" /></button>
                </div>
                <button type="button" aria-label="Delete" onClick={() => remove(m.id)} className="press flex h-[30px] w-[30px] items-center justify-center rounded-full bg-white/95 text-red-600"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => fileRef.current?.click()} className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-stone-300 text-xs font-semibold text-stone-500 hover:border-brand-500 hover:text-brand-700">
            <ImagePlus className="h-6 w-6" /> Add photos
          </button>
          <button type="button" onClick={() => videoRef.current?.click()} className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-stone-300 text-xs font-semibold text-stone-500 hover:border-brand-500 hover:text-brand-700">
            <Video className="h-6 w-6" /> Add video
          </button>
        </div>
        <button type="button" onClick={() => docRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold text-stone-600 ring-1 ring-stone-200">
          <FileText className="h-4 w-4" /> Add floor plan / brochure (PDF)
        </button>
        <input ref={docRef} type="file" accept="application/pdf" hidden onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          if (f.size > 10 * 1024 * 1024) return setErr("PDF is over 10 MB");
          setUploading("Uploading document…");
          const fd = new FormData();
          fd.append("file", f);
          fd.append("listingId", id);
          const r = await fetch("/api/upload", { method: "POST", body: fd }).then((x) => x.json()).catch(() => ({ ok: false, error: "Network error" }));
          setUploading(null);
          if (!r.ok) setErr(r.error);
          router.refresh();
        }} />
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { uploadImages(e.target.files); e.target.value = ""; }} data-testid="photo-input" />
        <input ref={videoRef} type="file" accept="video/*" hidden onChange={(e) => { uploadVideo(e.target.files?.[0]); e.target.value = ""; }} />
        {uploading ? <p className="flex items-center gap-2 text-sm text-brand-700"><Loader2 className="h-4 w-4 animate-spin" /> {uploading}</p> : null}
        <input value={d.youtubeUrl} onChange={(e) => set("youtubeUrl", e.target.value)} placeholder="YouTube link (optional)" className={inputCls} />
        <p className="text-xs text-stone-500">Photos are resized, watermarked with your name and location data is removed automatically.</p>
      </Section>

      <Section title="Basics">
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className={chip(d.purpose === "sale")} onClick={() => set("purpose", "sale")}>For sale</button>
          <button type="button" className={chip(d.purpose === "rent")} onClick={() => set("purpose", "rent")}>For rent</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {types.map((t) => (
            <button type="button" key={t.v} className={chip(d.type === t.v)} onClick={() => set("type", t.v)}>{t.label}</button>
          ))}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700" htmlFor="title">Title</label>
          <input id="title" value={d.title} onChange={(e) => set("title", e.target.value)} className={inputCls} maxLength={120} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700" htmlFor="desc">Description</label>
          <textarea id="desc" value={d.description} onChange={(e) => set("description", e.target.value)} rows={6} className={inputCls} />
        </div>
      </Section>

      <Section title="Price" warn={missing.includes("price")}>
        <div className="grid grid-cols-3 gap-2">
          <button type="button" className={chip(d.priceMode === "exact")} onClick={() => set("priceMode", "exact")}>Exact</button>
          <button type="button" className={chip(d.priceMode === "range")} onClick={() => set("priceMode", "range")}>Range</button>
          <button type="button" className={chip(d.priceMode === "on_request")} onClick={() => set("priceMode", "on_request")}>On request</button>
        </div>
        {d.priceMode !== "on_request" ? (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700" htmlFor="price">{d.priceMode === "range" ? "From" : d.purpose === "rent" ? "Rent / month" : "Price"}</label>
              <input id="price" value={priceText} onChange={(e) => setPriceText(e.target.value)} placeholder={d.purpose === "rent" ? "e.g. 18000 or 18k" : "e.g. 95L or 1.2cr"} className={inputCls} />
              <p className="mt-1 h-4 text-xs font-semibold text-brand-700">{priceHint(priceText)}</p>
            </div>
            {d.priceMode === "range" ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700" htmlFor="pmax">To</label>
                <input id="pmax" value={priceMaxText} onChange={(e) => setPriceMaxText(e.target.value)} className={inputCls} />
                <p className="mt-1 h-4 text-xs font-semibold text-brand-700">{priceHint(priceMaxText)}</p>
              </div>
            ) : null}
          </div>
        ) : null}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={d.negotiable} onChange={(e) => set("negotiable", e.target.checked)} className="h-4 w-4 accent-brand-700" /> Negotiable
        </label>
        {d.purpose === "rent" ? (
          <div className="grid grid-cols-2 gap-2">
            <input value={d.fields.deposit ?? ""} onChange={(e) => setF("deposit", e.target.value ? Number(e.target.value.replace(/\D/g, "")) : undefined)} placeholder="Deposit (₹)" inputMode="numeric" className={inputCls} />
            <input value={d.fields.maintenance ?? ""} onChange={(e) => setF("maintenance", e.target.value ? Number(e.target.value.replace(/\D/g, "")) : undefined)} placeholder="Maintenance / mo (₹)" inputMode="numeric" className={inputCls} />
          </div>
        ) : null}
      </Section>

      <Section title="Details" warn={missing.some((m) => ["bhk", "area", "furnishing"].includes(m))}>
        <div className="grid grid-cols-2 gap-3">
          {fields.map((k) =>
            k === "furnishing" ? (
              <div key={k} className="col-span-2">
                <p className="mb-1 text-sm font-medium text-stone-700">Furnishing</p>
                <div className="grid grid-cols-3 gap-2">
                  {(["unfurnished", "semi", "full"] as const).map((f) => (
                    <button type="button" key={f} className={chip(d.fields.furnishing === f)} onClick={() => setF("furnishing", d.fields.furnishing === f ? undefined : f)}>
                      {f === "unfurnished" ? "Unfurnished" : f === "semi" ? "Semi" : "Full"}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div key={k}>
                <label className="mb-1 block text-xs font-medium text-stone-600" htmlFor={`f-${k}`}>{labels[k]}</label>
                <input
                  id={`f-${k}`}
                  inputMode={numeric.has(k) ? "decimal" : "text"}
                  value={(d.fields[k] as string | number | undefined) ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setF(k, (numeric.has(k) ? (v === "" ? undefined : Number(v.replace(/[^\d.]/g, ""))) : v || undefined) as never);
                  }}
                  placeholder={k === "possession" ? "Ready to move" : k === "parking" ? "e.g. 1 covered" : k === "facing" ? "e.g. East" : ""}
                  className={inputCls}
                />
              </div>
            ),
          )}
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-stone-700">Amenities</p>
          <div className="flex flex-wrap gap-1.5">
            {[...new Set([...AMENITIES, ...amen])].map((a) => (
              <button type="button" key={a} onClick={() => setF("amenities", amen.includes(a) ? amen.filter((x) => x !== a) : [...amen, a])} className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${amen.includes(a) ? "bg-brand-50 text-brand-800 ring-brand-500" : "bg-white text-stone-600 ring-stone-200"}`}>
                {a}
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input value={customAmenity} onChange={(e) => setCustomAmenity(e.target.value)} placeholder="Add other…" className={inputCls} />
            <button type="button" onClick={() => { if (customAmenity.trim()) { setF("amenities", [...amen, customAmenity.trim()]); setCustomAmenity(""); } }} className="rounded-xl bg-stone-100 px-4 text-sm font-semibold">Add</button>
          </div>
        </div>
      </Section>

      <Section title="Location" warn={missing.includes("locality")}>
        <div className="grid grid-cols-2 gap-2">
          <input value={d.locality} onChange={(e) => set("locality", e.target.value)} placeholder="Locality / area" aria-label="Locality" className={inputCls} />
          <input value={d.city} onChange={(e) => set("city", e.target.value)} placeholder="City" aria-label="City" className={inputCls} />
        </div>
        <div className="flex gap-2">
          <input value={pinText} onChange={(e) => setPinText(e.target.value)} placeholder="Map pin: paste Google Maps link (optional)" className={inputCls} />
          <button type="button" onClick={locate} aria-label="Use my location" className="shrink-0 rounded-xl bg-stone-100 px-3"><LocateFixed className="h-5 w-5" /></button>
        </div>
        <div>
          <p className="mb-1 text-sm font-medium text-stone-700">What buyers see</p>
          <div className="grid grid-cols-3 gap-2">
            {(["area", "exact", "hidden"] as const).map((m) => (
              <button type="button" key={m} className={chip(d.locationPrivacy === m)} onClick={() => set("locationPrivacy", m)}>
                {m === "area" ? "Area only" : m === "exact" ? "Exact pin" : "Hidden"}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-stone-500">“Area only” shows an approximate ~500 m area, so buyers can&apos;t go to the owner directly.</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input value={d.building} onChange={(e) => set("building", e.target.value)} placeholder="Building / society (private)" aria-label="Building" className={inputCls} />
          <input value={d.unit} onChange={(e) => set("unit", e.target.value)} placeholder="Flat / unit no. (never shown)" aria-label="Unit" className={inputCls} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={d.showBuilding} onChange={(e) => set("showBuilding", e.target.checked)} className="h-4 w-4 accent-brand-700" /> Show building name to buyers
        </label>
      </Section>

      <Section title="Visibility">
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className={chip(d.visibility === "network")} onClick={() => set("visibility", "network")}>Public</button>
          <button type="button" className={chip(d.visibility === "private")} onClick={() => set("visibility", "private")}>Private</button>
        </div>
        <p className="text-xs text-stone-500">Public: shown on your agent website (and the future network). Private: only people you send the link to can see it.</p>
      </Section>

      <Section title="Page look">
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Page look">
          <button type="button" className={chip(d.look === null)} onClick={() => set("look", null)}>My default</button>
          <button type="button" className={chip(d.look === "signature")} onClick={() => set("look", "signature")}>Signature</button>
          <button type="button" className={chip(d.look === "classic")} onClick={() => set("look", "classic")}>Classic</button>
        </div>
        <p className="text-xs text-stone-500">Your default is {d.defaultLook === "classic" ? "Classic" : "Signature"}. Change it for all properties in Profile &amp; branding.</p>
      </Section>

      <div className="fixed inset-x-3 bottom-[calc(88px+env(safe-area-inset-bottom))] z-20 rounded-[22px] bg-white shadow-float [animation:rise_.45s_cubic-bezier(.22,1,.36,1)_backwards] lg:inset-x-auto lg:bottom-4 lg:left-1/2 lg:w-[min(720px,calc(100vw-2rem))] lg:-translate-x-1/2">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3">
          {err ? <p className="mr-auto line-clamp-2 text-sm text-red-600">{err}</p> : <span className="mr-auto" />}
          <button type="button" disabled={!!saving || !!uploading} onClick={() => save(false)} className="h-11 rounded-xl bg-white px-4 font-semibold ring-1 ring-stone-200 disabled:opacity-60">
            {saving === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </button>
          <button type="button" disabled={!!saving || !!uploading} onClick={() => save(true)} className="flex h-11 items-center gap-2 rounded-xl bg-brand-700 px-5 font-semibold text-white disabled:opacity-60">
            {saving === "publish" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {isDraft ? "Publish" : "Save & keep live"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** "Listing strength": a quick, honest checklist with the next thing to add. Better listings get opened and shared more. */
function Strength({ d, media }: { d: EditorData; media: { kind: string }[] }) {
  const photos = media.filter((m) => m.kind === "image").length;
  const f = d.fields;
  const checks = [
    { ok: photos >= 5, w: 25, tip: photos ? `Add ${5 - photos} more photo${5 - photos === 1 ? "" : "s"}. Homes with 5+ photos get opened more.` : "Add photos. They are the first thing buyers look at." },
    { ok: d.price != null || d.priceMode === "on_request", w: 15, tip: "Add the price, or choose “On request”." },
    { ok: !!d.locality, w: 15, tip: "Add the locality so buyers know where it is." },
    { ok: d.description.trim().length >= 80, w: 10, tip: "Write 2–3 lines about what makes it special." },
    { ok: !!(f.bhk || f.areaSqft || f.carpetSqft || f.plotSqyd), w: 10, tip: "Add BHK or area." },
    { ok: (f.amenities?.length ?? 0) >= 3, w: 10, tip: "Tick at least 3 amenities." },
    { ok: !!(f.furnishing || f.facing || f.floor), w: 10, tip: "Add furnishing, floor or facing." },
    { ok: d.lat != null, w: 5, tip: "Drop a map pin (or paste a Google Maps link) for nearby schools and hospitals." },
  ];
  const score = checks.reduce((a, c) => a + (c.ok ? c.w : 0), 0);
  const next = checks.filter((c) => !c.ok).slice(0, 2);
  return (
    <section className="rounded-[20px] bg-white p-4 shadow-card sm:p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[17px] font-semibold">Listing strength</h2>
        <span className="tnum text-sm font-semibold text-brand-700">{score}%</span>
      </div>
      <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-stone-100">
        <div className={`h-full rounded-full transition-[width] duration-500 ease-[cubic-bezier(.22,1,.36,1)] ${score >= 80 ? "bg-brand-600" : score >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${score}%` }} />
      </div>
      {next.length ? (
        <ul className="mt-3 space-y-1.5 text-sm text-stone-600">
          {next.map((c) => (
            <li key={c.tip} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />{c.tip}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-stone-600">Looks great. This listing has everything buyers look for.</p>
      )}
    </section>
  );
}
