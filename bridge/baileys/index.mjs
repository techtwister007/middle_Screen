/**
 * Baileys bridge — connects a WhatsApp number (via WhatsApp Web "linked device") to the app.
 *
 *  ✔ Login saved      : session in ./auth, reused on every start; daily backup in ./auth-backup
 *  ✔ Self-healing     : reconnects with back-off; restarts on crash via pm2 (see README)
 *  ✔ One instance     : lock file — two bridges on one number is a classic ban trigger
 *  ✔ Human-like       : marks messages read, shows "typing…", paces replies
 *  ✔ Ban-safe limits  : per-minute / hour / day caps; never messages a number that hasn't
 *                       written in the last 24 h (same rule as the official API)
 *  ✔ Efficient        : replies come back in the same HTTP call; adaptive polling (3 s busy, 20 s idle)
 *
 * The app must run with WA_PROVIDER=baileys and the same BRIDGE_SECRET.
 * ⚠️  Unofficial API. Use a dedicated number (WhatsApp Business app), never your personal one.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, cpSync, renameSync } from "node:fs";
import path from "node:path";
import makeWASocket, { useMultiFileAuthState, DisconnectReason, downloadMediaMessage, fetchLatestBaileysVersion, Browsers } from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import pino from "pino";

/* ------------------------------------------------------------------ config */
if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
    // KEY=value   # optional inline comment (same rules as the app's .env)
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*("[^"]*"|'[^']*'|[^#]*?)\s*(?:#.*)?$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const cfg = {
  appUrl: (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  secret: process.env.BRIDGE_SECRET ?? "dev-bridge",
  authDir: process.env.AUTH_DIR ?? "auth",
  perMinute: Number(process.env.MAX_PER_MINUTE ?? 12),
  perHour: Number(process.env.MAX_PER_HOUR ?? 150),
  perDay: Number(process.env.MAX_PER_DAY ?? 600),
  replyWindowH: Number(process.env.REPLY_WINDOW_HOURS ?? 24),
  ignoreOlderThanH: Number(process.env.IGNORE_OLDER_THAN_HOURS ?? 12),
};
const headers = { "Content-Type": "application/json", Authorization: `Bearer ${cfg.secret}` };
const logger = pino({ level: process.env.LOG_LEVEL ?? "warn" });
const log = (...a) => console.log(new Date().toLocaleTimeString("en-IN"), ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jitter = (ms) => Math.round(ms * (0.75 + Math.random() * 0.5));
const digits = (jid) => (jid ?? "").split("@")[0].split(":")[0];

/* ------------------------------------------------------- single instance */
const LOCK = path.join(cfg.authDir, ".bridge.lock");
mkdirSync(cfg.authDir, { recursive: true });
if (existsSync(LOCK)) {
  const pid = Number(readFileSync(LOCK, "utf8"));
  let alive = false;
  try {
    process.kill(pid, 0);
    alive = pid !== process.pid;
  } catch {}
  if (alive) {
    console.error(`✖ Another bridge (pid ${pid}) is already running on this session. Stop it first — two connections on one number can get it banned.`);
    process.exit(1);
  }
}
writeFileSync(LOCK, String(process.pid));

/* ------------------------------------------------- persistent small state */
// lastInbound: number → ms timestamp of their last message (24h reply window)
const STATE = path.join(cfg.authDir, "bridge-state.json");
const state = existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : { lastInbound: {}, lastBackup: 0 };
let stateDirty = false;
function saveState() {
  if (!stateDirty) return;
  const cutoff = Date.now() - 7 * 86400000;
  for (const [k, v] of Object.entries(state.lastInbound)) if (v < cutoff) delete state.lastInbound[k];
  writeFileSync(STATE + ".tmp", JSON.stringify(state));
  renameSync(STATE + ".tmp", STATE); // atomic
  stateDirty = false;
}
setInterval(saveState, 30_000);

/** Copy the session to ./auth-backup at most every 12 h (restore = rename folder back). */
function backupAuth() {
  if (Date.now() - (state.lastBackup ?? 0) < 12 * 3600000) return;
  try {
    rmSync("auth-backup", { recursive: true, force: true });
    cpSync(cfg.authDir, "auth-backup", { recursive: true, filter: (src) => !src.endsWith(".lock") });
    state.lastBackup = Date.now();
    stateDirty = true;
    log("💾 Session backed up to ./auth-backup");
  } catch (e) {
    log("⚠️ backup failed:", e.message);
  }
}

/* ------------------------------------------------------------ rate limits */
const sentAt = []; // timestamps of sends in the last 24 h
const lastSentTo = new Map(); // number → ms
function waitForSlot() {
  const now = Date.now();
  while (sentAt.length && sentAt[0] < now - 86400000) sentAt.shift();
  const inLast = (ms) => sentAt.filter((t) => t > now - ms).length;
  if (inLast(86400000) >= cfg.perDay) return 60 * 60000;
  if (inLast(3600000) >= cfg.perHour) return 5 * 60000;
  if (inLast(60000) >= cfg.perMinute) return 10000;
  return 0;
}

/* ----------------------------------------------------- message retry store */
// WhatsApp sometimes asks the sender to re-send a message (decryption retry). Keep recent ones.
const recentSent = new Map();
function remember(key, message) {
  recentSent.set(key.id, message);
  if (recentSent.size > 500) recentSent.delete(recentSent.keys().next().value);
}

/* ------------------------------------------------------------- socket */
let sock = null;
let connected = false;
let attempts = 0;
let lastActivity = 0;
const sendQueue = [];
let sending = false;

function unwrap(message) {
  let m = message ?? {};
  for (const k of ["ephemeralMessage", "viewOnceMessage", "viewOnceMessageV2", "documentWithCaptionMessage", "editedMessage"]) if (m[k]?.message) m = m[k].message;
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
  const base = { from: digits(msg.key.remoteJid), providerId: msg.key.id, pushName: msg.pushName ?? undefined };
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
  return null; // reactions, protocol messages, stickers… ignored silently
}

async function api(pathname, init = {}) {
  const res = await fetch(`${cfg.appUrl}${pathname}`, { ...init, headers, signal: AbortSignal.timeout(120_000) });
  if (!res.ok) throw new Error(`${pathname} → ${res.status} ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

function enqueue(messages = []) {
  for (const m of messages) if (!sendQueue.some((q) => q.id === m.id)) sendQueue.push(m);
  drain();
}

async function ack(id, ok, extra = {}) {
  await api("/api/wa/bridge/ack", { method: "POST", body: JSON.stringify({ id, ok, ...extra }) }).catch((e) => log("⚠️ ack failed:", e.message));
}

/** Serial sender: window check → rate limit → typing → send → ack. */
async function drain() {
  if (sending) return;
  sending = true;
  try {
    while (sendQueue.length && connected) {
      const out = sendQueue[0];
      const last = state.lastInbound[out.to] ?? 0;
      if (Date.now() - last > cfg.replyWindowH * 3600000) {
        sendQueue.shift();
        log(`⛔ Not sending to ${out.to}: they haven't messaged in ${cfg.replyWindowH} h (protects the number)`);
        await ack(out.id, false, { error: "outside reply window — not sent" });
        continue;
      }
      const wait = waitForSlot();
      if (wait) {
        log(`⏳ Rate limit reached — pausing ${Math.round(wait / 1000)} s`);
        await sleep(wait);
        continue;
      }
      const gap = Date.now() - (lastSentTo.get(out.to) ?? 0);
      if (gap < 1500) await sleep(1500 - gap);
      const jid = `${out.to}@s.whatsapp.net`;
      const text = out.text ?? "";
      try {
        await sock.sendPresenceUpdate("composing", jid).catch(() => {});
        await sleep(jitter(Math.min(4000, Math.max(900, 500 + text.length * 12))));
        await sock.sendPresenceUpdate("paused", jid).catch(() => {});
        const sent = await sock.sendMessage(jid, { text });
        if (sent?.key) remember(sent.key, sent.message);
        sentAt.push(Date.now());
        lastSentTo.set(out.to, Date.now());
        sendQueue.shift();
        await ack(out.id, true, { providerId: sent?.key?.id });
        log(`→ ${out.to}: ${text.slice(0, 60).replace(/\n/g, " ")}${text.length > 60 ? "…" : ""}`);
      } catch (e) {
        if (!connected) break; // retry after reconnect (message stays queued here)
        sendQueue.shift();
        await ack(out.id, false, { error: String(e.message ?? e) });
        log("✖ send failed:", e.message);
      }
    }
  } finally {
    sending = false;
  }
}

/** Adaptive polling for messages created outside a request (scheduled jobs, reminders). */
async function poll() {
  if (connected) {
    try {
      const { messages } = await api("/api/wa/bridge/outbox");
      enqueue(messages);
    } catch (e) {
      log("⚠️ poll failed:", e.message);
    }
  }
  const busy = Date.now() - lastActivity < 2 * 60000;
  setTimeout(poll, busy ? 3000 : 20000);
}

async function handle(msg) {
  const jid = msg.key.remoteJid ?? "";
  if (msg.key.fromMe || !jid.endsWith("@s.whatsapp.net")) return; // own, groups, status, channels
  const ts = Number(msg.messageTimestamp ?? 0) * 1000;
  if (ts && Date.now() - ts > cfg.ignoreOlderThanH * 3600000) return; // stale backlog after long downtime
  const from = digits(jid);
  state.lastInbound[from] = Math.max(state.lastInbound[from] ?? 0, ts || Date.now());
  stateDirty = true;
  lastActivity = Date.now();
  const payload = await toPayload(msg);
  if (!payload) return;
  setTimeout(() => sock?.readMessages([msg.key]).catch(() => {}), jitter(1200)); // blue ticks like a person
  log(`← ${from} [${payload.type}] ${(payload.text ?? "").slice(0, 50)}`);
  const res = await api("/api/wa/bridge/inbound", { method: "POST", body: JSON.stringify(payload) });
  enqueue(res.messages);
}

async function start() {
  const { state: auth, saveCreds } = await useMultiFileAuthState(cfg.authDir);
  const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: undefined }));
  sock = makeWASocket({
    auth,
    version,
    logger,
    browser: Browsers.windows("Chrome"),
    markOnlineOnConnect: false,
    syncFullHistory: false,
    shouldSyncHistoryMessage: () => false,
    generateHighQualityLinkPreview: false,
    getMessage: async (key) => recentSent.get(key.id),
  });
  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log("\nScan with the bot's WhatsApp (Settings → Linked devices → Link a device):\n");
      qrcode.generate(qr, { small: true });
    }
    if (connection === "open") {
      connected = true;
      attempts = 0;
      log(`✔ Connected as ${digits(sock.user?.id)} → ${cfg.appUrl}  (limits ${cfg.perMinute}/min ${cfg.perHour}/h ${cfg.perDay}/day)`);
      backupAuth();
      drain();
    }
    if (connection === "close") {
      connected = false;
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        console.error("✖ WhatsApp logged this device out. Delete the ./auth folder and run again to scan a new QR.\n  (If this was a crash, you can restore ./auth-backup → ./auth.)");
        return shutdown(1);
      }
      if (code === DisconnectReason.connectionReplaced) {
        console.error("✖ Session opened somewhere else (another bridge?). Stopping so the two don't fight — that can get the number banned.");
        return shutdown(1);
      }
      if (code === DisconnectReason.restartRequired) return start();
      attempts++;
      const delay = Math.min(60_000, 2000 * 2 ** Math.min(attempts, 5));
      log(`… disconnected (${code ?? "network"}). Reconnecting in ${Math.round(delay / 1000)} s`);
      setTimeout(start, jitter(delay));
    }
  });
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const msg of messages) {
      try {
        await handle(msg);
      } catch (e) {
        log("✖ failed to forward:", e.message);
      }
    }
  });
}

function shutdown(code = 0) {
  saveState();
  try {
    rmSync(LOCK, { force: true });
  } catch {}
  process.exit(code);
}
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
process.on("uncaughtException", (e) => log("✖ uncaught:", e.message)); // stay alive; pm2 restarts on hard crash
process.on("unhandledRejection", (e) => log("✖ unhandled:", e?.message ?? e));
setInterval(() => log(`ℹ️ sent today: ${sentAt.filter((t) => t > Date.now() - 86400000).length}/${cfg.perDay}, queue: ${sendQueue.length}`), 3600000);

start();
setTimeout(poll, 3000);
