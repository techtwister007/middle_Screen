/**
 * Bridge integration test: real bridge code (bridge/baileys/index.mjs) + fake WhatsApp + real app.
 * Needs the app running with WA_PROVIDER=baileys BRIDGE_SECRET=dev-bridge on APP_URL (default :3000).
 *   node tests/bridge/run.mjs
 */
import { spawn } from "node:child_process";
import { mkdtempSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import postgres from "postgres";

import { readFileSync as rf } from "node:fs";
// Use the same secret the app uses (from .env), like a real setup.
const envFile = (() => { try { return rf(".env", "utf8"); } catch { return ""; } })();
const SECRET = process.env.BRIDGE_SECRET ?? envFile.match(/^BRIDGE_SECRET=\s*([^#\s]*)/m)?.[1] ?? "dev-bridge";
const APP = process.env.APP_URL ?? "http://localhost:3000";
const DB = process.env.DATABASE_URL ?? "postgres://pp:pp@localhost:5432/proppulse";
const sql = postgres(DB, { max: 1, onnotice: () => {} });
const auth = mkdtempSync(path.join(tmpdir(), "bridge-auth-"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (name, ok, extra = "") => {
  console.log(`${ok ? "✓" : "✘"} ${name}${extra ? ` — ${extra}` : ""}`);
  if (!ok) failures++;
};

function startBridge(env = {}, port = 7777) {
  const p = spawn(process.execPath, ["--import", path.resolve("tests/bridge/register.mjs"), "index.mjs"], {
    cwd: path.resolve("bridge/baileys"),
    env: { ...process.env, APP_URL: APP, BRIDGE_SECRET: SECRET, AUTH_DIR: auth, MAX_PER_MINUTE: "4", FAKE_WA_PORT: String(port), ...env },
  });
  let out = "";
  p.stdout.on("data", (d) => (out += d));
  p.stderr.on("data", (d) => (out += d));
  return { p, out: () => out };
}
const fake = (u, body, port = 7777) => fetch(`http://localhost:${port}${u}`, body ? { method: "POST", body: JSON.stringify(body) } : undefined).then((r) => (u === "/sent" ? r.json() : r.text()));
async function waitFor(fn, ms = 20000) {
  const t = Date.now();
  while (Date.now() - t < ms) {
    if (await fn()) return true;
    await sleep(300);
  }
  return false;
}

const A = `9198${String(Date.now()).slice(-8)}`; // fresh agent number
const b1 = startBridge();
try {
  check("bridge connects", await waitFor(() => b1.out().includes("Connected as")), b1.out().split("\n").find((l) => l.includes("Connected")));

  // 1. inbound → instant reply (returned in the same HTTP call) with typing + read receipt
  await fake("/inject", { from: A, text: "hi" });
  check("bot reply delivered", await waitFor(async () => (await fake("/sent")).sent.some((s) => s.to === A && /Welcome/.test(s.text))));
  const s1 = await fake("/sent");
  check("typing indicator shown", s1.presence.includes("composing") && s1.presence.includes("paused"));
  check("message marked read", await waitFor(async () => (await fake("/sent")).read.length > 0));
  const [row] = await sql`select status, claimed_at from wa_messages where phone = ${A} and direction = 'out' order by created_at desc limit 1`;
  check("app marked it sent (acked)", await waitFor(async () => (await sql`select status from wa_messages where phone = ${A} and direction = 'out'`).every((r) => r.status === "sent")), row?.status);

  // 2. no double sends
  const before = (await fake("/sent")).sent.filter((s) => s.to === A).length;
  await sleep(4000); // let a poll cycle happen
  check("no duplicate sends after polling", (await fake("/sent")).sent.filter((s) => s.to === A).length === before);

  // 3. 24h window: an app message queued to someone who never wrote → refused
  const cold = "919800099999";
  await sql`insert into wa_messages (id, direction, phone, type, text, status) values (${"cold" + Date.now()}, 'out', ${cold}, 'text', 'hello cold', 'queued')`;
  check("cold message refused (never messaged us)", await waitFor(async () => (await sql`select status, error from wa_messages where phone = ${cold} order by created_at desc limit 1`)[0]?.status === "failed", 30000));
  check("…and never sent", !(await fake("/sent")).sent.some((s) => s.to === cold));

  // 4. scheduled message (outside a request) arrives via polling
  await sql`insert into wa_messages (id, direction, phone, type, text, status) values (${"sched" + Date.now()}, 'out', ${A}, 'text', 'scheduled reminder', 'queued')`;
  check("scheduled message delivered by poll", await waitFor(async () => (await fake("/sent")).sent.some((s) => s.text === "scheduled reminder"), 30000));

  // 5. rate limit (4/min in this test): burst of 6 replies → max 4 in the first minute
  const B = `9197${String(Date.now()).slice(-8)}`;
  await fake("/inject", { from: B, text: "hi" });
  await sleep(500);
  for (const t of ["Ravi Kumar", "skip", "skip", "yes", "help"]) await fake("/inject", { from: B, text: t });
  await sleep(15000);
  const inMinute = (await fake("/sent")).sent.filter((s) => s.at > Date.now() - 60000).length;
  check("rate limit respected (≤4/min)", inMinute <= 4, `${inMinute} sent in last minute`);
  check("rate limit logged", b1.out().includes("Rate limit reached"));

  // 6. stale backlog ignored after downtime
  const C = `9196${String(Date.now()).slice(-8)}`;
  await fake("/inject", { from: C, text: "hi", ageHours: 20 });
  await sleep(2500);
  check("messages older than 12 h ignored", (await sql`select count(*)::int as n from wa_messages where phone = ${C}`)[0].n === 0);

  // 7. second instance on the same session refuses to start
  const b2 = startBridge({}, 7778);
  const code = await new Promise((r) => b2.p.on("exit", r));
  check("second bridge refuses (lock)", code === 1 && b2.out().includes("already running"));

  // 8. reconnect after a network drop, login state persisted
  await fake("/drop");
  check("reconnects after drop", await waitFor(() => b1.out().split("Connected as").length > 2, 15000));
  check("login saved to disk", existsSync(path.join(auth, "creds.json")));
} finally {
  b1.p.kill("SIGINT");
  await sleep(800);
  check("lock released on shutdown", !existsSync(path.join(auth, ".bridge.lock")));
  check("reply-window state persisted", existsSync(path.join(auth, "bridge-state.json")) && readFileSync(path.join(auth, "bridge-state.json"), "utf8").includes(A));
  await sql.end();
  console.log(failures ? `\n${failures} check(s) failed` : "\nAll bridge checks passed");
  process.exit(failures ? 1 : 0);
}
