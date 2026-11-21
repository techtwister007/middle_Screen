"use client";

import { useState } from "react";
import { Check, ClipboardCopy } from "lucide-react";

/** Copies prepared text (e.g. a listing formatted for property portals) with a clear "Copied" confirmation. */
export function CopyText({ text, label, className = "" }: { text: string; label: string; className?: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const t = document.createElement("textarea");
      t.value = text;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    setDone(true);
    setTimeout(() => setDone(false), 2200);
  };
  return (
    <button type="button" onClick={copy} className={`press flex h-11 items-center justify-center gap-2 rounded-[14px] bg-stone-100 text-sm font-semibold ${className}`}>
      {done ? <Check className="h-4 w-4 text-emerald-700 [animation:pop_.45s_cubic-bezier(.22,1,.36,1)]" /> : <ClipboardCopy className="h-4 w-4" />}
      {done ? "Copied" : label}
    </button>
  );
}
