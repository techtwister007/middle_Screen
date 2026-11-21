"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";
import { track } from "./api";

type Img = { id: string; lg: string; md: string; sm: string };

export function Gallery({ images, code, listingId, title }: { images: Img[]; code: string; listingId: string; title: string }) {
  const [idx, setIdx] = useState(0);
  const [open, setOpen] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const seen = useRef(new Set<number>());

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== idx) setIdx(i);
    if (!seen.current.has(i)) {
      seen.current.add(i);
      if (i > 0) track(code, "gallery", { i }, listingId);
    }
  };
  const go = (d: number) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({ left: Math.max(0, Math.min(images.length - 1, idx + d)) * el.clientWidth, behavior: "smooth" });
  };

  if (!images.length)
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center bg-gradient-to-br from-stone-200 to-stone-300 text-stone-500 sm:rounded-3xl">
        <Images className="h-10 w-10" />
      </div>
    );

  return (
    <>
      <div className="relative w-full overflow-hidden bg-stone-900 sm:rounded-3xl">
        <div ref={scroller} onScroll={onScroll} className="no-scrollbar flex aspect-[4/3] w-full snap-x snap-mandatory overflow-x-auto sm:aspect-[16/10]">
          {images.map((im, i) => (
            <button key={im.id} type="button" onClick={() => { setIdx(i); setOpen(true); track(code, "gallery", { i, full: true }, listingId); }} className="relative h-full w-full shrink-0 snap-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={im.md} srcSet={`${im.sm} 400w, ${im.md} 900w, ${im.lg} 1600w`} sizes="(min-width: 768px) 768px, 100vw" alt={`${title} — photo ${i + 1}`} loading={i < 2 ? "eager" : "lazy"} fetchPriority={i === 0 ? "high" : "auto"} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
        {images.length > 1 ? (
          <>
            <button aria-label="Previous photo" onClick={() => go(-1)} className="absolute left-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/85 p-2 shadow sm:block">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button aria-label="Next photo" onClick={() => go(1)} className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/85 p-2 shadow sm:block">
              <ChevronRight className="h-5 w-5" />
            </button>
            <span className="absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold text-white">
              {idx + 1} / {images.length}
            </span>
          </>
        ) : null}
      </div>
      {images.length > 1 ? (
        <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto px-4 sm:px-0">
          {images.map((im, i) => (
            <button key={im.id} onClick={() => { scroller.current?.scrollTo({ left: i * (scroller.current?.clientWidth ?? 0), behavior: "smooth" }); }} className={`h-14 w-20 shrink-0 overflow-hidden rounded-lg ring-2 transition ${i === idx ? "ring-agent" : "ring-transparent opacity-70"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={im.sm} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
      {open ? <Lightbox images={images} start={idx} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function Lightbox({ images, start, onClose }: { images: Img[]; start: number; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(start);
  useEffect(() => {
    ref.current?.scrollTo({ left: start * window.innerWidth });
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") ref.current?.scrollBy({ left: window.innerWidth, behavior: "smooth" });
      if (e.key === "ArrowLeft") ref.current?.scrollBy({ left: -window.innerWidth, behavior: "smooth" });
    };
    document.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", k);
      document.body.style.overflow = "";
    };
  }, [start, onClose]);
  return (
    <div className="fixed inset-0 z-50 bg-black" role="dialog" aria-modal="true">
      <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 z-10 rounded-full bg-white/15 p-2 text-white">
        <X className="h-6 w-6" />
      </button>
      <span className="absolute left-4 top-5 z-10 text-sm font-semibold text-white/80">
        {i + 1} / {images.length}
      </span>
      <div ref={ref} onScroll={(e) => setI(Math.round(e.currentTarget.scrollLeft / window.innerWidth))} className="no-scrollbar flex h-full w-full snap-x snap-mandatory overflow-x-auto">
        {images.map((im) => (
          <div key={im.id} className="flex h-full w-screen shrink-0 snap-center items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={im.lg} alt="" loading="lazy" className="max-h-full max-w-full object-contain" />
          </div>
        ))}
      </div>
    </div>
  );
}
