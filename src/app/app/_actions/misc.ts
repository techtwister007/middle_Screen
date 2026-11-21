"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { agents, feedback, notifications, payments } from "@/db/schema";
import { id } from "@/lib/ids";
import { requireAgent } from "@/lib/auth/session";
import { uniqueHandle } from "@/modules/agents";
import { createCollection, deleteCollection } from "@/modules/collections";
import { createPayment } from "@/modules/billing";
import { updateVisit, defaultScheduledAt } from "@/modules/visits";
import { activeAgent, safe } from "./guard";

/* ---------- Onboarding & profile ---------- */

export async function completeOnboardingAction(fd: FormData) {
  const agent = await requireAgent();
  const name = String(fd.get("name") ?? "").trim().slice(0, 60);
  if (name.length < 2) throw new Error("Please enter your name");
  if (fd.get("promise") !== "on") throw new Error("Please accept the Agent Promise");
  const company = String(fd.get("company") ?? "").trim().slice(0, 80) || null;
  await db
    .update(agents)
    .set({
      name,
      company,
      city: String(fd.get("city") ?? "").trim().slice(0, 60) || null,
      handle: await uniqueHandle(company || name, agent.id),
      networkOptIn: fd.get("network") === "on",
      promiseAcceptedAt: new Date(),
      onboarded: true,
      botContext: {},
    })
    .where(eq(agents.id, agent.id));
  redirect("/app?welcome=1");
}

const Profile = z.object({
  name: z.string().trim().min(2).max(60),
  company: z.string().trim().max(80),
  tagline: z.string().trim().max(140),
  city: z.string().trim().max(60),
  areas: z.string().trim().max(160),
  handle: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{3,40}$/, "Handle: 3-40 letters, numbers or dashes"),
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  welcomeMode: z.enum(["none", "minimal", "splash"]),
  pageLook: z.enum(["signature", "classic"]),
  watermark: z.boolean(),
  networkOptIn: z.boolean(),
});

export async function updateProfileAction(raw: unknown) {
  return safe(async () => {
    const agent = await requireAgent();
    const p = Profile.safeParse(raw);
    if (!p.success) throw new Error(p.error.issues[0]?.message ?? "Invalid");
    const v = p.data;
    const handle = await uniqueHandle(v.handle, agent.id);
    await db
      .update(agents)
      .set({ ...v, company: v.company || null, tagline: v.tagline || null, city: v.city || null, areas: v.areas || null, handle })
      .where(eq(agents.id, agent.id));
    revalidatePath("/app/settings");
    return { handle };
  });
}

export async function feedbackAction(text: string, page?: string) {
  return safe(async () => {
    const agent = await requireAgent();
    if (text.trim().length < 3) throw new Error("Tell us a bit more");
    await db.insert(feedback).values({ id: id(), agentId: agent.id, text: text.trim().slice(0, 4000), page: page?.slice(0, 200) });
  });
}

export async function markAllReadAction() {
  const agent = await requireAgent();
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.agentId, agent.id), isNull(notifications.readAt)));
  revalidatePath("/app", "layout");
}

/* ---------- Collections ---------- */

export async function createCollectionAction(v: { title: string; listingIds: string[]; leadId?: string | null; note?: string | null }) {
  return safe(async () => {
    const agent = await activeAgent();
    const c = await createCollection(agent.id, { title: v.title.trim() || "Properties selected for you", listingIds: v.listingIds, leadId: v.leadId ?? null, note: v.note?.trim() || null });
    revalidatePath("/app/collections");
    return { id: c.id };
  });
}

export async function deleteCollectionAction(cid: string) {
  const agent = await activeAgent();
  await deleteCollection(agent.id, cid);
  revalidatePath("/app/collections");
  redirect("/app/collections");
}

/* ---------- Visits ---------- */

export async function visitAction(visitId: string, op: "confirm" | "reschedule" | "decline" | "complete" | "no_show" | "cancel", v: { when?: string; outcome?: "liked" | "not_liked" | "negotiating"; feedback?: string } = {}) {
  return safe(async () => {
    const agent = await activeAgent();
    const visit = await db.query.visits.findFirst({ where: (x, { and, eq }) => and(eq(x.id, visitId), eq(x.agentId, agent.id)) });
    if (!visit) throw new Error("Visit not found");
    const when = v.when ? new Date(v.when.includes("+") || v.when.endsWith("Z") ? v.when : `${v.when}:00+05:30`) : null;
    if (when && Number.isNaN(when.getTime())) throw new Error("Invalid time");
    if (op === "confirm") await updateVisit(agent.id, visitId, { status: "confirmed", scheduledAt: when ?? defaultScheduledAt(visit.requestedDate, visit.requestedSlot) });
    if (op === "reschedule") { if (!when) throw new Error("Pick the new date & time"); await updateVisit(agent.id, visitId, { status: "rescheduled", scheduledAt: when, remindedAt: null }); }
    if (op === "decline") await updateVisit(agent.id, visitId, { status: "declined" });
    if (op === "cancel") await updateVisit(agent.id, visitId, { status: "cancelled" });
    if (op === "no_show") await updateVisit(agent.id, visitId, { status: "no_show" });
    if (op === "complete") await updateVisit(agent.id, visitId, { status: "completed", outcome: v.outcome ?? null, feedback: v.feedback?.slice(0, 1000) ?? null });
    revalidatePath("/app/visits");
    revalidatePath("/app");
  });
}

/* ---------- Billing ---------- */

export async function submitUpiAction(months: number, reference: string) {
  return safe(async () => {
    const agent = await requireAgent();
    const ref = reference.trim().replace(/\s+/g, "");
    if (!/^[A-Za-z0-9]{6,30}$/.test(ref)) throw new Error("Enter the 12-digit UTR / reference number from your UPI app");
    if (![1, 3, 12].includes(months)) throw new Error("Pick a plan");
    const dup = await db.query.payments.findFirst({ where: and(eq(payments.reference, ref), eq(payments.method, "upi")) });
    if (dup) throw new Error("This reference was already submitted");
    await createPayment(agent.id, "upi", months, { reference: ref });
    revalidatePath("/app/settings/billing");
  });
}
