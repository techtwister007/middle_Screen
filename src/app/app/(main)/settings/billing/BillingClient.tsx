"use client";

import { useState, useTransition } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";
import { submitUpiAction } from "@/app/app/_actions/misc";

type Plan = { months: number; amount: number; label: string; note: string };
declare global {
  interface Window {
    Razorpay?: new (o: Record<string, unknown>) => { open: () => void };
  }
}

export function BillingClient({ plans, qrs, upiId, upiName, razorpay, agent }: { plans: Plan[]; qrs: Record<string, string>; upiId: string; upiName: string; razorpay: boolean; agent: { name: string; phone: string } }) {
  const [months, setMonths] = useState(1);
  const [method, setMethod] = useState<"card" | "upi">(razorpay ? "card" : "upi");
  const [utr, setUtr] = useState("");
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const plan = plans.find((p) => p.months === months)!;

  const pay = async () => {
    setMsg("");
    const o = await fetch("/api/billing/razorpay/order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ months }) }).then((x) => x.json());
    if (!o.ok) return setMsg(o.error ?? "Could not start payment");
    const verify = async (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
      const v = await fetch("/api/billing/razorpay/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(resp) }).then((x) => x.json());
      if (v.ok) {
        setOk(true);
        router.refresh();
      } else setMsg(v.error ?? "Payment verification failed");
    };
    if (o.simulated) {
      // Dev mode without Razorpay keys
      if (confirm(`[Dev] Simulate a successful payment of ₹${o.amount}?`)) await verify({ razorpay_order_id: o.orderId, razorpay_payment_id: `pay_sim_${Date.now()}`, razorpay_signature: "sim" });
      return;
    }
    if (!window.Razorpay) return setMsg("Payment window is still loading — try again in a moment.");
    new window.Razorpay({
      key: o.keyId,
      order_id: o.orderId,
      amount: o.amount * 100,
      currency: "INR",
      name: upiName,
      description: `${plan.label} plan`,
      prefill: { name: agent.name, contact: `+${agent.phone}` },
      theme: { color: "#1f4d36" },
      handler: verify,
    }).open();
  };

  const submitUtr = () =>
    start(async () => {
      const r = await submitUpiAction(months, utr);
      if (r.ok) {
        setOk(true);
        setUtr("");
        router.refresh();
      } else setMsg(r.error);
    });

  if (ok)
    return (
      <div className="flex flex-col items-center rounded-2xl bg-emerald-50 p-6 text-center ring-1 ring-emerald-200">
        <CheckCircle2 className="h-10 w-10 text-emerald-600" />
        <p className="mt-2 font-display text-lg font-bold text-emerald-900">{method === "upi" ? "Submitted — we'll verify within a few hours" : "Payment successful — thank you!"}</p>
        <p className="text-sm text-emerald-800">{method === "upi" ? "You keep full access meanwhile." : "Your plan has been extended."}</p>
      </div>
    );

  return (
    <div className="space-y-4">
      {razorpay ? <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" /> : null}
      <div className="grid grid-cols-3 gap-2">
        {plans.map((p) => (
          <button key={p.months} onClick={() => setMonths(p.months)} className={`rounded-2xl p-3 text-left ring-1 ${months === p.months ? "bg-brand-50 ring-2 ring-brand-600" : "bg-white ring-stone-200"}`}>
            <p className="text-xs font-semibold uppercase text-stone-500">{p.label}</p>
            <p className="font-display text-xl font-bold">₹{p.amount.toLocaleString("en-IN")}</p>
            <p className="text-xs text-brand-700">{p.note || `₹${Math.round(p.amount / p.months)}/mo`}</p>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1 text-sm font-semibold">
        <button onClick={() => setMethod("card")} className={`rounded-lg py-2 ${method === "card" ? "bg-white shadow-sm" : "text-stone-500"}`}>Pay online (UPI / card)</button>
        <button onClick={() => setMethod("upi")} className={`rounded-lg py-2 ${method === "upi" ? "bg-white shadow-sm" : "text-stone-500"}`}>Pay by UPI QR</button>
      </div>
      {method === "card" ? (
        <div className="rounded-2xl bg-white p-4 ring-1 ring-stone-200">
          <p className="text-sm text-stone-600">Secure checkout by Razorpay — UPI, cards, net banking. Plan activates instantly.</p>
          <button onClick={pay} className="mt-3 h-12 w-full rounded-xl bg-brand-700 font-bold text-white">Pay ₹{plan.amount.toLocaleString("en-IN")}</button>
        </div>
      ) : (
        <div className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-stone-200">
          <div className="flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrs[String(months)]} alt="UPI QR code" className="w-48" />
            <p className="mt-2 text-sm">Scan with any UPI app or pay to <b className="select-all">{upiId}</b></p>
            <p className="text-xs text-stone-500">Amount: ₹{plan.amount.toLocaleString("en-IN")} · {upiName}</p>
          </div>
          <div>
            <label htmlFor="utr" className="mb-1 block text-sm font-medium text-stone-700">After paying, enter the UTR / reference number</label>
            <input id="utr" value={utr} onChange={(e) => setUtr(e.target.value)} placeholder="12-digit UTR" className="block w-full rounded-xl px-3.5 py-2.5 ring-1 ring-stone-300" />
          </div>
          <button disabled={pending || utr.length < 6} onClick={submitUtr} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-700 font-semibold text-white disabled:opacity-50">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} I&apos;ve paid — submit
          </button>
        </div>
      )}
      {msg ? <p className="text-sm text-red-600">{msg}</p> : null}
    </div>
  );
}
