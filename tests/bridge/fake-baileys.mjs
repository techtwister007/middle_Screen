// Fake @whiskeysockets/baileys for testing the bridge without WhatsApp.
// Control server on :7777 — POST /inject {from,text} emits an incoming message; GET /sent lists sends.
import http from "node:http";
import { EventEmitter } from "node:events";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";

const sent = [];
const read = [];
const presence = [];
let current;
let n = 0;

http
  .createServer(async (req, res) => {
    if (req.method === "POST" && req.url === "/inject") {
      let b = "";
      for await (const c of req) b += c;
      const { from, text, ageHours = 0 } = JSON.parse(b);
      current.ev.emit("messages.upsert", {
        type: "notify",
        messages: [{ key: { remoteJid: `${from}@s.whatsapp.net`, id: `IN${++n}`, fromMe: false }, messageTimestamp: Math.floor((Date.now() - ageHours * 3600000) / 1000), pushName: "Tester", message: { conversation: text } }],
      });
      res.end("ok");
    } else if (req.url === "/sent") res.end(JSON.stringify({ sent, read, presence }));
    else if (req.url === "/drop") { current.ev.emit("connection.update", { connection: "close", lastDisconnect: { error: { output: { statusCode: 428 } } } }); res.end("ok"); }
    else res.end("?");
  })
  .listen(Number(process.env.FAKE_WA_PORT ?? 7777));

export const DisconnectReason = { loggedOut: 401, connectionReplaced: 440, restartRequired: 515 };
export const Browsers = { windows: (b) => ["Windows", b, "10"] };
export async function fetchLatestBaileysVersion() { return { version: [2, 3000, 1] }; }
export async function downloadMediaMessage() { return Buffer.from(""); }
export async function useMultiFileAuthState(dir) {
  mkdirSync(dir, { recursive: true });
  const f = `${dir}/creds.json`;
  const fresh = !existsSync(f);
  return { state: { fresh }, saveCreds: async () => writeFileSync(f, JSON.stringify({ saved: Date.now() })) };
}
export default function makeWASocket({ auth }) {
  const ev = new EventEmitter();
  const sock = {
    ev,
    user: { id: "919999900000:1@s.whatsapp.net" },
    async sendMessage(jid, content) { sent.push({ to: jid.split("@")[0], text: content.text, at: Date.now() }); return { key: { id: `OUT${sent.length}` }, message: content }; },
    async readMessages(keys) { read.push(...keys.map((k) => k.id)); },
    async sendPresenceUpdate(type, jid) { presence.push(type); },
    updateMediaMessage: async () => {},
  };
  current = sock;
  setTimeout(() => {
    if (auth.fresh) ev.emit("connection.update", { qr: "FAKE-QR" });
    ev.emit("creds.update");
    ev.emit("connection.update", { connection: "open" });
  }, 200);
  return sock;
}
