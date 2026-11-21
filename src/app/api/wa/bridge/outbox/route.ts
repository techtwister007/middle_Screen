import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { waMessages } from "@/db/schema";
import { bridgeAuthorized } from "@/lib/bridge-auth";
import { bad, json } from "@/lib/http";

/** Baileys bridge polls queued outbound messages. */
export async function GET(req: Request) {
  if (!bridgeAuthorized(req)) return bad("unauthorized", 401);
  const rows = await db.select({ id: waMessages.id, to: waMessages.phone, text: waMessages.text }).from(waMessages).where(and(eq(waMessages.direction, "out"), eq(waMessages.status, "queued"))).orderBy(asc(waMessages.createdAt)).limit(20);
  return json({ ok: true, messages: rows });
}
