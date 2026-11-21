import { after } from "next/server";
import { env } from "@/config/env";
import { json } from "@/lib/http";
import { chatsyncProvider, parseChatsyncWebhook, verifyChatsyncSignature } from "@/lib/wa/chatsync";
import { handleInbound } from "@/modules/bot";
import { runDueJobs } from "@/modules/jobs";

/** Webhook verification handshake (Meta-style hub.challenge). */
export async function GET(req: Request) {
  const u = new URL(req.url);
  if (u.searchParams.get("hub.mode") === "subscribe" && u.searchParams.get("hub.verify_token") === env.CHATSYNC_VERIFY_TOKEN) {
    return new Response(u.searchParams.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("forbidden", { status: 403 });
}

/** Inbound messages from Chatsync. Respond 200 immediately, process after. */
export async function POST(req: Request) {
  if (env.WA_PROVIDER !== "chatsync") return json({ ok: false, error: "provider not chatsync" }, 409);
  const raw = await req.text();
  if (!verifyChatsyncSignature(raw, req.headers.get("x-hub-signature-256"))) return new Response("bad signature", { status: 401 });
  const msgs = parseChatsyncWebhook(JSON.parse(raw || "{}"));
  const provider = chatsyncProvider();
  after(async () => {
    for (const m of msgs) {
      try {
        await handleInbound(m, provider.fetchMedia);
      } catch (e) {
        console.error("[chatsync] handle failed", e);
      }
    }
    await runDueJobs(5);
  });
  return json({ ok: true });
}
