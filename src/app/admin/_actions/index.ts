"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { env } from "@/config/env";
import { db } from "@/db";
import { agents, announcements, dataRequests, feedback, listings, reports } from "@/db/schema";
import { id } from "@/lib/ids";
import { endAdminSession, requireAdmin, startAdminSession, startAgentSession } from "@/lib/auth/session";
import { confirmPayment, createPayment, rejectPayment, extendSubscription } from "@/modules/billing";
import { notifyAgent } from "@/modules/notify";
import { timingSafeEqual } from "node:crypto";

export async function adminLoginAction(_: unknown, fd: FormData) {
  const pw = String(fd.get("password") ?? "");
  const a = Buffer.from(pw);
  const b = Buffer.from(env.ADMIN_PASSWORD);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    await new Promise((r) => setTimeout(r, 800));
    return { error: "Wrong password" };
  }
  await startAdminSession();
  redirect("/admin");
}

export async function adminLogoutAction() {
  await endAdminSession();
  redirect("/admin/login");
}

export async function confirmPaymentAction(paymentId: string) {
  await requireAdmin();
  await confirmPayment(paymentId);
  revalidatePath("/admin/payments");
}

export async function rejectPaymentAction(paymentId: string, fd: FormData) {
  await requireAdmin();
  await rejectPayment(paymentId, String(fd.get("note") ?? "") || undefined);
  revalidatePath("/admin/payments");
}

export async function grantMonthsAction(agentId: string, fd: FormData) {
  await requireAdmin();
  const months = Math.max(1, Math.min(24, Number(fd.get("months") ?? 1)));
  const note = String(fd.get("note") ?? "Manual");
  const pid = await createPayment(agentId, "manual", months, { reference: note.slice(0, 60) });
  await confirmPayment(pid);
  revalidatePath(`/admin/agents/${agentId}`);
}

export async function extendTrialAction(agentId: string, fd: FormData) {
  await requireAdmin();
  const days = Math.max(1, Math.min(90, Number(fd.get("days") ?? 7)));
  const sub = await db.query.subscriptions.findFirst({ where: (s, { eq }) => eq(s.agentId, agentId) });
  const base = sub && new Date(sub.periodEnd) > new Date() ? new Date(sub.periodEnd) : new Date();
  const { subscriptions } = await import("@/db/schema");
  await db.update(subscriptions).set({ periodEnd: new Date(base.getTime() + days * 86400000), updatedAt: new Date() }).where(eq(subscriptions.agentId, agentId));
  revalidatePath(`/admin/agents/${agentId}`);
}

export async function toggleAgentAction(agentId: string) {
  await requireAdmin();
  const a = await db.query.agents.findFirst({ where: eq(agents.id, agentId) });
  if (a) await db.update(agents).set({ disabled: !a.disabled }).where(eq(agents.id, agentId));
  revalidatePath(`/admin/agents/${agentId}`);
}

/** Support: open the agent's dashboard as them. */
export async function impersonateAction(agentId: string) {
  await requireAdmin();
  await startAgentSession(agentId);
  redirect("/app");
}

export async function toggleListingAction(listingId: string) {
  await requireAdmin();
  const l = await db.query.listings.findFirst({ where: eq(listings.id, listingId) });
  if (l) await db.update(listings).set({ disabledByAdmin: !l.disabledByAdmin }).where(eq(listings.id, listingId));
  revalidatePath("/admin/listings");
  revalidatePath("/admin/inbox");
}

export async function resolveAction(kind: "feedback" | "report" | "data", rid: string) {
  await requireAdmin();
  const t = kind === "feedback" ? feedback : kind === "report" ? reports : dataRequests;
  await db.update(t).set({ resolved: true }).where(eq(t.id, rid));
  revalidatePath("/admin/inbox");
}

export async function broadcastAction(fd: FormData) {
  await requireAdmin();
  const title = String(fd.get("title") ?? "").trim().slice(0, 120);
  const body = String(fd.get("body") ?? "").trim().slice(0, 500);
  if (!title) return;
  await db.insert(announcements).values({ id: id(), title, body });
  const all = await db.select({ id: agents.id }).from(agents).where(eq(agents.disabled, false));
  for (const a of all) await notifyAgent(a.id, { kind: "announcement", title: `📣 ${title}`, body, important: fd.get("push") === "on" });
  revalidatePath("/admin/broadcast");
}

export async function extendSubscriptionAction(agentId: string, months: number) {
  await requireAdmin();
  await extendSubscription(agentId, months);
}
