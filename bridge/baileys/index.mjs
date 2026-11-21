/**
 * Baileys bridge — TESTING ONLY.
 *
 * Runs on your laptop, logs into a SPARE WhatsApp number via WhatsApp Web (scan the QR once),
 * forwards every incoming message to the app (/api/wa/bridge/inbound) and delivers the app's
 * replies (polled from /api/wa/bridge/outbox). The app must run with WA_PROVIDER=baileys.
 *
 * ⚠️  Unofficial API: WhatsApp may ban numbers used this way. Never use your main number.
 *
 *   cd bridge/baileys && npm install && cp .env.example .env && npm start
 */
import { readFileSync, existsSync } from "node:fs";
import makeWASocket, { useMultiFileAuthState, DisconnectReason, downloadMediaMessage, fetchLatestBaileysVersion } from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import pino from "pino";

// Minimal .env loader (no extra dependency)
if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const APP_URL = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
const SECRET = process.env.BRIDGE_SECRET ?? "dev-bridge";
const headers = { "Content-Type": "application/json", Authorization: `Bearer ${SECRET}` };
const logger = pino({ level: "warn" });

let sock;
let polling = false;

const digits = (jid) => (jid ?? "").split("@")[0].split(":")[0];

function unwrap(message) {
  // Handle ephemeral / view-once / edited wrappers
  let m = message ?? {};
  for (const k of ["ephemeralMessage", "viewOnceMessage", "viewOnceMessageV2", "documentWithCaptionMessage", "editedMessage"]) {
    if (m[k]?.message) m = m[k].message;
  }
  return m;
}

function vcardPhone(vcard = "") {
  const wa = vcard.match(/waid=(\d+)/);
  if (wa) return wa[1];
  const tel = vcard.match(/TEL[^:]*:([+\d\s-]+)/);
  return tel ? tel[1].replace(/\D/g, "") : "";
}

async function toPayload(msg) {
  const m = unwrap(msg.message);
  const from = digits(msg.key.remoteJid);
  const base = { from, providerId: msg.key.id, pushName: msg.pushName ?? undefined };
  const text = m.conversation ?? m.extendedTextMessage?.text ?? m.buttonsResponseMessage?.selectedDisplayText ?? m.listResponseMessage?.title;
  if (text) return { ...base, type: "text", text };
  const media = async (type, node) => {
    const buf = await downloadMediaMessage(msg, "buffer", {}, { logger, reuploadRequest: sock.updateMediaMessage });
    return { ...base, type, text: node.caption ?? undefined, media: { base64: Buffer.from(buf).toString("base64"), mime: node.mimetype ?? "application/octet-stream", filename: node.fileName ?? undefined } };
  };
  if (m.imageMessage) return media("image", m.imageMessage);
  if (m.videoMessage) return media("video", m.videoMessage);
  if (m.audioMessage) return media("audio", m.audioMessage);
  if (m.documentMessage) return media("document", m.documentMessage);
  if (m.locationMessage) return { ...base, type: "location", location: { lat: m.locationMessage.degreesLatitude, lng: m.locationMessage.degreesLongitude, name: m.locationMessage.name ?? undefined } };
  if (m.contactMessage) return { ...base, type: "contact", contact: { name: m.contactMessage.displayName ?? "", phone: vcardPhone(m.contactMessage.vcard) } };
  return { ...base, type: "other" };
}

async function forward(payload) {
  const res = await fetch(`${APP_URL}/api/wa/bridge/inbound`, { method: "POST", headers, body: JSON.stringify(payload) });
  if (!res.ok) console.error("✖ inbound rejected", res.status, await res.text());
}

async function pollOutbox() {
  if (polling || !sock?.user) return;
  polling = true;
  try {
    const res = await fetch(`${APP_URL}/api/wa/bridge/outbox`, { headers });
    if (!res.ok) throw new Error(`outbox ${res.status}`);
    const { messages } = await res.json();
    for (const out of messages) {
      try {
        const sent = await sock.sendMessage(`${out.to}@s.whatsapp.net`, { text: out.text ?? "" });
        await fetch(`${APP_URL}/api/wa/bridge/ack`, { method: "POST", headers, body: JSON.stringify({ id: out.id, ok: true, providerId: sent?.key?.id }) });
        console.log(`→ ${out.to}: ${(out.text ?? "").slice(0, 60).replace(/\n/g, " ")}…`);
        await new Promise((r) => setTimeout(r, 400)); // gentle pacing
      } catch (e) {
        await fetch(`${APP_URL}/api/wa/bridge/ack`, { method: "POST", headers, body: JSON.stringify({ id: out.id, ok: false, error: String(e) }) });
      }
    }
  } catch (e) {
    console.error("✖ outbox poll failed:", e.message);
  } finally {
    polling = false;
  }
}

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState("auth");
  const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: undefined }));
  sock = makeWASocket({ auth: state, logger, version, markOnlineOnConnect: false, syncFullHistory: false });
  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log("\nScan this QR with the SPARE WhatsApp number (WhatsApp → Linked devices → Link a device):\n");
      qrcode.generate(qr, { small: true });
    }
    if (connection === "open") console.log(`✔ Connected as ${digits(sock.user?.id)} — forwarding to ${APP_URL}`);
    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        console.error("✖ Logged out. Delete the ./auth folder and restart to scan again.");
        process.exit(1);
      }
      console.log("… reconnecting");
      setTimeout(start, 2000);
    }
  });
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const msg of messages) {
      const jid = msg.key.remoteJid ?? "";
      if (msg.key.fromMe || !jid.endsWith("@s.whatsapp.net")) continue; // ignore own, groups, status, LID-only
      try {
        const payload = await toPayload(msg);
        console.log(`← ${payload.from} [${payload.type}] ${(payload.text ?? "").slice(0, 50)}`);
        await forward(payload);
        await pollOutbox(); // reply fast
      } catch (e) {
        console.error("✖ failed to forward", e);
      }
    }
  });
}

setInterval(pollOutbox, 2000);
start();
