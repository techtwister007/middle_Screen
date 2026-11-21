"use client";

import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";

function urlB64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/** Free web-push alerts ("Rahul opened your property"). On iPhone requires Add to Home Screen. */
export function PushPrompt({ publicKey }: { publicKey: string }) {
  const [state, setState] = useState<"hidden" | "ask" | "done" | "denied">("hidden");
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;
    if (Notification.permission === "granted") {
      navigator.serviceWorker.register("/sw.js").then(async (reg) => {
        const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(publicKey) }));
        await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub) });
      }).catch(() => {});
      return;
    }
    if (Notification.permission === "default") setState("ask");
  }, [publicKey]);
  const enable = async () => {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return setState("denied");
    const reg = await navigator.serviceWorker.register("/sw.js");
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(publicKey) });
    await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub) });
    setState("done");
  };
  if (state !== "ask") return null;
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-200">
      <BellRing className="h-5 w-5 shrink-0 text-amber-700" />
      <p className="text-sm text-amber-900">Get an alert the moment a buyer opens your link or books a visit.</p>
      <button onClick={enable} className="ml-auto shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white">Enable</button>
    </div>
  );
}
