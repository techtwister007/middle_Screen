import { test, expect, type Page } from "@playwright/test";
import { b64, firstUrl, fixture, loginAgent, onboardAgent, wa } from "./helpers";

/**
 * The core product loop, end to end:
 * agent onboards on WhatsApp → creates a listing from photos + text → publishes → shares a personal link
 * → buyer opens, saves, asks, requests a visit → agent sees it all, confirms the visit, works the lead.
 */
test.describe.configure({ mode: "serial" });

const AGENT = "919800000101";
const BUYER = "919876500001";
let listingUrl = "";
let personalUrl = "";
let ref = "";

test("agent onboards on WhatsApp", async ({ request }) => {
  const hi = await wa(request, AGENT, "hi");
  expect(hi.join()).toContain("What's your name");
  expect((await wa(request, AGENT, "Rakesh Sharma")).join()).toContain("company");
  expect((await wa(request, AGENT, "Sharma Properties")).join()).toContain("photo or company logo");
  const photo = await wa(request, AGENT, { type: "image", media: { base64: b64("avatar.png"), mime: "image/png" } });
  expect(photo.join()).toContain("Your buyers are yours");
  const yes = await wa(request, AGENT, "yes");
  expect(yes.join()).toContain("free trial is active");
  expect(yes.join()).toMatch(/\/app\/auth\?t=/);
});

test("agent creates a listing from WhatsApp photos + text", async ({ request }) => {
  const first = await wa(request, AGENT, { type: "image", media: { base64: b64("living.jpg"), mime: "image/jpeg" } });
  expect(first.join()).toContain("Got it");
  // Further media in the same batch get no reply (saves per-message fees)
  expect(await wa(request, AGENT, { type: "image", media: { base64: b64("kitchen.jpg"), mime: "image/jpeg" } })).toHaveLength(0);
  expect(await wa(request, AGENT, { type: "image", media: { base64: b64("bedroom.jpg"), mime: "image/jpeg" } })).toHaveLength(0);
  // Exact duplicate photo is ignored
  expect(await wa(request, AGENT, { type: "image", media: { base64: b64("bedroom.jpg"), mime: "image/jpeg" } })).toHaveLength(0);
  expect(await wa(request, AGENT, "3 BHK flat in Gotri, Vadodara. 1450 sq ft, fully furnished, 5th floor, lift, covered parking. 95 lakh negotiable")).toHaveLength(0);
  const done = await wa(request, AGENT, "done");
  const all = done.join("\n");
  expect(all).toContain("Creating your listing from 3 photos");
  expect(all).toContain("Draft ready");
  expect(all).toContain("₹95 L");
  ref = all.match(/Ref \*([A-Z0-9]{5})\*/)![1];
  const pub = await wa(request, AGENT, "1");
  listingUrl = firstUrl(pub, /http:\/\/localhost:3100\/p\/[a-z0-9]+/);
  expect(pub.join()).toContain("Live!");
});

test("bot shares a personal tracked link", async ({ request }) => {
  const r = await wa(request, AGENT, `share ${ref} to Priya Patel ${BUYER.slice(2)}`);
  personalUrl = firstUrl(r, /http:\/\/localhost:3100\/p\/[a-z0-9]+/);
  expect(personalUrl).not.toBe(listingUrl);
  expect(r.join()).toContain(`wa.me/${BUYER}`);
});

test("buyer page: rich preview tags, privacy, gallery", async ({ page }) => {
  await page.goto(personalUrl);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("3 BHK");
  await expect(page.getByText("Hi Priya, selected for you")).toBeVisible();
  await expect(page.locator(".font-display.text-agent", { hasText: "₹95 L" }).first()).toBeVisible();
  await expect(page.getByText("Fully furnished").first()).toBeVisible();
  await expect(page.getByText("Sharma Properties").first()).toBeVisible();
  // Open Graph tags for WhatsApp link previews
  expect(await page.locator('meta[property="og:title"]').getAttribute("content")).toContain("₹95 L");
  expect(await page.locator('meta[property="og:image"]').getAttribute("content")).toMatch(/\.webp$/);
  // 3 photos (duplicate removed)
  await expect(page.getByText("1 / 3")).toBeVisible();
});

async function openAsBuyer(page: Page) {
  await page.goto(personalUrl);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

test("buyer saves, asks a question and requests a site visit", async ({ page }) => {
  await openAsBuyer(page);
  await page.getByRole("button", { name: "Save" }).click();
  // Known lead via personal link → identity sheet appears only if phone unknown; Priya's phone is known
  await page.getByRole("button", { name: "Ask" }).click();
  await page.getByRole("button", { name: "Is the price negotiable?" }).click();
  await page.getByRole("button", { name: /Send to/ }).click();
  await expect(page.getByText(/will get back to you/)).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await page.getByRole("button", { name: /Book site visit/ }).click();
  await page.getByRole("button", { name: "Tomorrow" }).click();
  await page.getByRole("button", { name: "Evening" }).click();
  await page.getByRole("button", { name: "Request visit" }).click();
  await expect(page.getByText(/Visit requested!/)).toBeVisible();
});

test("anonymous viewer of the public link must identify to ask", async ({ page }) => {
  await page.goto(listingUrl);
  await page.getByRole("button", { name: "Ask" }).click();
  await page.getByPlaceholder("Type your question…").fill("Is parking covered?");
  await page.getByRole("button", { name: /Send to/ }).click();
  await expect(page.getByText("Where should we reply?")).toBeVisible();
  await page.getByPlaceholder("Your name").fill("Amit Shah");
  await page.getByPlaceholder("Mobile number").fill("98765 00002");
  await page.getByRole("button", { name: "Send question" }).click();
  await expect(page.getByText(/will get back to you/)).toBeVisible();
});

test("buyer verifies with one WhatsApp tap (free OTP replacement)", async ({ page, request, context }) => {
  await page.goto(listingUrl);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved ♥ — keep your shortlist")).toBeVisible();
  const [popup] = await Promise.all([context.waitForEvent("page"), page.getByRole("button", { name: /Confirm with WhatsApp/ }).click()]);
  const text = decodeURIComponent(new URL(popup.url()).searchParams.get("text") ?? popup.url());
  const code = text.match(/VERIFY ([A-Z0-9]{6})/)![1];
  await popup.close().catch(() => {});
  const reply = await wa(request, "919876500003", `VERIFY ${code} — save my shortlist`);
  expect(reply.join()).toContain("Verified!");
  await expect(page.getByText("Saved ♥ — keep your shortlist")).toBeHidden({ timeout: 15000 });
});

test("agent dashboard shows the activity, lead intent and visit request", async ({ page, request }) => {
  await loginAgent(page, request, AGENT);
  await expect(page.getByRole("heading", { name: /Hello, Rakesh/ })).toBeVisible();
  await expect(page.getByText(/Priya Patel wants a site visit/).first()).toBeVisible();
  await expect(page.getByText(/asked a question/).first()).toBeVisible();
  await page.goto("/app/leads");
  await expect(page.getByText("Priya Patel")).toBeVisible();
  await expect(page.getByText("Amit Shah")).toBeVisible();
  await page.getByText("Priya Patel").click();
  await expect(page.getByText(/Why:.*Requested a site visit/)).toBeVisible();
  await expect(page.getByText("“Is the price negotiable?”")).toBeVisible();
  await expect(page.getByText("Requested a site visit").last()).toBeVisible();
  // notes & follow-up
  await page.getByLabel("New note").fill("Wants east facing. Budget firm at 92L.");
  await page.getByRole("button", { name: "Add note" }).click();
  await expect(page.getByText("Wants east facing. Budget firm at 92L.")).toBeVisible();
  await page.getByRole("button", { name: "Tomorrow" }).click();
  await page.getByRole("button", { name: "Set reminder" }).click();
  await expect(page.getByText("Saved ✓")).toBeVisible();
});

test("agent confirms and completes the site visit", async ({ page, request }) => {
  await loginAgent(page, request, AGENT);
  await page.goto("/app/visits");
  await expect(page.getByText("Priya Patel")).toBeVisible();
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByRole("button", { name: "Confirm" })).toBeHidden();
  await page.goto("/app/visits?tab=upcoming");
  await expect(page.getByText("confirmed")).toBeVisible();
  await page.getByRole("button", { name: "Mark done" }).click();
  await page.getByRole("button", { name: "Negotiating" }).click();
  await expect(page.getByRole("button", { name: "Negotiating" })).toBeHidden();
  await page.goto("/app/visits?tab=past");
  await expect(page.getByText("completed")).toBeVisible();
});

test("bot commands: list, find, price, sold, leads, today, contact card", async ({ request }) => {
  expect((await wa(request, AGENT, "list")).join()).toContain(ref);
  const find = (await wa(request, AGENT, "find 3bhk gotri under 1cr")).join();
  expect(find).toContain("1 match");
  expect((await wa(request, AGENT, "find 2bhk alkapuri under 30L")).join()).toContain("No matching");
  const price = (await wa(request, AGENT, `price ${ref} 92L`)).join();
  expect(price).toContain("₹92 L");
  expect(price).toMatch(/was ₹9\d(\.\d)? L[\s\S]*showed interest/);
  expect((await wa(request, AGENT, "leads")).join()).toContain("Priya Patel");
  expect((await wa(request, AGENT, "today")).join()).toContain("Today");
  expect((await wa(request, AGENT, { type: "contact", contact: { name: "Neha Joshi", phone: "9876500009" } })).join()).toContain("Added *Neha Joshi*");
  expect((await wa(request, AGENT, "blah blah")).join()).toContain("help");
});

test("price change keeps the same link; sold shows on buyer page", async ({ page, request }) => {
  await page.goto(personalUrl);
  await expect(page.getByText("₹92 L").first()).toBeVisible();
  await expect(page.getByText("Price reduced")).toBeVisible();
  await wa(request, AGENT, `sold ${ref}`);
  await page.reload();
  await expect(page.getByText("Sold", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Book site visit/ })).toBeHidden();
  await wa(request, AGENT, `available ${ref}`);
});

test("owner report: signed link shows activity, hides buyer names, rejects tampering", async ({ page, request }) => {
  const msg = (await wa(request, AGENT, `report ${ref}`)).join();
  const url = msg.match(/https?:\/\/\S+\/o\/\S+/)![0];
  const path = new URL(url).pathname;
  await page.goto(path);
  await expect(page.getByText("Owner report")).toBeVisible();
  await expect(page.getByText("Page views")).toBeVisible();
  await expect(page.getByText("Interested buyers")).toBeVisible();
  await expect(page.getByText("Asked for a site visit")).toBeVisible();
  await expect(page.getByText("Priya")).toHaveCount(0);
  const bad = await page.goto(path.slice(0, -2) + (path.endsWith("aa") ? "bb" : "aa"));
  expect(bad?.status()).toBe(404);
});

test("page look: agent switches to Classic from WhatsApp and back", async ({ page, request }) => {
  expect((await wa(request, AGENT, "look classic")).join()).toContain("Page look set to Classic");
  await page.goto(personalUrl);
  await expect(page.getByRole("heading", { name: "Key facts" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ask a question" })).toBeVisible();
  expect((await wa(request, AGENT, "look signature")).join()).toContain("Signature");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Key facts" })).toHaveCount(0);
});

test("agent website lists public properties", async ({ page, request }) => {
  await loginAgent(page, request, AGENT);
  await page.goto("/app/settings");
  const handle = await page.locator("#handle").inputValue();
  await page.goto(`/${handle}`);
  await expect(page.getByRole("heading", { name: "Sharma Properties" })).toBeVisible();
  await expect(page.getByText("3 BHK").first()).toBeVisible();
});

export { fixture };
