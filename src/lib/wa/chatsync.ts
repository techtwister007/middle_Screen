import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/config/env";
import type { InboundMessage, WhatsAppProvider } from "./types";

/**
 * Chatsync adapter (production WhatsApp Business API).
 * Implemented against the Meta WhatsApp Cloud API format, which most Indian BSPs (incl. Chatsync-style
 * providers) proxy 1:1. If Chatsync's endpoints/headers differ, only this file needs changing:
 *   - send:    POST {CHATSYNC_API_URL}/{CHATSYNC_PHONE_ID}/messages
 *   - media:   GET  {CHATSYNC_API_URL}/{mediaId} → { url } → GET url
 *   - webhook: Meta "whatsapp_business_account" payload → parseChatsyncWebhook()
 */
export function chatsyncProvider(): WhatsAppProvider {
  const base = (env.CHATSYNC_API_URL ?? "").replace(/\/$/, "");
  const headers = { Authorization: `Bearer ${env.CHATSYNC_API_KEY}`, "Content-Type": "application/json" };
  return {
    name: "chatsync",
    async sendText(to, text) {
      const res = await fetch(`${base}/${env.CHATSYNC_PHONE_ID}/messages`, {
        method: "POST",
        headers,
        body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to, type: "text", text: { body: text, preview_url: true } }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`Chatsync send ${res.status}: ${(await res.text()).slice(0, 300)}`);
      const data = (await res.json()) as { messages?: { id: string }[] };
      return { status: "sent", providerId: data.messages?.[0]?.id };
    },
    async fetchMedia(mediaId) {
      const meta = await fetch(`${base}/${mediaId}`, { headers, signal: AbortSignal.timeout(15000) });
      if (!meta.ok) throw new Error(`Chatsync media meta ${meta.status}`);
      const { url, mime_type } = (await meta.json()) as { url: string; mime_type: string };
      const file = await fetch(url, { headers: { Authorization: headers.Authorization }, signal: AbortSignal.timeout(60000) });
      if (!file.ok) throw new Error(`Chatsync media ${file.status}`);
      return { data: Buffer.from(await file.arrayBuffer()), mime: mime_type };
    },
  };
}

export function verifyChatsyncSignature(raw: string, header: string | null): boolean {
  if (!env.CHATSYNC_APP_SECRET) return true; // not configured → accept (configure in production)
  if (!header) return false;
  const expected = "sha256=" + createHmac("sha256", env.CHATSYNC_APP_SECRET).update(raw).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(header);
  return a.length === b.length && timingSafeEqual(a, b);
}

type MetaMsg = {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { id: string; mime_type: string; caption?: string };
  video?: { id: string; mime_type: string; caption?: string };
  audio?: { id: string; mime_type: string };
  document?: { id: string; mime_type: string; caption?: string; filename?: string };
  location?: { latitude: number; longitude: number; name?: string };
  contacts?: { name?: { formatted_name?: string }; phones?: { wa_id?: string; phone?: string }[] }[];
  button?: { text: string };
  interactive?: { button_reply?: { title: string }; list_reply?: { title: string } };
};

/** Convert a Meta-format webhook body into normalised messages. Media bytes are fetched later via mediaRef. */
export function parseChatsyncWebhook(body: unknown): (InboundMessage & { mediaRef?: string })[] {
  const out: (InboundMessage & { mediaRef?: string })[] = [];
  const entries = (body as { entry?: { changes?: { value?: { messages?: MetaMsg[]; contacts?: { profile?: { name?: string } }[] } }[] }[] })?.entry ?? [];
  for (const e of entries)
    for (const c of e.changes ?? []) {
      const pushName = c.value?.contacts?.[0]?.profile?.name;
      for (const m of c.value?.messages ?? []) {
        const base = { from: m.from, providerId: m.id, pushName, timestamp: Number(m.timestamp) * 1000 };
        const mediaOf = (x?: { id: string; mime_type: string; filename?: string }) => (x ? { mime: x.mime_type, filename: x.filename } : undefined);
        switch (m.type) {
          case "text":
            out.push({ ...base, type: "text", text: m.text?.body });
            break;
          case "button":
            out.push({ ...base, type: "text", text: m.button?.text });
            break;
          case "interactive":
            out.push({ ...base, type: "text", text: m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title });
            break;
          case "image":
          case "video":
          case "audio":
          case "document": {
            const x = m[m.type];
            out.push({ ...base, type: m.type, text: (x as { caption?: string })?.caption, media: mediaOf(x), mediaRef: x?.id });
            break;
          }
          case "location":
            out.push({ ...base, type: "location", location: { lat: m.location!.latitude, lng: m.location!.longitude, name: m.location?.name } });
            break;
          case "contacts": {
            const ct = m.contacts?.[0];
            out.push({ ...base, type: "contact", contact: { name: ct?.name?.formatted_name ?? "", phone: ct?.phones?.[0]?.wa_id ?? ct?.phones?.[0]?.phone ?? "" } });
            break;
          }
          default:
            out.push({ ...base, type: "other" });
        }
      }
    }
  return out;
}
