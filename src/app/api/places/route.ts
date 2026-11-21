import { z } from "zod";
import { bad, json } from "@/lib/http";
import { searchPlaces } from "@/modules/nearby";
import { getShare } from "@/modules/shares";

/** Buyer place search for "How far is your place?". Biased to the shared property's area; no login needed. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const q = z.string().trim().min(2).max(80).safeParse(u.searchParams.get("q"));
  if (!q.success) return json({ ok: true, places: [] });
  const code = u.searchParams.get("code");
  if (!code || !(await getShare(code))) return bad("not found", 404);
  const lat = Number(u.searchParams.get("lat")), lng = Number(u.searchParams.get("lng"));
  const near = Number.isFinite(lat) && Number.isFinite(lng) && lat && lng ? { lat, lng } : undefined;
  const places = await searchPlaces(q.data, near);
  return json({ ok: true, places });
}
