"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { leads, type LeadStage, type Requirement } from "@/db/schema";
import { normalizePhone } from "@/lib/phone";
import { parseAmount } from "@/lib/ai/parse";
import { addNote, findOrCreateLead, updateLead } from "@/modules/leads";
import { activeAgent, safe } from "./guard";

function parseReq(fd: FormData): Requirement {
  const r: Requirement = {};
  const purpose = String(fd.get("purpose") ?? "");
  if (purpose === "sale" || purpose === "rent") r.purpose = purpose;
  const type = String(fd.get("type") ?? "");
  if (["flat", "house", "plot", "commercial", "pg"].includes(type)) r.type = type as Requirement["type"];
  const bhk = fd.getAll("bhk").map(Number).filter((n) => n > 0 && n < 10);
  if (bhk.length) r.bhk = bhk;
  const min = parseAmount(String(fd.get("budgetMin") ?? "").replace(/\s/g, ""));
  const max = parseAmount(String(fd.get("budgetMax") ?? "").replace(/\s/g, ""));
  if (min) r.budgetMin = min;
  if (max) r.budgetMax = max;
  const locs = String(fd.get("localities") ?? "").split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
  if (locs.length) r.localities = locs.slice(0, 10);
  const timeline = String(fd.get("timeline") ?? "").trim();
  if (timeline) r.timeline = timeline.slice(0, 60);
  const notes = String(fd.get("reqNotes") ?? "").trim();
  if (notes) r.notes = notes.slice(0, 500);
  return r;
}

export async function createLeadAction(fd: FormData) {
  const agent = await activeAgent();
  const name = String(fd.get("name") ?? "").trim();
  const rawPhone = String(fd.get("phone") ?? "");
  const phone = normalizePhone(rawPhone);
  if (!name && !phone) throw new Error("Add a name or phone");
  const lead = await findOrCreateLead(agent.id, { name, phone, source: "manual" });
  const req = parseReq(fd);
  if (Object.keys(req).length) await updateLead(agent.id, lead.id, { requirement: req });
  revalidatePath("/app/leads");
  redirect(`/app/leads/${lead.id}`);
}

export async function saveRequirementAction(leadId: string, fd: FormData) {
  return safe(async () => {
    const agent = await activeAgent();
    await updateLead(agent.id, leadId, { requirement: parseReq(fd) });
    revalidatePath(`/app/leads/${leadId}`);
  });
}

export async function updateLeadInfoAction(leadId: string, v: { name?: string; phone?: string }) {
  return safe(async () => {
    const agent = await activeAgent();
    const patch: { name?: string; phone?: string | null } = {};
    if (v.name !== undefined) patch.name = v.name.trim().slice(0, 80);
    if (v.phone !== undefined) {
      const p = normalizePhone(v.phone);
      if (v.phone && !p) throw new Error("Invalid phone");
      patch.phone = p;
    }
    await updateLead(agent.id, leadId, patch);
    revalidatePath(`/app/leads/${leadId}`);
  });
}

export async function setStageAction(leadId: string, stage: LeadStage) {
  return safe(async () => {
    const agent = await activeAgent();
    z.enum(["new", "exploring", "interested", "visit", "negotiating", "closed", "lost"]).parse(stage);
    await updateLead(agent.id, leadId, { stage });
    revalidatePath(`/app/leads/${leadId}`);
    revalidatePath("/app/leads");
  });
}

export async function setFollowUpAction(leadId: string, when: string | null, note?: string) {
  return safe(async () => {
    const agent = await activeAgent();
    const d = when ? new Date(when.length === 10 ? `${when}T10:00:00+05:30` : when) : null;
    if (d && Number.isNaN(d.getTime())) throw new Error("Invalid date");
    await updateLead(agent.id, leadId, { nextFollowUpAt: d, followUpNote: note?.slice(0, 200) ?? null });
    revalidatePath(`/app/leads/${leadId}`);
    revalidatePath("/app");
  });
}

export async function addNoteAction(leadId: string, text: string) {
  return safe(async () => {
    const agent = await activeAgent();
    if (!text.trim()) throw new Error("Write something");
    await addNote(agent.id, leadId, text.trim());
    await db.update(leads).set({ lastActivityAt: new Date() }).where(and(eq(leads.id, leadId), eq(leads.agentId, agent.id)));
    revalidatePath(`/app/leads/${leadId}`);
  });
}

export async function deleteLeadAction(leadId: string) {
  const agent = await activeAgent();
  await db.delete(leads).where(and(eq(leads.id, leadId), eq(leads.agentId, agent.id)));
  revalidatePath("/app/leads");
  redirect("/app/leads");
}
