import { bridgeAuthorized } from "@/lib/bridge-auth";
import { bad, json } from "@/lib/http";
import { claimOutbox } from "@/lib/wa/outbox";

/** Baileys bridge polls for outbound messages (claimed atomically — never sent twice). */
export async function GET(req: Request) {
  if (!bridgeAuthorized(req)) return bad("unauthorized", 401);
  return json({ ok: true, messages: await claimOutbox(20) });
}
