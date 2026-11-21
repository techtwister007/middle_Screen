import { z } from "zod";
import { currentAgent } from "@/lib/auth/session";
import { bad, json } from "@/lib/http";
import { id } from "@/lib/ids";
import { storage } from "@/lib/storage";
import { getOwnListing } from "@/modules/listings";
import { MAX_VIDEO_BYTES } from "@/modules/media";

/** Large videos go straight from the browser to R2 (bypasses the 4.5 MB serverless body limit). */
export async function POST(req: Request) {
  const agent = await currentAgent();
  if (!agent) return bad("unauthorized", 401);
  const b = z.object({ listingId: z.string(), type: z.string().startsWith("video/"), size: z.number().max(MAX_VIDEO_BYTES, "Video too large (max 50 MB) — use a YouTube link instead") }).safeParse(await req.json().catch(() => null));
  if (!b.success) return bad(b.error.issues[0]?.message ?? "invalid");
  if (!(await getOwnListing(agent.id, b.data.listingId))) return bad("not found", 404);
  const ext = b.data.type.includes("quicktime") ? "mov" : b.data.type.includes("webm") ? "webm" : "mp4";
  const key = `a/${agent.id}/v/${id()}.${ext}`;
  const url = await storage.presignPut(key, b.data.type);
  return json({ ok: true, direct: !url, url, key });
}
