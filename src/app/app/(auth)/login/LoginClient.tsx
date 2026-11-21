"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MessageCircle } from "lucide-react";

export function LoginClient({ devTools, next }: { devTools: boolean; next: string }) {
  const [waiting, setWaiting] = useState(false);
  const [err, setErr] = useState("");
  const [waUrl, setWaUrl] = useState("");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const start = async () => {
    setErr("");
    const r = await fetch("/api/auth/wa", { method: "POST" }).then((x) => x.json());
    if (!r.ok) return setErr("Could not start login. Try again.");
    setWaUrl(r.waUrl);
    window.open(r.waUrl, "_blank");
    setWaiting(true);
    let n = 0;
    timer.current = setInterval(async () => {
      n++;
      const s = await fetch("/api/auth/wa").then((x) => x.json()).catch(() => null);
      if (s?.status === "verified") {
        clearInterval(timer.current!);
        window.location.href = s.next === "/app" ? next : s.next;
      } else if (s?.status === "expired" || s?.error || n > 150) {
        clearInterval(timer.current!);
        setWaiting(false);
        setErr("Login timed out. Please try again.");
      }
    }, 2000);
  };

  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const dev = async () => {
    const r = await fetch("/api/auth/dev", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, name }) }).then((x) => x.json());
    if (r.ok) window.location.href = next;
    else setErr(r.error ?? "Failed");
  };

  return (
    <div className="mt-5 space-y-4">
      <button onClick={start} disabled={waiting} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] font-semibold text-white shadow-sm disabled:opacity-80">
        {waiting ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageCircle className="h-5 w-5" />}
        {waiting ? "Waiting for your message…" : "Continue with WhatsApp"}
      </button>
      {waiting ? (
        <p className="text-center text-sm text-stone-500">
          WhatsApp opened with a code — just press <b>send</b>. This page logs you in automatically.{" "}
          <a href={waUrl} target="_blank" rel="noopener" className="font-semibold text-brand-700 underline">Open again</a>
        </p>
      ) : null}
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {devTools ? (
        <details className="rounded-xl bg-stone-50 p-3 text-sm ring-1 ring-stone-200">
          <summary className="cursor-pointer font-medium text-stone-600">Developer login</summary>
          <div className="mt-3 space-y-2">
            <input aria-label="Dev phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone e.g. 9812345678" className="block w-full rounded-lg px-3 py-2 ring-1 ring-stone-300" />
            <input aria-label="Dev name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (new accounts)" className="block w-full rounded-lg px-3 py-2 ring-1 ring-stone-300" />
            <button onClick={dev} className="h-10 w-full rounded-lg bg-stone-800 font-semibold text-white">Dev login</button>
          </div>
        </details>
      ) : null}
    </div>
  );
}
