import { after } from "next/server";
import { z } from "zod";
import { bridgeAuthorized } from "@/lib/bridge-auth";
import { bad, json } from "@/lib/http";
import { handleInbound } from "@/modules/bot";
import { runDueJobs } from "@/modules/jobs";

const Msg = z.object({
  from: z.string(),
  providerId: z.string().optional(),
  type: z.enum(["text", "image", "video", "audio", "document", "location", "contact", "other"]),
  text: z.string().optional(),
  pushName: z.string().optional(),
  media: z.object({ base64: z.string(), mime: z.string(), filename: z.string().optional() }).optional(),
  location: z.object({ lat: z.number(), lng: z.number(), name: z.string().optional() }).optional(),
  contact: z.object({ name: z.string(), phone: z.string() }).optional(),
});

/** Baileys bridge (your laptop) posts each WhatsApp message here. */
export async function POST(req: Request) {
  if (!bridgeAuthorized(req)) return bad("unauthorized", 401);
  const p = Msg.safeParse(await req.json().catch(() => null));
  if (!p.success) return bad("invalid");
  const m = p.data;
  await handleInbound({ ...m, media: m.media ? { data: Buffer.from(m.media.base64, "base64"), mime: m.media.mime, filename: m.media.filename } : undefined });
  after(() => runDueJobs(5).then(() => {}));
  return json({ ok: true });
}
