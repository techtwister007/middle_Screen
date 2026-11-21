"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Mic, Square } from "lucide-react";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-700 font-semibold text-white disabled:opacity-70">
      {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : null} {pending ? "Organising…" : "Continue → add photos"}
    </button>
  );
}

export function NewListingForm({ action, voice }: { action: (fd: FormData) => Promise<void>; voice: boolean }) {
  const [text, setText] = useState("");
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const chunks = useRef<Blob[]>([]);

  const start = async () => {
    setErr("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      chunks.current = [];
      r.ondataavailable = (e) => chunks.current.push(e.data);
      r.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setBusy(true);
        const fd = new FormData();
        fd.append("file", new Blob(chunks.current, { type: r.mimeType || "audio/webm" }), "voice.webm");
        const res = await fetch("/api/ai/transcribe", { method: "POST", body: fd }).then((x) => x.json()).catch(() => null);
        setBusy(false);
        if (res?.ok) setText((t) => (t ? t + "\n" : "") + res.text);
        else setErr(res?.error ?? "Could not transcribe");
      };
      r.start();
      setRec(r);
    } catch {
      setErr("Microphone not available");
    }
  };
  const stop = () => {
    rec?.stop();
    setRec(null);
  };

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="text" className="mb-1.5 block text-sm font-medium text-stone-700">Property details</label>
        <textarea
          id="text"
          name="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder={"e.g. 3 BHK flat in Gotri, Vadodara. 1450 sq ft, fully furnished, 5th floor, lift, covered parking. 95 lakh negotiable."}
          className="block w-full rounded-xl px-3.5 py-3 text-[15px] ring-1 ring-stone-300 outline-none focus:ring-2 focus:ring-brand-600"
        />
        <p className="mt-1 text-xs text-stone-500">English, Hindi, Gujarati or Hinglish — all fine. You can leave it empty and fill the form instead.</p>
      </div>
      {voice ? (
        <button type="button" onClick={rec ? stop : start} disabled={busy} className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl font-semibold ring-1 ${rec ? "bg-red-50 text-red-700 ring-red-200" : "bg-white text-stone-700 ring-stone-200"}`}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : rec ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          {busy ? "Transcribing…" : rec ? "Stop recording" : "Speak instead"}
        </button>
      ) : null}
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      <Submit />
    </form>
  );
}
