/** Provider-neutral WhatsApp message shapes. Every provider adapter converts to/from these. */
export type InboundType = "text" | "image" | "video" | "audio" | "document" | "location" | "contact" | "other";

export type InboundMessage = {
  from: string; // digits with country code
  providerId?: string;
  type: InboundType;
  text?: string; // text body or media caption
  pushName?: string;
  media?: { data?: Buffer; url?: string; mime: string; filename?: string };
  location?: { lat: number; lng: number; name?: string };
  contact?: { name: string; phone: string };
  timestamp?: number;
};

export interface WhatsAppProvider {
  readonly name: "console" | "baileys" | "chatsync";
  /** Send a text message. Returns a provider id when the message was handed off synchronously. */
  sendText(to: string, text: string): Promise<{ status: "sent" | "queued"; providerId?: string }>;
  /** Download inbound media given a provider reference (if the adapter did not include bytes). */
  fetchMedia?(ref: string): Promise<{ data: Buffer; mime: string }>;
}
