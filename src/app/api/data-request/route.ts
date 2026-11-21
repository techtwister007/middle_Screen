import { z } from "zod";
import { db } from "@/db";
import { dataRequests } from "@/db/schema";
import { id } from "@/lib/ids";
import { normalizePhone } from "@/lib/phone";
import { bad, json } from "@/lib/http";

/** DPDP: buyers can request deletion/export of their data. Handled by admin. */
export async function POST(req: Request) {
  const b = z.object({ phone: z.string().max(20), kind: z.enum(["delete", "export"]), details: z.string().max(1000).optional() }).safeParse(await req.json().catch(() => null));
  if (!b.success) return bad("invalid");
  const phone = normalizePhone(b.data.phone);
  if (!phone) return bad("Enter a valid mobile number");
  await db.insert(dataRequests).values({ id: id(), phone, kind: b.data.kind, details: b.data.details });
  return json({ ok: true });
}
