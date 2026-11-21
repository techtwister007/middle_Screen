import { test, expect } from "@playwright/test";
import postgres from "postgres";
import { E2E_ENV } from "../../playwright.config";
import { b64, onboardAgent, wa } from "./helpers";

test.describe.configure({ mode: "serial" });
const AGENT = "919800000404";
const tick = (request: import("@playwright/test").APIRequestContext) => request.get("/api/cron/tick", { headers: { authorization: `Bearer ${E2E_ENV.CRON_SECRET}` } });

test("photo batch auto-closes after silence (no 'done' needed) and voice notes are kept", async ({ request }) => {
  const sql = postgres(E2E_ENV.DATABASE_URL, { max: 1 });
  await onboardAgent(request, AGENT, "Auto Agent");
  await wa(request, AGENT, { type: "image", media: { base64: b64("living.jpg"), mime: "image/jpeg" } });
  await wa(request, AGENT, { type: "audio", media: { base64: Buffer.from("fake-ogg").toString("base64"), mime: "audio/ogg" } });
  await wa(request, AGENT, "2 BHK flat in Akota Vadodara 48 lakh");
  // Simulate 11 minutes of silence, then the scheduler runs
  await sql`update drafts set last_activity_at = now() - interval '11 minutes' where agent_id = (select id from agents where phone = ${AGENT})`;
  await sql`update jobs set run_at = now() where type = 'finalize_draft' and status = 'pending'`;
  expect((await tick(request)).ok()).toBeTruthy();
  const [msg] = await sql`select text from wa_messages where phone = ${AGENT} and direction = 'out' order by created_at desc limit 1`;
  expect(msg.text).toContain("Draft ready");
  expect(msg.text).toContain("₹48 L");
  expect(msg.text).toContain("Voice note saved"); // no AI key in tests → transcription unavailable, agent is told
  await sql.end();
});

test("stale listing → availability check → 'yes REF' re-verifies", async ({ request }) => {
  const sql = postgres(E2E_ENV.DATABASE_URL, { max: 1 });
  const pub = await wa(request, AGENT, "1");
  expect(pub.join()).toContain("Live!");
  const [l] = await sql`select l.id, l.ref, a.id as agent_id from listings l join agents a on a.id = l.agent_id where a.phone = ${AGENT} order by l.created_at desc limit 1`;
  await sql`update listings set verified_at = now() - interval '40 days' where id = ${l.id}`;
  // force today's daily run
  await sql`delete from jobs where type = 'daily'`;
  await sql`update agents set last_inbound_at = now() where id = ${l.agent_id}`;
  // daily tasks only run after 8:00 IST; emulate by calling until claimed (tick is idempotent)
  const r = await tick(request);
  expect(r.ok()).toBeTruthy();
  const ist = new Date(Date.now() + 5.5 * 3600000).getUTCHours();
  if (ist >= 8) {
    const [n] = await sql`select title from notifications where agent_id = ${l.agent_id} and kind = 'verify'`;
    expect(n.title).toContain("still available");
    const [w] = await sql`select text from wa_messages where phone = ${AGENT} and direction = 'out' order by created_at desc limit 1`;
    expect(w.text).toContain(`yes ${l.ref}`);
  }
  const ok = await wa(request, AGENT, `yes ${l.ref}`);
  expect(ok.join()).toContain("verified today");
  const [after] = await sql`select verified_at > now() - interval '1 minute' as fresh from listings where id = ${l.id}`;
  expect(after.fresh).toBe(true);
  await sql.end();
});

test("a buyer who verified via a link is not onboarded as an agent", async ({ request }) => {
  const sql = postgres(E2E_ENV.DATABASE_URL, { max: 1 });
  await sql`insert into wa_verifications (code, purpose, phone, verified_at, expires_at) values ('ZZZZZZ', 'buyer_verify', '919876599999', now(), now() + interval '1 hour')`;
  const r = await wa(request, "919876599999", "hello");
  expect(r.join()).toContain("Reply *JOIN*");
  const [a] = await sql`select count(*)::int as n from agents where phone = '919876599999'`;
  expect(a.n).toBe(0);
  const j = await wa(request, "919876599999", "join");
  expect(j.join()).toContain("What's your name");
  await sql.end();
});
