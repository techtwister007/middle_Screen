/**
 * One command to run the WHOLE product on your laptop for real end-to-end testing:
 *
 *   npm run local            → production build (fast) + public HTTPS tunnel + WhatsApp bridge
 *   npm run local -- --dev   → dev mode (hot reload, slower)
 *   npm run local -- --lan   → no tunnel; phone must be on the same Wi-Fi (no push notifications)
 *   npm run local -- --no-bridge
 *
 * Tunnel: Cloudflare quick tunnel (free, no account): https://<random>.trycloudflare.com → localhost:3000.
 * Install once on Windows:  winget install --id Cloudflare.cloudflared
 * The public URL changes every run — this script sets APP_URL for the app automatically.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import path from "node:path";

const args = new Set(process.argv.slice(2));
const PORT = Number(process.env.PORT ?? 3000);
const isWin = process.platform === "win32";
const npx = isWin ? "npx.cmd" : "npx";
const children = [];
const log = (...a) => console.log("▸", ...a);

function readEnv() {
  const env = {};
  if (existsSync(".env"))
    for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*([^#]*?)\s*(#.*)?$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  return env;
}
function run(cmd, argv, opts = {}) {
  const p = spawn(cmd, argv, { stdio: opts.pipe ? ["ignore", "pipe", "pipe"] : "inherit", shell: isWin, ...opts });
  children.push(p);
  return p;
}
function stopAll() {
  for (const c of children) try { c.kill("SIGINT"); } catch {}
  setTimeout(() => process.exit(0), 1500);
}
process.on("SIGINT", stopAll);
process.on("SIGTERM", stopAll);

function lanIp() {
  for (const list of Object.values(networkInterfaces())) for (const i of list ?? []) if (i.family === "IPv4" && !i.internal && /^(192\.168|10\.|172\.)/.test(i.address)) return i.address;
  return "localhost";
}

async function tunnel() {
  const which = spawnSync(isWin ? "where" : "which", ["cloudflared"], { encoding: "utf8" });
  if (which.status !== 0) {
    log("cloudflared not found → using LAN mode. For a public HTTPS link install it:  winget install --id Cloudflare.cloudflared");
    return null;
  }
  const p = run("cloudflared", ["tunnel", "--no-autoupdate", "--url", `http://localhost:${PORT}`], { pipe: true });
  return new Promise((resolve) => {
    const onData = (d) => {
      const m = String(d).match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (m) resolve(m[0]);
    };
    p.stdout.on("data", onData);
    p.stderr.on("data", onData);
    setTimeout(() => resolve(null), 30000);
  });
}

async function waitUp(url, ms = 180000) {
  const t = Date.now();
  while (Date.now() - t < ms) {
    try {
      const r = await fetch(url);
      if (r.status < 500) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

const env = readEnv();
if (!existsSync(".env")) {
  console.error("✖ No .env — run:  copy .env.example .env   (then edit it)");
  process.exit(1);
}

log("Applying database migrations…");
if (spawnSync(npx, ["tsx", "scripts/migrate.ts"], { stdio: "inherit", shell: isWin }).status !== 0) {
  console.error("✖ Database not reachable. Is PostgreSQL running and DATABASE_URL correct in .env?");
  process.exit(1);
}

const publicUrl = args.has("--lan") ? null : await tunnel();
const APP_URL = publicUrl ?? `http://${lanIp()}:${PORT}`;
const appEnv = { ...process.env, APP_URL, PORT: String(PORT) };

if (args.has("--dev")) {
  run(npx, ["next", "dev", "-H", "0.0.0.0", "-p", String(PORT)], { env: appEnv });
} else {
  log("Building production version (fast pages; ~1–2 min on first run)…");
  if (spawnSync(npx, ["next", "build"], { stdio: "inherit", shell: isWin, env: appEnv }).status !== 0) process.exit(1);
  run(npx, ["next", "start", "-H", "0.0.0.0", "-p", String(PORT)], { env: appEnv });
}

if (!(await waitUp(`http://localhost:${PORT}`))) {
  console.error("✖ App did not start");
  stopAll();
}

const wantBridge = !args.has("--no-bridge") && (env.WA_PROVIDER ?? "console") === "baileys";
if (wantBridge) {
  const dir = path.join("bridge", "baileys");
  if (!existsSync(path.join(dir, "node_modules"))) spawnSync(isWin ? "npm.cmd" : "npm", ["install"], { cwd: dir, stdio: "inherit", shell: isWin });
  // The bridge talks to the app locally — fastest, and independent of the tunnel.
  run(process.execPath, ["index.mjs"], { cwd: dir, env: { ...process.env, APP_URL: `http://localhost:${PORT}`, BRIDGE_SECRET: env.BRIDGE_SECRET ?? "dev-bridge" } });
}

console.log(`
──────────────────────────────────────────────────────────────
  ✅ PropPulse is running

  Public link (share/open on any phone): ${APP_URL}
  Agent dashboard: ${APP_URL}/app/login
  Admin:           ${APP_URL}/admin
  ${(env.WA_PROVIDER ?? "console") === "console" ? `WhatsApp simulator: ${APP_URL}/admin/whatsapp  (set WA_PROVIDER=baileys to use your real number)` : wantBridge ? "WhatsApp bridge: running (scan the QR above if asked)" : "WhatsApp: bridge not started (--no-bridge)"}
  ${publicUrl ? "Push alerts & 'Add to Home Screen' work (HTTPS)." : "LAN mode: phone must be on the same Wi-Fi. Push alerts need the tunnel (HTTPS)."}

  Press Ctrl+C to stop everything.
──────────────────────────────────────────────────────────────`);
