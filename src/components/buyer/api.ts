"use client";

export function track(code: string, type: string, meta: Record<string, unknown> = {}, listingId?: string) {
  const body = JSON.stringify({ code, type, meta, listingId });
  try {
    if (type === "dwell" && navigator.sendBeacon) {
      navigator.sendBeacon("/api/t", new Blob([body], { type: "application/json" }));
      return;
    }
    fetch("/api/t", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
  } catch {}
}

export type BuyerResult = { ok: boolean; needIdentity?: boolean; error?: string; lead?: { name: string } | null };

export async function buyerAction(payload: Record<string, unknown>): Promise<BuyerResult> {
  const res = await fetch("/api/buyer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  return res.json().catch(() => ({ ok: false, error: "Network error" }));
}

/** Measures visible time on page and sends it once when the page is hidden. */
export function startDwell(code: string, listingId?: string) {
  let start = Date.now();
  let total = 0;
  let sent = false;
  const onVis = () => {
    if (document.visibilityState === "hidden") {
      total += Date.now() - start;
      if (!sent && total > 5000) {
        sent = true;
        track(code, "dwell", { sec: Math.round(total / 1000) }, listingId);
      }
    } else start = Date.now();
  };
  document.addEventListener("visibilitychange", onVis);
  window.addEventListener("pagehide", onVis);
  return () => {
    document.removeEventListener("visibilitychange", onVis);
    window.removeEventListener("pagehide", onVis);
  };
}
