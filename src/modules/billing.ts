import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { env } from "@/config/env";
import { db } from "@/db";
import { payments, subscriptions, agents, type PaymentMethod } from "@/db/schema";
import { id } from "@/lib/ids";
import { notifyAgent } from "./notify";

const DAY = 86400000;

export type AccessState = "ok" | "grace" | "locked" | "expired";
export type Access = {
  state: AccessState;
  status: "trial" | "active";
  periodEnd: Date;
  daysLeft: number; // days until periodEnd (negative after)
  /** Agent can use dashboard + bot + create listings. */
  canUse: boolean;
  /** Buyer pages fully work. */
  pagesLive: boolean;
  /** Buyer tracking + alerts work. */
  tracking: boolean;
};

export function computeAccess(sub: { status: "trial" | "active"; periodEnd: Date }, now = new Date()): Access {
  const end = new Date(sub.periodEnd);
  const t = now.getTime();
  const graceEnd = end.getTime() + env.GRACE_DAYS * DAY;
  const pagesEnd = graceEnd + env.PAGES_AFTER_LOCK_DAYS * DAY;
  const state: AccessState = t < end.getTime() ? "ok" : t < graceEnd ? "grace" : t < pagesEnd ? "locked" : "expired";
  return {
    state,
    status: sub.status,
    periodEnd: end,
    daysLeft: Math.ceil((end.getTime() - t) / DAY),
    canUse: state === "ok" || state === "grace",
    pagesLive: state !== "expired",
    tracking: state === "ok" || state === "grace",
  };
}

export async function getAccess(agentId: string): Promise<Access> {
  const sub = await db.query.subscriptions.findFirst({ where: eq(subscriptions.agentId, agentId) });
  if (!sub) return computeAccess({ status: "trial", periodEnd: new Date(Date.now() + env.TRIAL_DAYS * DAY) });
  return computeAccess(sub);
}

export async function startTrial(agentId: string) {
  await db
    .insert(subscriptions)
    .values({ agentId, status: "trial", periodEnd: new Date(Date.now() + env.TRIAL_DAYS * DAY), priceInr: env.PLAN_PRICE_INR })
    .onConflictDoNothing();
}

/* ---------------- Plans ---------------- */

export function planOptions() {
  const p = env.PLAN_PRICE_INR;
  return [
    { months: 1, amount: p, label: "Monthly", note: "" },
    { months: 3, amount: Math.round(p * 3 * 0.95), label: "Quarterly", note: "Save 5%" },
    { months: 12, amount: p * 10, label: "Yearly", note: "2 months free" },
  ];
}
export function amountFor(months: number) {
  return planOptions().find((o) => o.months === months)?.amount ?? env.PLAN_PRICE_INR * months;
}

function addMonths(d: Date, m: number) {
  const r = new Date(d);
  r.setMonth(r.getMonth() + m);
  return r;
}

/** Extend paid access. Paying during trial/grace adds on top of the current end date (never loses days). */
export async function extendSubscription(agentId: string, months: number) {
  const sub = await db.query.subscriptions.findFirst({ where: eq(subscriptions.agentId, agentId) });
  const from = sub && new Date(sub.periodEnd) > new Date() ? new Date(sub.periodEnd) : new Date();
  const periodEnd = addMonths(from, months);
  await db
    .insert(subscriptions)
    .values({ agentId, status: "active", periodEnd, priceInr: env.PLAN_PRICE_INR })
    .onConflictDoUpdate({ target: subscriptions.agentId, set: { status: "active", periodEnd, updatedAt: new Date() } });
  return periodEnd;
}

export async function confirmPayment(paymentId: string, reference?: string) {
  const [p] = await db
    .update(payments)
    .set({ status: "confirmed", confirmedAt: new Date(), ...(reference ? { reference } : {}) })
    .where(and(eq(payments.id, paymentId), eq(payments.status, "pending")))
    .returning();
  if (!p) return null;
  const end = await extendSubscription(p.agentId, p.months);
  await notifyAgent(p.agentId, {
    kind: "billing",
    title: "Payment received — thank you!",
    body: `Your plan is active till ${end.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}.`,
    href: "/app/settings/billing",
    important: true,
  });
  return p;
}

export async function rejectPayment(paymentId: string, note?: string) {
  const [p] = await db.update(payments).set({ status: "rejected", note }).where(eq(payments.id, paymentId)).returning();
  if (p)
    await notifyAgent(p.agentId, {
      kind: "billing",
      title: "UPI payment could not be verified",
      body: note || "Please check the UTR / reference number and submit again, or contact support.",
      href: "/app/settings/billing",
      important: true,
    });
  return p;
}

export async function createPayment(agentId: string, method: PaymentMethod, months: number, extra: { reference?: string; orderId?: string } = {}) {
  const pid = id();
  await db.insert(payments).values({ id: pid, agentId, method, months, amountInr: amountFor(months), ...extra });
  return pid;
}

/* ---------------- Razorpay ---------------- */

export const razorpayEnabled = () => !!(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);

export async function createRazorpayOrder(agentId: string, months: number) {
  const amount = amountFor(months);
  const receipt = `pp_${id().slice(0, 12)}`;
  if (!razorpayEnabled()) {
    // Dev simulation: fake order id
    const orderId = `order_sim_${id().slice(0, 10)}`;
    await createPayment(agentId, "razorpay", months, { orderId });
    return { orderId, amount, keyId: null as string | null, simulated: true };
  }
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic " + Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64"),
    },
    body: JSON.stringify({ amount: amount * 100, currency: "INR", receipt, notes: { agentId, months: String(months) } }),
  });
  if (!res.ok) throw new Error(`Razorpay order ${res.status}: ${await res.text()}`);
  const order = (await res.json()) as { id: string };
  await createPayment(agentId, "razorpay", months, { orderId: order.id });
  return { orderId: order.id, amount, keyId: env.RAZORPAY_KEY_ID!, simulated: false };
}

function safeEq(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function verifyRazorpayCheckout(orderId: string, paymentId: string, signature: string) {
  if (!razorpayEnabled()) return orderId.startsWith("order_sim_");
  const expected = createHmac("sha256", env.RAZORPAY_KEY_SECRET!).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEq(expected, signature);
}

export function verifyRazorpayWebhook(raw: string, signature: string | null) {
  if (!env.RAZORPAY_WEBHOOK_SECRET || !signature) return false;
  return safeEq(createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET).update(raw).digest("hex"), signature);
}

/** Idempotent: confirm the pending payment for a Razorpay order. */
export async function confirmRazorpayOrder(orderId: string, paymentRef: string) {
  const p = await db.query.payments.findFirst({ where: eq(payments.orderId, orderId) });
  if (!p || p.status !== "pending") return p ?? null;
  return confirmPayment(p.id, paymentRef);
}

/* ---------------- UPI ---------------- */

export function upiUri(amount: number, note: string) {
  const q = new URLSearchParams({ pa: env.UPI_ID, pn: env.UPI_NAME, am: String(amount), cu: "INR", tn: note });
  return `upi://pay?${q.toString()}`;
}

/* ---------------- Reminders (cron) ---------------- */

export async function sendRenewalReminders() {
  const subs = await db.select({ s: subscriptions, phone: agents.phone }).from(subscriptions).innerJoin(agents, eq(agents.id, subscriptions.agentId));
  for (const { s } of subs) {
    const a = computeAccess(s);
    if (a.state === "ok" && [7, 3, 1].includes(a.daysLeft)) {
      await notifyAgent(s.agentId, {
        kind: "billing",
        title: s.status === "trial" ? `Your free trial ends in ${a.daysLeft} day${a.daysLeft > 1 ? "s" : ""}` : `Plan renews in ${a.daysLeft} day${a.daysLeft > 1 ? "s" : ""}`,
        body: "Keep your links, leads and alerts running — renew in 1 minute.",
        href: "/app/settings/billing",
        important: true,
      });
    }
  }
}
