import { eq } from "drizzle-orm";
import { db } from "@/db";
import { agents } from "@/db/schema";
import { currentAgent } from "@/lib/auth/session";
import { bad, json } from "@/lib/http";
import { id } from "@/lib/ids";
import { processAvatar, processLogo } from "@/lib/images";
import { storage } from "@/lib/storage";

/** Upload agent photo or logo. */
export async function POST(req: Request) {
  const agent = await currentAgent();
  if (!agent) return bad("unauthorized", 401);
  const fd = await req.formData().catch(() => null);
  const file = fd?.get("file");
  const kind = fd?.get("kind") === "logo" ? "logo" : "photo";
  if (!(file instanceof File) || !file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) return bad("Upload an image under 10 MB");
  const buf = Buffer.from(await file.arrayBuffer());
  const out = kind === "logo" ? await processLogo(buf) : await processAvatar(buf);
  const url = await storage.put(`a/${agent.id}/brand/${kind}-${id().slice(0, 6)}.webp`, out, "image/webp");
  await db.update(agents).set(kind === "logo" ? { logoUrl: url } : { photoUrl: url }).where(eq(agents.id, agent.id));
  return json({ ok: true, url });
}
