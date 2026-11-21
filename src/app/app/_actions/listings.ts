"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { extractListing } from "@/lib/ai/extract";
import { createListing, extractedToInput, publishListing, setListingStatus, updateListing, markVerified, deleteListing, type ListingInput } from "@/modules/listings";
import { reorderMedia, deleteMedia } from "@/modules/media";
import { listingUrl } from "@/modules/shares";
import type { ListingStatus } from "@/db/schema";
import { activeAgent, safe } from "./guard";

/** "Paste or dictate details" → AI/rule draft → editor. */
export async function createFromTextAction(formData: FormData) {
  const agent = await activeAgent();
  const text = String(formData.get("text") ?? "").slice(0, 6000);
  const ex = await extractListing(text, { city: agent.city });
  const l = await createListing(agent.id, extractedToInput(ex, { visibility: agent.networkOptIn ? "network" : "private" }), { aiGenerated: ex.usedAi, missing: text.trim() ? ex.missing : [] });
  redirect(`/app/properties/${l.id}/edit?new=1`);
}

const num = z.preprocess((v) => (v === "" || v == null ? null : Number(String(v).replace(/[,\s]/g, ""))), z.number().nonnegative().nullable());

const ListingSchema = z.object({
  purpose: z.enum(["sale", "rent"]),
  type: z.enum(["flat", "house", "plot", "commercial", "pg"]),
  title: z.string().trim().min(3, "Add a title").max(120),
  description: z.string().max(4000),
  priceMode: z.enum(["exact", "range", "on_request"]),
  price: num,
  priceMax: num,
  negotiable: z.boolean(),
  locality: z.string().trim().max(80).nullable(),
  city: z.string().trim().max(60).nullable(),
  lat: z.number().min(-90).max(90).nullable(),
  lng: z.number().min(-180).max(180).nullable(),
  building: z.string().trim().max(120).nullable(),
  unit: z.string().trim().max(40).nullable(),
  showBuilding: z.boolean(),
  locationPrivacy: z.enum(["exact", "area", "hidden"]),
  youtubeUrl: z.string().trim().max(300).nullable(),
  visibility: z.enum(["private", "network"]),
  fields: z.object({
    bhk: num.optional(),
    areaSqft: num.optional(),
    carpetSqft: num.optional(),
    plotSqyd: num.optional(),
    floor: z.string().max(20).nullable().optional(),
    totalFloors: num.optional(),
    furnishing: z.enum(["unfurnished", "semi", "full"]).nullable().optional(),
    bathrooms: num.optional(),
    balconies: num.optional(),
    parking: z.string().max(40).nullable().optional(),
    facing: z.string().max(30).nullable().optional(),
    ageYears: num.optional(),
    possession: z.string().max(60).nullable().optional(),
    deposit: num.optional(),
    maintenance: num.optional(),
    amenities: z.array(z.string().max(40)).max(30).optional(),
  }),
});

function clean<T extends Record<string, unknown>>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && !v.length))) as T;
}

export async function saveListingAction(listingId: string, raw: unknown, publish: boolean) {
  return safe(async () => {
    const agent = await activeAgent();
    const p = ListingSchema.safeParse(raw);
    if (!p.success) throw new Error(p.error.issues[0]?.message ?? "Please check the form");
    const v = p.data;
    if (v.priceMode !== "on_request" && !v.price) throw new Error("Add a price, or choose “Price on request”");
    if (v.priceMode === "range" && (!v.priceMax || v.priceMax <= (v.price ?? 0))) throw new Error("Max price must be higher than min price");
    const input: ListingInput = { ...v, priceMax: v.priceMode === "range" ? v.priceMax : null, price: v.priceMode === "on_request" ? null : v.price, fields: clean(v.fields) as ListingInput["fields"] };
    await updateListing(agent.id, listingId, input);
    let url: string | null = null;
    if (publish) url = listingUrl((await publishListing(agent.id, listingId)).code);
    revalidatePath(`/app/properties/${listingId}`);
    revalidatePath("/app/properties");
    return { url };
  });
}

export async function publishAction(listingId: string) {
  return safe(async () => {
    const agent = await activeAgent();
    const s = await publishListing(agent.id, listingId);
    revalidatePath(`/app/properties/${listingId}`);
    return { url: listingUrl(s.code) };
  });
}

export async function setStatusAction(listingId: string, status: ListingStatus) {
  return safe(async () => {
    const agent = await activeAgent();
    if (status === "available") await publishListing(agent.id, listingId);
    await setListingStatus(agent.id, listingId, status);
    revalidatePath(`/app/properties/${listingId}`);
    revalidatePath("/app/properties");
  });
}

export async function verifyAction(listingId: string) {
  return safe(async () => {
    const agent = await activeAgent();
    await markVerified(agent.id, listingId);
    revalidatePath(`/app/properties/${listingId}`);
  });
}

export async function archiveAction(listingId: string) {
  const agent = await activeAgent();
  await deleteListing(agent.id, listingId);
  revalidatePath("/app/properties");
  redirect("/app/properties");
}

export async function reorderMediaAction(listingId: string, ids: string[]) {
  return safe(async () => {
    const agent = await activeAgent();
    await reorderMedia(agent.id, listingId, ids);
    revalidatePath(`/app/properties/${listingId}`);
  });
}

export async function deleteMediaAction(listingId: string, mediaId: string) {
  return safe(async () => {
    const agent = await activeAgent();
    await deleteMedia(agent.id, mediaId);
    revalidatePath(`/app/properties/${listingId}`);
  });
}

/** Mark sold/rented and (optionally) record which buyer closed — proof of value for the agent & pilot. */
export async function closeDealAction(listingId: string, status: "sold" | "rented", leadId: string | null) {
  return safe(async () => {
    const agent = await activeAgent();
    await setListingStatus(agent.id, listingId, status);
    const { db } = await import("@/db");
    const { listings, leads } = await import("@/db/schema");
    const { and, eq } = await import("drizzle-orm");
    await db.update(listings).set({ closedLeadId: leadId, closedAt: new Date() }).where(and(eq(listings.id, listingId), eq(listings.agentId, agent.id)));
    if (leadId) await db.update(leads).set({ stage: "closed" }).where(and(eq(leads.id, leadId), eq(leads.agentId, agent.id)));
    revalidatePath(`/app/properties/${listingId}`);
    revalidatePath("/app/properties");
  });
}
