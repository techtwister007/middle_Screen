import { currentAgent } from "@/lib/auth/session";
import { bad, json } from "@/lib/http";
import { agentDisplayName } from "@/modules/agents";
import { getAccess } from "@/modules/billing";
import { getOwnListing } from "@/modules/listings";
import { saveImage, saveVideo, MAX_IMAGES_PER_LISTING } from "@/modules/media";
import { db } from "@/db";
import { media } from "@/db/schema";
import { and, count, eq } from "drizzle-orm";

/** Upload one image (or a small video in local mode) to a listing. Browser compresses images first. */
export async function POST(req: Request) {
  const agent = await currentAgent();
  if (!agent) return bad("unauthorized", 401);
  if (!(await getAccess(agent.id)).canUse) return bad("Plan ended — renew to upload", 402);
  const fd = await req.formData().catch(() => null);
  const file = fd?.get("file");
  const listingId = String(fd?.get("listingId") ?? "");
  if (!(file instanceof File)) return bad("no file");
  const l = await getOwnListing(agent.id, listingId);
  if (!l) return bad("listing not found", 404);
  const buf = Buffer.from(await file.arrayBuffer());
  try {
    if (file.type.startsWith("video/")) {
      const r = await saveVideo(agent.id, buf, file.type, { listingId });
      return json({ ok: true, id: r.id });
    }
    if (!file.type.startsWith("image/")) return bad("Only images and videos");
    const [{ n }] = await db.select({ n: count() }).from(media).where(and(eq(media.listingId, listingId), eq(media.kind, "image")));
    if (n >= MAX_IMAGES_PER_LISTING) return bad(`Max ${MAX_IMAGES_PER_LISTING} photos per property`);
    const r = await saveImage(agent.id, buf, { listingId }, agent.watermark ? agentDisplayName(agent) : null);
    return json({ ok: true, id: r.id, duplicate: r.duplicate });
  } catch (e) {
    return bad((e as Error).message);
  }
}
