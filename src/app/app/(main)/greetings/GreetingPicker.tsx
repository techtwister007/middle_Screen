"use client";

import { useState } from "react";
import { Download, Share2, Loader2, Pencil, Flame, Palette, Wind, Disc3, Moon, Star, Sparkles, Flag, Flower2, Coins, House } from "lucide-react";
import type { Motif } from "@/lib/festivals";

const ICON: Record<Motif, typeof Flame> = { diya: Flame, colours: Palette, kite: Wind, garba: Disc3, crescent: Moon, star: Star, sparkle: Sparkles, tricolour: Flag, flower: Flower2, coins: Coins, home: House };
import { Sheet } from "@/components/buyer/Sheets";

type F = { id: string; name: string; title: string; line: string; days: number | null; motif: Motif };

const when = (d: number | null) => (d == null ? "Any day" : d === 0 ? "Today" : d === 1 ? "Tomorrow" : d <= 45 ? `In ${d} days` : null);

export function GreetingPicker({ list }: { list: F[] }) {
  const [open, setOpen] = useState<F | null>(null);
  const [msg, setMsg] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState(false);
  const src = open ? `/api/greeting/${open.id}${msg.trim() && msg.trim() !== open.line ? `?msg=${encodeURIComponent(msg.trim())}` : ""}` : "";

  const pick = (f: F) => { setOpen(f); setMsg(f.line); setLoaded(false); setEdit(false); };
  const share = async () => {
    if (!open) return;
    setBusy(true);
    try {
      const blob = await fetch(src).then((r) => r.blob());
      const file = new File([blob], `${open.id}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: open.title });
      else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${open.id}.png`;
        a.click();
      }
    } catch {
      /* share cancelled */
    }
    setBusy(false);
  };

  return (
    <>
      <ul className="stagger grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {list.map((f, i) => {
          const w = when(f.days);
          const I = ICON[f.motif];
          return (
            <li key={f.id}>
              <button onClick={() => pick(f)} className="press flex w-full items-center gap-3 rounded-[20px] bg-white p-3.5 text-left shadow-card">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-700 text-[#f3c768]"><I className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{f.name}</span>
                  <span className="block truncate text-sm text-stone-500">{f.line}</span>
                </span>
                {w ? <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${i === 0 && f.days != null ? "bg-brand-50 text-brand-700" : "bg-stone-100 text-stone-600"}`}>{w}</span> : null}
              </button>
            </li>
          );
        })}
      </ul>

      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.name ?? ""}>
        {open ? (
          <div className="space-y-3">
            <div className="relative mx-auto aspect-[4/5] w-full max-w-[320px] overflow-hidden rounded-[18px] bg-stone-100">
              {!loaded ? <div className="skel absolute inset-0" /> : null}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img key={src} src={src} alt={`${open.title} card`} onLoad={() => setLoaded(true)} className={`h-full w-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`} />
            </div>
            {edit ? (
              <div>
                <label htmlFor="gmsg" className="text-sm font-semibold">Your message</label>
                <textarea id="gmsg" value={msg} maxLength={140} rows={2} onChange={(e) => setMsg(e.target.value)} onBlur={() => setLoaded(false)} className="mt-1 w-full rounded-[14px] bg-stone-100 p-3 text-[15px] outline-none focus:ring-2 focus:ring-brand-600" />
                <p className="text-right text-xs text-stone-500">{msg.length}/140 · updates when you tap outside</p>
              </div>
            ) : (
              <button onClick={() => setEdit(true)} className="press mx-auto flex h-9 items-center gap-1.5 rounded-full bg-stone-100 px-3.5 text-[13px] font-semibold"><Pencil className="h-3.5 w-3.5" /> Change the message</button>
            )}
            <div className="grid grid-cols-2 gap-2">
              <a href={src} download={`${open.id}.png`} className="press flex h-12 items-center justify-center gap-2 rounded-[14px] bg-stone-100 font-semibold"><Download className="h-4 w-4" /> Download</a>
              <button onClick={share} disabled={busy} className="press flex h-12 items-center justify-center gap-2 rounded-[14px] bg-[#1f8f4e] font-semibold text-white disabled:opacity-70">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />} Share
              </button>
            </div>
            <p className="text-center text-xs text-stone-500">Share opens WhatsApp on your phone. Pick Status or any chat.</p>
          </div>
        ) : null}
      </Sheet>
    </>
  );
}
