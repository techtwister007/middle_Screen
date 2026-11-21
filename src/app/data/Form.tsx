"use client";

import { useState } from "react";

export function DataRequestForm() {
  const [phone, setPhone] = useState("");
  const [kind, setKind] = useState<"delete" | "export">("delete");
  const [details, setDetails] = useState("");
  const [msg, setMsg] = useState("");
  const submit = async () => {
    const r = await fetch("/api/data-request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, kind, details }) }).then((x) => x.json());
    setMsg(r.ok ? "Request received. We'll get back to you within 30 days." : r.error);
  };
  return (
    <div className="space-y-3 rounded-2xl bg-stone-50 p-4 ring-1 ring-stone-200">
      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Mobile number" className="block w-full rounded-xl px-3 py-2.5 ring-1 ring-stone-300" />
      <select value={kind} onChange={(e) => setKind(e.target.value as "delete" | "export")} className="block w-full rounded-xl px-3 py-2.5 ring-1 ring-stone-300">
        <option value="delete">Delete my data</option>
        <option value="export">Send me a copy of my data</option>
      </select>
      <textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Anything else? (optional)" className="block w-full rounded-xl px-3 py-2.5 ring-1 ring-stone-300" />
      <button onClick={submit} className="h-11 rounded-xl bg-brand-700 px-5 font-semibold text-white">Submit request</button>
      {msg ? <p className="text-sm">{msg}</p> : null}
    </div>
  );
}
