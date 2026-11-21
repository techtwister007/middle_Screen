import { z } from "zod";
import { currentAgent } from "@/lib/auth/session";
import { bad, json } from "@/lib/http";
import { getOwnListing } from "@/modules/listings";
import { registerUploadedVideo } from "@/modules/media";

export async function POST(req: Request) {
  const agent = await currentAgent();
  if (!agent) return bad("unauthorized", 401);
  const b = z.object({ listingId: z.string(), key: z.string().max(200), type: z.string(), size: z.number() }).safeParse(await req.json().catch(() => null));
  if (!b.success) return bad("invalid");
  if (!(await getOwnListing(agent.id, b.data.listingId))) return bad("not found", 404);
  const r = await registerUploadedVideo(agent.id, b.data.key, b.data.type, b.data.size, { listingId: b.data.listingId });
  return json({ ok: true, id: r.id });
}
