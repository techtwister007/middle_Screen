import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isProd } from "@/config/env";
import { id } from "@/lib/ids";
import { BUYER_COOKIE } from "@/modules/buyer-page";

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
export const bad = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

/** Get or create the anonymous buyer cookie (1 year). */
export async function buyerSid(): Promise<string> {
  const jar = await cookies();
  let sid = jar.get(BUYER_COOKIE)?.value;
  if (!sid || !/^[a-z0-9]{16,32}$/.test(sid)) {
    sid = id() + id().slice(0, 8);
    jar.set(BUYER_COOKIE, sid, { httpOnly: true, sameSite: "lax", secure: isProd, path: "/", maxAge: 365 * 86400 });
  }
  return sid;
}

export function deviceOf(ua: string | null) {
  if (!ua) return "unknown";
  if (/bot|crawl|spider|preview|facebookexternalhit|whatsapp/i.test(ua)) return "bot";
  return /mobile|android|iphone|ipad/i.test(ua) ? "mobile" : "desktop";
}
