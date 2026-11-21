import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { waMessages } from "@/db/schema";
import { bridgeAuthorized } from "@/lib/bridge-auth";
import { bad, json } from "@/lib/http";

export async function POST(req: Request) {
  if (!bridgeAuthorized(req)) return bad("unauthorized", 401);
  const b = z.object({ id: z.string(), ok: z.boolean(), providerId: z.string().optional(), error: z.string().optional() }).safeParse(await req.json().catch(() => null));
  if (!b.success) return bad("invalid");
  await db.update(waMessages).set({ status: b.data.ok ? "sent" : "failed", providerId: b.data.providerId, error: b.data.error?.slice(0, 500) }).where(eq(waMessages.id, b.data.id));
  return json({ ok: true });
}
