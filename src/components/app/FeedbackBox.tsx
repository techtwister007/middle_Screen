"use client";

import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { feedbackAction } from "@/app/app/_actions/misc";

export function FeedbackBox() {
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const path = usePathname();
  return (
    <div className="space-y-2">
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="What should we improve? What's confusing? We read every message." aria-label="Feedback" className="block w-full rounded-xl px-3 py-2 text-sm ring-1 ring-stone-300" />
      <button disabled={pending || text.trim().length < 3} onClick={() => start(async () => { const r = await feedbackAction(text, path); setMsg(r.ok ? "Thank you, we read every message." : r.error); if (r.ok) setText(""); })} className="h-9 w-full rounded-lg bg-brand-700 text-sm font-semibold text-white disabled:opacity-50">
        Send feedback
      </button>
      {msg ? <p className="text-xs text-stone-600">{msg}</p> : null}
    </div>
  );
}
