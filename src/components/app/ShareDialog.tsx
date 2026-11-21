"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, MessageCircle, Search, Share2, UserPlus, X, QrCode } from "lucide-react";
import { shareToLeadAction } from "@/app/app/_actions/share";

type LeadOpt = { id: string; name: string; phone: string | null };

export function ShareButton({
  target,
  leads,
  publicUrl,
  label = "Share with a buyer",
  presetLeadId,
  variant = "primary",
  className = "",
}: {
  target: { listingId?: string; collectionId?: string };
  leads: LeadOpt[];
  publicUrl?: string | null;
  label?: string;
  presetLeadId?: string;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const cls =
    variant === "primary"
      ? "bg-brand-700 text-white hover:bg-brand-800"
      : "bg-white text-stone-800 ring-1 ring-stone-200 hover:bg-stone-50";
  return (
    <>
      <button onClick={() => setOpen(true)} className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold shadow-sm ${cls} ${className}`}>
        <Share2 className="h-4 w-4" /> {label}
      </button>
      {open ? <ShareDialog target={target} leads={leads} publicUrl={publicUrl} presetLeadId={presetLeadId} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function ShareDialog({ target, leads, publicUrl, presetLeadId, onClose }: { target: { listingId?: string; collectionId?: string }; leads: LeadOpt[]; publicUrl?: string | null; presetLeadId?: string; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [mode, setMode] = useState<"pick" | "new">(leads.length ? "pick" : "new");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState<{ url: string; waUrl: string; message: string; leadName: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return leads.filter((l) => !s || l.name.toLowerCase().includes(s) || (l.phone ?? "").includes(s.replace(/\D/g, ""))).slice(0, 30);
  }, [q, leads]);

  const go = async (v: { leadId?: string; name?: string; phone?: string }) => {
    setBusy(true);
    setErr("");
    const r = await shareToLeadAction({ ...target, ...v });
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    setResult(r.data!);
  };
  // Auto-share to preset lead
  useEffect(() => {
    if (presetLeadId) go({ leadId: presetLeadId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };
  const showQr = async (url: string) => {
    const QR = await import("qrcode");
    setQr(await QR.toDataURL(url, { width: 480, margin: 1 }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div className="animate-fade-up safe-bottom max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold">{result ? `Ready for ${result.leadName}` : "Share with a buyer"}</h3>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-stone-500 hover:bg-stone-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {result ? (
          <div className="space-y-3">
            <p className="text-sm text-stone-600">A personal link — you&apos;ll see exactly when {result.leadName.split(" ")[0]} opens it and what they like.</p>
            <a href={result.waUrl} target="_blank" rel="noopener" className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1f8f4e] font-bold text-white">
              <MessageCircle className="h-5 w-5" /> Send on WhatsApp
            </a>
            <div className="flex items-center gap-2 rounded-xl bg-stone-50 p-2 ring-1 ring-stone-200">
              <span className="min-w-0 flex-1 truncate px-1 text-sm font-medium" data-testid="share-url">{result.url}</span>
              <button onClick={() => copy(result.url, "lead")} className="flex h-8 items-center gap-1 rounded-lg bg-white px-2.5 text-xs font-semibold ring-1 ring-stone-200">
                {copied === "lead" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} Copy
              </button>
            </div>
            <button onClick={() => copy(result.message, "msg")} className="w-full text-center text-sm font-semibold text-brand-700">
              {copied === "msg" ? "Message copied ✓" : "Copy message with link"}
            </button>
            <button onClick={() => { setResult(null); setName(""); setPhone(""); }} className="h-10 w-full rounded-xl bg-stone-100 text-sm font-semibold">
              Share with another buyer
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1 text-sm font-semibold">
              <button onClick={() => setMode("pick")} className={`rounded-lg py-1.5 ${mode === "pick" ? "bg-white shadow-sm" : "text-stone-500"}`}>Existing lead</button>
              <button onClick={() => setMode("new")} className={`rounded-lg py-1.5 ${mode === "new" ? "bg-white shadow-sm" : "text-stone-500"}`}>New buyer</button>
            </div>
            {mode === "pick" ? (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or number" className="block w-full rounded-xl py-2.5 pl-9 pr-3 ring-1 ring-stone-300 outline-none focus:ring-2 focus:ring-brand-600" />
                </div>
                <div className="max-h-64 divide-y divide-stone-100 overflow-y-auto rounded-xl ring-1 ring-stone-200">
                  {filtered.length ? (
                    filtered.map((l) => (
                      <button key={l.id} disabled={busy} onClick={() => go({ leadId: l.id })} className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-stone-50">
                        <span className="font-medium">{l.name || "Unnamed"}</span>
                        <span className="text-xs text-stone-500">{l.phone ? `+${l.phone}` : ""}</span>
                      </button>
                    ))
                  ) : (
                    <p className="p-4 text-center text-sm text-stone-500">No leads found</p>
                  )}
                </div>
              </>
            ) : (
              <>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Buyer's name" aria-label="Buyer name" className="block w-full rounded-xl px-3 py-2.5 ring-1 ring-stone-300 outline-none focus:ring-2 focus:ring-brand-600" />
                <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="WhatsApp number" aria-label="Buyer phone" className="block w-full rounded-xl px-3 py-2.5 ring-1 ring-stone-300 outline-none focus:ring-2 focus:ring-brand-600" />
                <button disabled={busy} onClick={() => go({ name, phone })} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-700 font-semibold text-white disabled:opacity-60">
                  <UserPlus className="h-4 w-4" /> Create personal link
                </button>
              </>
            )}
            {err ? <p className="text-sm text-red-600">{err}</p> : null}
            {publicUrl ? (
              <div className="border-t border-stone-100 pt-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500">Or share publicly (WhatsApp groups, status)</p>
                <div className="flex gap-2">
                  <button onClick={() => copy(publicUrl, "pub")} className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-stone-100 text-sm font-semibold">
                    {copied === "pub" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copy link
                  </button>
                  <a href={`https://wa.me/?text=${encodeURIComponent(publicUrl)}`} target="_blank" rel="noopener" className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-stone-100 text-sm font-semibold">
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </a>
                  <button onClick={() => showQr(publicUrl)} aria-label="QR code" className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100">
                    <QrCode className="h-4 w-4" />
                  </button>
                </div>
                {qr ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qr} alt="QR code" className="mx-auto mt-3 w-48" />
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
