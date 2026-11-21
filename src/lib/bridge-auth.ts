import "server-only";
import { timingSafeEqual } from "node:crypto";
import { env } from "@/config/env";

export function bridgeAuthorized(req: Request) {
  const h = req.headers.get("authorization") ?? "";
  const token = h.replace(/^Bearer\s+/i, "");
  const a = Buffer.from(token);
  const b = Buffer.from(env.BRIDGE_SECRET);
  return a.length === b.length && timingSafeEqual(a, b);
}
