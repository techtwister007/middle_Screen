import { asc, eq, gt, and } from "drizzle-orm";
import { z } from "zod";
import { devTools } from "@/config/env";
import { db } from "@/db";
import { waMessages } from "@/db/schema";
import { isAdmin } from "@/lib/auth/session";
import { bad, json } from "@/lib/http";
import { normalizePhone } from "@/lib/phone";
import { handleInbound } from "@/modules/bot";
import { runDueJobs } from "@/modules/jobs";

/**
 * WhatsApp simulator (DEV_TOOLS only, admin session required): pretend to be any phone number
 * talking to the bot. Used for local testing and E2E tests without a real WhatsApp number.
 */
const Body = z.object({
  from: z.string(),
  type: z.enum(["text", "image", "video", "audio", "document", "location", "contact"]).default("text"),
  text: z.string().optional(),
  pushName: z.string().optional(),
  media: z.object({ base64: z.string(), mime: z.string(), filename: z.string().optional() }).optional(),
  location: z.object({ lat: z.number(), lng: z.number() }).optional(),
  contact: z.object({ name: z.string(), phone: z.string() }).optional(),
});

async function allowed(req: Request) {
  if (!devTools) return false;
  return (await isAdmin()) || req.headers.get("x-dev-key") === process.env.CRON_SECRET;
}

export async function POST(req: Request) {
  if (!(await allowed(req))) return bad("disabled", 404);
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return bad("invalid");
  const from = normalizePhone(p.data.from);
  if (!from) return bad("bad phone");
  const started = new Date();
  await handleInbound({ ...p.data, from, media: p.data.media ? { data: Buffer.from(p.data.media.base64, "base64"), mime: p.data.media.mime, filename: p.data.media.filename } : undefined });
  await runDueJobs(10);
  const replies = await db.select().from(waMessages).where(and(eq(waMessages.phone, from), eq(waMessages.direction, "out"), gt(waMessages.createdAt, started))).orderBy(asc(waMessages.createdAt));
  return json({ ok: true, replies: replies.map((r) => r.text) });
}

export async function GET(req: Request) {
  if (!(await allowed(req))) return bad("disabled", 404);
  const phone = normalizePhone(new URL(req.url).searchParams.get("phone"));
  if (!phone) return json({ messages: [] });
  const rows = await db.select().from(waMessages).where(eq(waMessages.phone, phone)).orderBy(asc(waMessages.createdAt)).limit(300);
  return json({ messages: rows.map((r) => ({ id: r.id, direction: r.direction, type: r.type, text: r.text, at: r.createdAt })) });
}
