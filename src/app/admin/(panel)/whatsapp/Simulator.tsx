"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Mic, Send, Video } from "lucide-react";

type Msg = { id: string; direction: "in" | "out"; type: string; text: string | null; at: string };

function linkify(t: string) {
  return t.split(/(https?:\/\/\S+)/g).map((p, i) => (p.startsWith("http") ? <a key={i} href={p} target="_blank" rel="noopener" className="break-all text-sky-700 underline">{p}</a> : <span key={i}>{p.replace(/\*([^*]+)\*/g, "$1")}</span>));
}

export function Simulator() {
  const [phone, setPhone] = useState("919800000001");
  const [name, setName] = useState("Test Agent");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const load = useCallback(async () => {
    const r = await fetch(`/api/dev/wa?phone=${phone}`).then((x) => x.json()).catch(() => ({ messages: [] }));
    setMsgs(r.messages ?? []);
  }, [phone]);
  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);
  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth" }), [msgs.length]);

  const send = async (body: Record<string, unknown>) => {
    setBusy(true);
    await fetch("/api/dev/wa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ from: phone, pushName: name, ...body }) });
    setBusy(false);
    load();
  };
  const sendFile = async (f: File | undefined, type: "image" | "video" | "audio") => {
    if (!f) return;
    const b64 = await new Promise<string>((res) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result).split(",")[1]);
      r.readAsDataURL(f);
    });
    await send({ type, media: { base64: b64, mime: f.type || (type === "audio" ? "audio/ogg" : "image/jpeg") }, text: type === "image" ? text || undefined : undefined });
    setText("");
  };

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_260px]">
      <div className="flex h-[70vh] flex-col overflow-hidden rounded-2xl bg-[#efeae2] ring-1 ring-stone-200">
        <div className="bg-[#075e54] px-4 py-3 text-sm font-semibold text-white">Bot chat · +{phone}</div>
        <div className="flex-1 space-y-2 overflow-y-auto p-3">
          {msgs.map((m) => (
            <div key={m.id} className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm shadow-sm ${m.direction === "in" ? "ml-auto bg-[#d9fdd3]" : "bg-white"}`}>
              {m.type !== "text" && m.direction === "in" ? <span className="text-xs font-semibold text-stone-500">[{m.type}] </span> : null}
              {m.text ? linkify(m.text) : null}
            </div>
          ))}
          <div ref={end} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) { send({ type: "text", text }); setText(""); } }} className="flex items-center gap-2 bg-[#f0f2f5] p-2">
          <label className="cursor-pointer rounded-full p-2 text-stone-600 hover:bg-white" title="Send photo"><ImagePlus className="h-5 w-5" /><input type="file" accept="image/*" multiple hidden onChange={async (e) => { for (const f of [...(e.target.files ?? [])]) await sendFile(f, "image"); e.target.value = ""; }} /></label>
          <label className="cursor-pointer rounded-full p-2 text-stone-600 hover:bg-white" title="Send video"><Video className="h-5 w-5" /><input type="file" accept="video/*" hidden onChange={(e) => sendFile(e.target.files?.[0], "video")} /></label>
          <label className="cursor-pointer rounded-full p-2 text-stone-600 hover:bg-white" title="Send voice note"><Mic className="h-5 w-5" /><input type="file" accept="audio/*" hidden onChange={(e) => sendFile(e.target.files?.[0], "audio")} /></label>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message" aria-label="Message" className="flex-1 rounded-full bg-white px-4 py-2 text-sm outline-none" />
          <button disabled={busy} className="rounded-full bg-[#00a884] p-2 text-white" aria-label="Send"><Send className="h-5 w-5" /></button>
        </form>
      </div>
      <div className="space-y-3">
        <label className="block text-sm">Phone (country code)<input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} className="mt-1 block w-full rounded-lg px-3 py-2 ring-1 ring-stone-300" /></label>
        <label className="block text-sm">WhatsApp name<input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full rounded-lg px-3 py-2 ring-1 ring-stone-300" /></label>
        <div className="flex flex-wrap gap-1.5">
          {["hi", "done", "1", "help", "list", "leads", "today", "login", "find 2bhk under 60L"].map((q) => (
            <button key={q} onClick={() => send({ type: "text", text: q })} className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold ring-1 ring-stone-200">{q}</button>
          ))}
        </div>
        <button onClick={() => send({ type: "contact", contact: { name: "Rahul Sharma", phone: "9876543210" } })} className="w-full rounded-lg bg-white py-2 text-xs font-semibold ring-1 ring-stone-200">Send a contact card</button>
        <p className="text-xs text-stone-500">Tip: send photos one by one or several at once, then a text like “3 BHK Gotri 95L furnished”, then “done”.</p>
      </div>
    </div>
  );
}
