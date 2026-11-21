import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { env } from "@/config/env";
import { db } from "@/db";
import { drafts, agents, media } from "@/db/schema";
import { id } from "@/lib/ids";
import { storage } from "@/lib/storage";
import { transcribe } from "@/lib/ai/client";
import { extractListing } from "@/lib/ai/extract";
import { agentDisplayName } from "./agents";
import { createListing, extractedToInput } from "./listings";
import { moveDraftMediaToListing, saveDocument, saveImage, saveVideo } from "./media";
import { enqueue } from "./jobs";

export async function openDraft(agentId: string) {
  return db.query.drafts.findFirst({ where: and(eq(drafts.agentId, agentId), eq(drafts.state, "collecting")) });
}

export async function getOrCreateDraft(agentId: string) {
  const ex = await openDraft(agentId);
  if (ex) return { draft: ex, created: false };
  const [d] = await db.insert(drafts).values({ id: id(), agentId }).returning();
  return { draft: d, created: true };
}

async function touch(draftId: string) {
  await db.update(drafts).set({ lastActivityAt: new Date() }).where(eq(drafts.id, draftId));
  await enqueue("finalize_draft", { draftId }, new Date(Date.now() + env.DRAFT_BATCH_MINUTES * 60000 + 5000));
}

export async function addDraftText(draftId: string, text: string) {
  await db.update(drafts).set({ texts: sql`${drafts.texts} || ${JSON.stringify([text.slice(0, 4000)])}::jsonb` }).where(eq(drafts.id, draftId));
  await touch(draftId);
}

export async function addDraftMedia(agent: typeof agents.$inferSelect, draftId: string, kind: "image" | "video" | "audio" | "doc", data: Buffer, mime: string, filename?: string) {
  if (kind === "doc") {
    await saveDocument(agent.id, data, mime, { draftId }, filename);
  } else if (kind === "image") {
    await saveImage(agent.id, data, { draftId }, agent.watermark ? agentDisplayName(agent) : null);
  } else if (kind === "video") {
    await saveVideo(agent.id, data, mime, { draftId });
  } else {
    const key = `a/${agent.id}/audio/${id()}.${mime.includes("mpeg") ? "mp3" : "ogg"}`;
    await storage.put(key, data, mime);
    await db.update(drafts).set({ audioKeys: sql`${drafts.audioKeys} || ${JSON.stringify([`${key}|${mime}`])}::jsonb` }).where(eq(drafts.id, draftId));
  }
  await touch(draftId);
}

export async function setDraftFields(draftId: string, v: { youtubeUrl?: string; location?: { lat: number; lng: number; name?: string } }) {
  await db.update(drafts).set(v).where(eq(drafts.id, draftId));
  await touch(draftId);
}

export async function discardDraft(draftId: string) {
  await db.update(drafts).set({ state: "discarded" }).where(eq(drafts.id, draftId));
  const ms = await db.select().from(media).where(eq(media.draftId, draftId));
  await db.delete(media).where(eq(media.draftId, draftId));
  for (const m of ms) {
    const keys = m.kind === "image" ? [`${m.key}-lg.webp`, `${m.key}-md.webp`, `${m.key}-sm.webp`] : [m.key];
    await Promise.all(keys.map((k) => storage.delete(k).catch(() => {})));
  }
}

export async function draftCounts(draftId: string) {
  const [r] = await db
    .select({ images: sql<number>`count(*) filter (where kind = 'image')::int`, videos: sql<number>`count(*) filter (where kind = 'video')::int` })
    .from(media)
    .where(eq(media.draftId, draftId));
  return r ?? { images: 0, videos: 0 };
}

/**
 * Turns the collected batch into a draft listing using AI (or the rule-based parser).
 * Returns null if the draft was not ready (still receiving) or already processed.
 */
export async function finalizeDraft(draftId: string, opts: { force?: boolean } = {}) {
  const [d] = await db
    .update(drafts)
    .set({ state: "processing" })
    .where(
      and(
        eq(drafts.id, draftId),
        eq(drafts.state, "collecting"),
        opts.force ? sql`true` : sql`${drafts.lastActivityAt} < now() - make_interval(mins => ${env.DRAFT_BATCH_MINUTES})`,
      ),
    )
    .returning();
  if (!d) return null;
  try {
    const agent = (await db.query.agents.findFirst({ where: eq(agents.id, d.agentId) }))!;
    const transcripts: string[] = [];
    for (const entry of d.audioKeys) {
      const [key, mime] = entry.split("|");
      const buf = await storage.get(key);
      if (!buf) continue;
      try {
        const t = await transcribe(buf, mime);
        if (t) transcripts.push(t);
      } catch (e) {
        console.error("[draft] transcription failed", e);
      }
    }
    const raw = [...d.texts, ...transcripts].join("\n").trim();
    const ex = await extractListing(raw, { city: agent.city });
    // Learn the agent's city from their first listing (no extra onboarding question needed).
    if (!agent.city && ex.city) await db.update(agents).set({ city: ex.city }).where(eq(agents.id, agent.id));
    const listing = await createListing(
      agent.id,
      extractedToInput(ex, {
        youtubeUrl: d.youtubeUrl,
        lat: d.location?.lat ?? null,
        lng: d.location?.lng ?? null,
        visibility: agent.networkOptIn ? "network" : "private",
      }),
      { aiGenerated: ex.usedAi, missing: ex.missing },
    );
    await moveDraftMediaToListing(d.id, listing.id);
    await db.update(drafts).set({ state: "done", listingId: listing.id }).where(eq(drafts.id, d.id));
    const unheardVoice = d.audioKeys.length > 0 && transcripts.length === 0;
    return { listing, extracted: ex, unheardVoice };
  } catch (e) {
    await db.update(drafts).set({ state: "failed", error: String(e).slice(0, 1000) }).where(eq(drafts.id, d.id));
    throw e;
  }
}
