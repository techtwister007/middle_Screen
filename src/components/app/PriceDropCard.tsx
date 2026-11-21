"use client";

import { useState } from "react";
import { Check, MessageCircle, TrendingDown } from "lucide-react";

export type DropBuyer = { id: string; name: string; phone: string; why: string; text: string };

/** After a price cut: one tap per interested buyer opens WhatsApp with a personal message and their own link. */
export function PriceDropCard({ was, now, buyers }: { was: string; now: string; buyers: DropBuyer[] }) {
  const [sent, setSent] = useState<string[]>([]);
  const left = buyers.length - sent.length;
  return (
    <section className="rounded-[20px] bg-white p-4 shadow-card" aria-label="Tell buyers about the price drop">
      <p className="flex items-center gap-2 font-semibold">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-800"><TrendingDown className="h-4 w-4" /></span>
        Price lowered to {now}
      </p>
      <p className="mt-1 text-sm text-stone-600">
        Was <span className="line-through">{was}</span>. Buyers see a &ldquo;Price reduced&rdquo; tag for 30 days.{" "}
        {buyers.length ? (left ? `Tell the ${left} interested buyer${left > 1 ? "s" : ""} below.` : "Everyone has been told.") : "No buyers have opened it yet."}
      </p>
      {buyers.length ? (
        <ul className="mt-3 divide-y divide-stone-100">
          {buyers.map((b) => {
            const done = sent.includes(b.id);
            return (
              <li key={b.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium">{b.name}</p>
                  <p className="truncate text-xs text-stone-500">{b.why}</p>
                </div>
                <a
                  href={`https://wa.me/${b.phone}?text=${encodeURIComponent(b.text)}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setSent((s) => (s.includes(b.id) ? s : [...s, b.id]))}
                  aria-label={`Tell ${b.name} on WhatsApp`}
                  className={`press flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold ${done ? "bg-stone-100 text-stone-600" : "bg-[#1f8f4e] text-white"}`}
                >
                  {done ? <><Check className="h-4 w-4" /> Sent</> : <><MessageCircle className="h-4 w-4" /> Tell</>}
                </a>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
