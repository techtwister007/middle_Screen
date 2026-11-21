import { NextResponse } from "next/server";
import { appUrl } from "@/config/env";
import { consumeLoginToken, startAgentSession } from "@/lib/auth/session";

/** Magic link from WhatsApp: /app/auth?t=TOKEN&next=/app/... */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const t = u.searchParams.get("t") ?? "";
  const nextRaw = u.searchParams.get("next") ?? "/app";
  const next = nextRaw.startsWith("/app") ? nextRaw : "/app";
  const agentId = t ? await consumeLoginToken(t) : null;
  if (!agentId) {
    // Already logged in on this device? Then the expired link still lands nicely.
    return NextResponse.redirect(`${appUrl}/app/login?expired=1&next=${encodeURIComponent(next)}`);
  }
  await startAgentSession(agentId);
  return NextResponse.redirect(`${appUrl}${next}`);
}
