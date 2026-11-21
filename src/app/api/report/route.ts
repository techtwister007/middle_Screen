import { z } from "zod";
import { db } from "@/db";
import { reports } from "@/db/schema";
import { id } from "@/lib/ids";
import { bad, json } from "@/lib/http";

export async function POST(req: Request) {
  const b = z.object({ listingId: z.string().max(40), reason: z.string().max(40), details: z.string().max(1000).optional() }).safeParse(await req.json().catch(() => null));
  if (!b.success) return bad("invalid");
  const l = await db.query.listings.findFirst({ where: (l, { eq }) => eq(l.id, b.data.listingId), columns: { id: true } });
  if (!l) return bad("not found", 404);
  await db.insert(reports).values({ id: id(), listingId: l.id, reason: b.data.reason, details: b.data.details });
  return json({ ok: true });
}
