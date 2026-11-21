import "server-only";
import { env } from "@/config/env";
import { db } from "@/db";
import { waMessages } from "@/db/schema";
import { id } from "@/lib/ids";
import { chatsyncProvider } from "./chatsync";
import type { WhatsAppProvider } from "./types";

/** console: messages only appear in the admin WhatsApp simulator. */
const consoleProvider: WhatsAppProvider = {
  name: "console",
  async sendText() {
    return { status: "sent" };
  },
};

/** baileys: messages are queued in wa_messages; the laptop bridge polls and delivers them. */
const baileysProvider: WhatsAppProvider = {
  name: "baileys",
  async sendText() {
    return { status: "queued" };
  },
};

export function waProvider(): WhatsAppProvider {
  if (env.WA_PROVIDER === "chatsync") return chatsyncProvider();
  if (env.WA_PROVIDER === "baileys") return baileysProvider;
  return consoleProvider;
}

/** Send a WhatsApp text and log it. Never throws: failures are logged on the message row. */
export async function sendWhatsApp(to: string, text: string, agentId?: string | null) {
  const provider = waProvider();
  const rowId = id();
  try {
    const r = await provider.sendText(to, text);
    await db.insert(waMessages).values({ id: rowId, direction: "out", phone: to, agentId, type: "text", text, status: r.status, providerId: r.providerId });
  } catch (e) {
    await db.insert(waMessages).values({ id: rowId, direction: "out", phone: to, agentId, type: "text", text, status: "failed", error: String(e).slice(0, 500) });
    console.error("[wa] send failed", e);
  }
}

export const botNumber = () => env.WA_NUMBER;
export type { InboundMessage } from "./types";
