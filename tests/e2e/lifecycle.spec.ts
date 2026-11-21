import { test, expect } from "@playwright/test";
import postgres from "postgres";
import { E2E_ENV } from "../../playwright.config";
import { b64, firstUrl, loginAgent, onboardAgent, wa } from "./helpers";

/** Lifecycle gaps found in the audit: corrections by reply, PDFs, easy sharing, visit status, requirements, deal close. */
test.describe.configure({ mode: "serial" });
const AGENT = "919800000505";
const BUYER = "919876555501";
let ref = "";
let ref2 = "";
let personal = "";

test("agent fixes a draft by just replying with the missing details", async ({ request }) => {
  await onboardAgent(request, AGENT, "Vikram Rao", "Rao Estates");
  await wa(request, AGENT, { type: "image", media: { base64: b64("living.jpg"), mime: "image/jpeg" } });
  await wa(request, AGENT, { type: "document", media: { base64: b64("floorplan.pdf"), mime: "application/pdf" } });
  await wa(request, AGENT, "3 bhk furnished flat");
  const done = (await wa(request, AGENT, "done")).join("\n");
  expect(done).toMatch(/Missing: \*price, locality/);
  ref = done.match(/Ref \*([A-Z0-9]{5})\*/)![1];
  const fix = (await wa(request, AGENT, "88 lakh, Gotri Vadodara, 1350 sqft")).join("\n");
  expect(fix).toContain("Updated: price, locality");
  expect(fix).toContain("₹88 L");
  expect(fix).toContain("3 BHK Apartment for Sale in Gotri");
  expect(fix).not.toContain("Missing");
  expect((await wa(request, AGENT, "1")).join()).toContain("Live!");
});

test("'share REF' then a contact card gives a personal link; several refs make a shortlist", async ({ request }) => {
  const ask = (await wa(request, AGENT, `share ${ref}`)).join();
  expect(ask).toContain("Who is it for?");
  const r = await wa(request, AGENT, { type: "contact", contact: { name: "Anjali Verma", phone: BUYER.slice(2) } });
  personal = firstUrl(r, /http:\/\/localhost:3100\/p\/[a-z0-9]+/);
  expect(r.join()).toContain("Personal link for *Anjali Verma*");

  await wa(request, AGENT, "2 BHK flat for sale in Vasna Vadodara 62 lakh 1100 sqft semi furnished");
  ref2 = (await wa(request, AGENT, "done")).join().match(/Ref \*([A-Z0-9]{5})\*/)![1];
  await wa(request, AGENT, "1");
  const multi = await wa(request, AGENT, `share ${ref} ${ref2} to Anjali Verma ${BUYER.slice(2)}`);
  expect(firstUrl(multi, /http:\/\/localhost:3100\/c\/[a-z0-9]+/)).toBeTruthy();
});

test("buyer sees floor plan, price/sq ft, EMI and freshness", async ({ page }) => {
  await page.goto(personal);
  await expect(page.getByText("Floor plan & documents")).toBeVisible();
  await expect(page.getByText(/₹6,519 \/ sq ft/)).toBeVisible();
  await expect(page.getByText(/EMI from/)).toBeVisible();
  await expect(page.getByText("Updated today")).toBeVisible();
});

test("buyer always sees visit status; confirmed visit can go into their calendar", async ({ page, browser, request }) => {
  await page.goto(personal);
  await page.getByRole("button", { name: /Book site visit/ }).click();
  await page.getByRole("button", { name: "Request visit" }).click();
  await expect(page.getByText(/Visit requested!/)).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByText(/Visit requested ·/)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/Visit requested ·/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Visit requested" })).toBeDisabled();

  const agentPage = await browser.newPage();
  await loginAgent(agentPage, request, AGENT);
  await agentPage.goto("/app/visits");
  await agentPage.getByRole("button", { name: "Confirm" }).click();
  await expect(agentPage.getByRole("button", { name: "Confirm" })).toBeHidden();
  await agentPage.close();

  await page.reload();
  await expect(page.getByText(/Site visit confirmed ·/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Add to calendar" })).toHaveAttribute("href", /^data:text\/calendar/);
  await expect(page.getByRole("button", { name: "Visit booked ✓" })).toBeVisible();
});

test("buyer's question can be answered from the lead page", async ({ page, request, context }) => {
  await page.goto(personal);
  await page.getByRole("button", { name: "Ask" }).click();
  await page.getByRole("button", { name: "Is parking included?" }).click();
  await page.getByRole("button", { name: /Send to/ }).click();
  await expect(page.getByText(/will get back to you/)).toBeVisible();

  await loginAgent(page, request, AGENT);
  await expect(page.getByText(/asked a question/).first()).toBeVisible();
  await page.goto("/app/leads");
  await page.getByText("Anjali Verma").click();
  await page.getByRole("button", { name: "Mark answered" }).click();
  await expect(page.getByText("✓ Answered")).toBeVisible();
  // tapping WhatsApp records "contacted"
  const [popup] = await Promise.all([context.waitForEvent("page"), page.getByRole("link", { name: "WhatsApp" }).first().click()]);
  await popup.close().catch(() => {});
  const sql = postgres(E2E_ENV.DATABASE_URL, { max: 1 });
  await expect.poll(async () => (await sql`select last_contacted_at from leads where phone = ${BUYER}`)[0].last_contacted_at).not.toBeNull();
  await sql.end();
  await page.goto("/app");
  // answered + contacted → nothing left in "Needs your attention" (activity history still shows it)
  await expect(page.getByText(/All caught up/)).toBeVisible();
});

test("sold → buyer is offered similar options → requirement reaches the agent with matches", async ({ page, browser, request }) => {
  const agentPage = await browser.newPage();
  await loginAgent(agentPage, request, AGENT);
  const sql = postgres(E2E_ENV.DATABASE_URL, { max: 1 });
  const [l] = await sql`select id from listings where ref = ${ref}`;
  await agentPage.goto(`/app/properties/${l.id}`);
  await agentPage.getByRole("button", { name: "Sold", exact: true }).click();
  await agentPage.getByRole("button", { name: "Anjali Verma" }).click();
  await expect(agentPage.getByText("Closed with Anjali Verma ✓")).toBeVisible();
  await agentPage.goto("/app/insights");
  await expect(agentPage.getByText(/Deals closed with buyers you shared/)).toContainText("1");

  // a different, anonymous buyer opens the (now sold) public link
  const [pub] = await sql`select code from shares where listing_id = ${l.id} and channel = 'general'`;
  await page.context().clearCookies();
  await page.goto(`/p/${pub.code}`);
  await page.getByRole("button", { name: /This one's gone/ }).click();
  await page.getByRole("button", { name: "2 BHK" }).click();
  await page.getByLabel("Budget").selectOption("7500000");
  await page.getByPlaceholder(/Preferred areas/).fill("Vasna");
  await page.getByRole("button", { name: /Send to/ }).click();
  await page.getByPlaceholder("Your name").fill("Rohit Jain");
  await page.getByPlaceholder("Mobile number").fill("9876555502");
  await page.getByRole("button", { name: "Send my requirement" }).click();
  await expect(page.getByText(/will send you matching options/)).toBeVisible();

  await agentPage.goto("/app/activity");
  await expect(agentPage.getByText(/Rohit Jain is looking for: Buy · 2 BHK/)).toBeVisible();
  await expect(agentPage.getByText(/1 of your properties match/)).toBeVisible();
  await agentPage.close();
  await sql.end();
});

test("confirmed payments have a printable receipt", async ({ page, request }) => {
  const sql = postgres(E2E_ENV.DATABASE_URL, { max: 1 });
  const [a] = await sql`select id from agents where phone = ${AGENT}`;
  await sql`insert into payments (id, agent_id, method, months, amount_inr, status, confirmed_at, reference) values ('rcpt0001', ${a.id}, 'manual', 1, 500, 'confirmed', now(), 'cash')`;
  await sql.end();
  await loginAgent(page, request, AGENT);
  await page.goto("/app/settings/billing");
  await page.getByRole("link", { name: "Receipt" }).click();
  await expect(page.getByText("RECEIPT", { exact: true })).toBeVisible();
  await expect(page.getByText("Rao Estates")).toBeVisible();
  await expect(page.getByText("₹500").first()).toBeVisible();
});
