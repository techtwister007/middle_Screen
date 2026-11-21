import "server-only";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { media } from "@/db/schema";
import { id } from "@/lib/ids";
import { processImage } from "@/lib/images";
import { storage } from "@/lib/storage";

export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
export const MAX_IMAGES_PER_LISTING = 40;

type Owner = { listingId?: string | null; draftId?: string | null };

async function nextPosition(o: Owner) {
  const where = o.listingId ? eq(media.listingId, o.listingId) : o.draftId ? eq(media.draftId, o.draftId) : undefined;
  if (!where) return 0;
  const [r] = await db.select({ n: sql<number>`coalesce(max(${media.position}) + 1, 0)` }).from(media).where(where);
  return Number(r?.n ?? 0);
}

/** Process (resize/watermark/strip GPS) and store an image. Skips exact duplicates within the same listing/draft. */
export async function saveImage(agentId: string, input: Buffer, owner: Owner, watermark?: string | null) {
  if (input.byteLength > MAX_IMAGE_BYTES) throw new Error("Image too large (max 15 MB)");
  const v = await processImage(input, watermark);
  const scope = owner.listingId ? eq(media.listingId, owner.listingId) : owner.draftId ? eq(media.draftId, owner.draftId) : undefined;
  if (scope) {
    const dup = await db.query.media.findFirst({ where: and(scope, eq(media.hash, v.hash)), columns: { id: true } });
    if (dup) return { id: dup.id, duplicate: true };
  }
  const mid = id();
  const prefix = `a/${agentId}/m/${mid}`;
  const [url, urlMd, urlSm] = await Promise.all([
    storage.put(`${prefix}-lg.webp`, v.lg, "image/webp"),
    storage.put(`${prefix}-md.webp`, v.md, "image/webp"),
    storage.put(`${prefix}-sm.webp`, v.sm, "image/webp"),
  ]);
  await db.insert(media).values({
    id: mid,
    agentId,
    listingId: owner.listingId ?? null,
    draftId: owner.draftId ?? null,
    kind: "image",
    key: prefix,
    url,
    urlMd,
    urlSm,
    mime: "image/webp",
    bytes: v.lg.byteLength,
    width: v.width,
    height: v.height,
    hash: v.hash,
    position: await nextPosition(owner),
  });
  return { id: mid, duplicate: false };
}

export async function saveVideo(agentId: string, input: Buffer, mime: string, owner: Owner) {
  if (input.byteLength > MAX_VIDEO_BYTES) throw new Error("Video too large (max 50 MB). Tip: upload to YouTube and paste the link.");
  const mid = id();
  const ext = mime.includes("quicktime") ? "mov" : mime.includes("webm") ? "webm" : "mp4";
  const key = `a/${agentId}/v/${mid}.${ext}`;
  const url = await storage.put(key, input, mime || "video/mp4");
  await db.insert(media).values({ id: mid, agentId, listingId: owner.listingId ?? null, draftId: owner.draftId ?? null, kind: "video", key, url, mime, bytes: input.byteLength, position: await nextPosition(owner) });
  return { id: mid };
}

/** Register a video that the browser uploaded directly to storage via a pre-signed URL. */
export async function registerUploadedVideo(agentId: string, key: string, mime: string, bytes: number, owner: Owner) {
  if (!key.startsWith(`a/${agentId}/v/`)) throw new Error("bad key");
  const mid = id();
  await db.insert(media).values({ id: mid, agentId, listingId: owner.listingId ?? null, draftId: owner.draftId ?? null, kind: "video", key, url: storage.publicUrl(key), mime, bytes, position: await nextPosition(owner) });
  return { id: mid };
}

export async function listingMedia(listingId: string) {
  return db.select().from(media).where(eq(media.listingId, listingId)).orderBy(asc(media.position), asc(media.createdAt));
}

export async function mediaForListings(listingIds: string[]) {
  if (!listingIds.length) return [];
  return db.select().from(media).where(inArray(media.listingId, listingIds)).orderBy(asc(media.position), asc(media.createdAt));
}

export async function moveDraftMediaToListing(draftId: string, listingId: string) {
  await db.update(media).set({ listingId, draftId: null }).where(eq(media.draftId, draftId));
}

export async function reorderMedia(agentId: string, listingId: string, orderedIds: string[]) {
  await Promise.all(
    orderedIds.map((mid, i) => db.update(media).set({ position: i }).where(and(eq(media.id, mid), eq(media.agentId, agentId), eq(media.listingId, listingId)))),
  );
}

export async function deleteMedia(agentId: string, mediaId: string) {
  const [m] = await db.delete(media).where(and(eq(media.id, mediaId), eq(media.agentId, agentId))).returning();
  if (!m) return;
  const keys = m.kind === "image" ? [`${m.key}-lg.webp`, `${m.key}-md.webp`, `${m.key}-sm.webp`] : [m.key];
  await Promise.all(keys.map((k) => storage.delete(k).catch(() => {})));
}
