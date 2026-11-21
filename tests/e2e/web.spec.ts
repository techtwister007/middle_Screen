import { test, expect } from "@playwright/test";
import postgres from "postgres";
import { E2E_ENV } from "../../playwright.config";
import { b64, fixture, firstUrl, loginAgent, onboardAgent, wa } from "./helpers";

test.describe.configure({ mode: "serial" });

const AGENT = "919800000202";
let listingId = "";

test("signup via 'Continue with WhatsApp' (no password, no OTP cost)", async ({ page, context, request }) => {
  await page.goto("/app/login");
  const [popup] = await Promise.all([context.waitForEvent("page"), page.getByRole("button", { name: "Continue with WhatsApp" }).click()]);
  const text = decodeURIComponent(new URL(popup.url()).searchParams.get("text") ?? popup.url());
  const code = text.match(/LOGIN ([A-Z0-9]{6})/)![1];
  await popup.close().catch(() => {});
  const r = await wa(request, AGENT, `LOGIN ${code} — please log me in`);
  expect(r.join()).toContain("Logged in");
  await expect(page).toHaveURL(/\/app\/welcome/, { timeout: 15000 });
  await page.getByPlaceholder("e.g. Rakesh Sharma").fill("Meera Desai");
  await page.getByPlaceholder("e.g. Sharma Properties").fill("Desai Realty");
  await page.getByPlaceholder("e.g. Vadodara").fill("Ahmedabad");
  await page.getByLabel(/I accept the Agent Promise/).check();
  await page.getByRole("button", { name: "Start my free trial" }).click();
  await expect(page.getByText("You're all set!")).toBeVisible();
});

test("create a listing on the web: text → AI draft → photos → publish", async ({ page, request }) => {
  await loginAgent(page, request, AGENT);
  await page.goto("/app/properties/new");
  await page.getByLabel("Property details").fill("2 BHK semi furnished flat for rent in Satellite, Ahmedabad. 1100 sqft, 2 bathrooms, 18k per month, deposit 50k");
  await page.getByRole("button", { name: /Continue/ }).click();
  await expect(page).toHaveURL(/\/edit\?new=1/);
  listingId = page.url().match(/properties\/([a-z0-9]+)\/edit/)![1];
  await expect(page.locator("#title")).toHaveValue(/2 BHK Apartment for Rent in Satellite/);
  await expect(page.locator("#price")).toHaveValue("18000");
  await page.getByTestId("photo-input").setInputFiles([fixture("living.jpg"), fixture("kitchen.jpg")]);
  await expect(page.getByText("COVER")).toBeVisible({ timeout: 20000 });
  await page.getByLabel("Building", { exact: true }).fill("Shivalik Heights");
  await page.getByLabel("Unit", { exact: true }).fill("A-702");
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page).toHaveURL(new RegExp(`/app/properties/${listingId}`));
  await expect(page.getByText("Available").first()).toBeVisible();
});

test("share dialog creates a personal link; buyer page hides private details", async ({ page, request }) => {
  await loginAgent(page, request, AGENT);
  await page.goto(`/app/properties/${listingId}`);
  await page.getByRole("button", { name: "Share with a buyer" }).first().click();
  await page.getByRole("button", { name: "New buyer" }).click();
  await page.getByLabel("Buyer name").fill("Karan Mehta");
  await page.getByLabel("Buyer phone").fill("9876511111");
  await page.getByRole("button", { name: "Create personal link" }).click();
  const url = (await page.getByTestId("share-url").textContent())!;
  expect(url).toMatch(/\/p\/[a-z0-9]+$/);
  await expect(page.getByRole("link", { name: "Send on WhatsApp" })).toHaveAttribute("href", /wa\.me\/919876511111/);
  const buyer = await page.context().browser()!.newPage();
  // the "opened" event is sent once the page's script starts; wait for it before closing the tab
  const opened = buyer.waitForResponse((r) => r.url().includes("/api/t") && r.request().method() === "POST");
  await buyer.goto(url);
  await expect(buyer.getByText("Hi Karan, selected for you")).toBeVisible();
  await expect(buyer.getByText("₹18,000 / month", { exact: true })).toBeVisible();
  const html = await buyer.content();
  expect(html).not.toContain("A-702"); // unit never shown
  expect(html).not.toContain("Shivalik"); // building hidden by default
  await opened;
  await buyer.close();
  // agent got the "opened" alert
  await page.goto("/app/activity");
  await expect(page.getByText("Karan Mehta opened your property")).toBeVisible();
});

test("collections: shortlist → buyer likes, ranks, compares", async ({ page, request }) => {
  // second listing via bot for the same agent
  await wa(request, AGENT, { type: "image", media: { base64: (await import("node:fs")).readFileSync(fixture("balcony.jpg")).toString("base64"), mime: "image/jpeg" } });
  await wa(request, AGENT, "3 BHK flat for rent in Bodakdev Ahmedabad 1600 sqft fully furnished 35k per month");
  await wa(request, AGENT, "done");
  await wa(request, AGENT, "1");

  await loginAgent(page, request, AGENT);
  await page.goto("/app/collections/new");
  await page.getByRole("button", { name: /2 BHK Apartment for Rent/ }).click();
  await page.getByRole("button", { name: /3 BHK Apartment for Rent/ }).click();
  await page.getByLabel("Collection title").fill("Rentals for Karan");
  await page.getByRole("button", { name: "Create & share" }).click();
  await expect(page.getByText("Collection created")).toBeVisible();
  await page.getByRole("button", { name: "Share" }).click();
  await page.getByRole("button", { name: /Karan Mehta/ }).click();
  const url = (await page.getByTestId("share-url").textContent())!;
  expect(url).toMatch(/\/c\/[a-z0-9]+$/);

  const buyer = await page.context().browser()!.newPage();
  await buyer.goto(url);
  await expect(buyer.getByRole("heading", { name: "Properties selected for Karan" })).toBeVisible();
  const cards = buyer.locator("article");
  await expect(cards).toHaveCount(2);
  await cards.nth(0).getByRole("button", { name: "Rank" }).click();
  await expect(buyer.getByText("Priority 1")).toBeVisible();
  await cards.nth(1).getByRole("button", { name: "Not for me" }).click();
  await buyer.locator("article").nth(0).getByRole("button", { name: "Compare" }).click();
  await buyer.locator("article").nth(1).getByRole("button", { name: "Compare" }).click();
  await buyer.getByRole("button", { name: /Compare 2/ }).click();
  await expect(buyer.getByRole("dialog", { name: "Compare" })).toContainText("Furnishing");
  await buyer.close();

  await page.reload();
  await expect(page.getByText(/#1 pick/)).toBeVisible();
});

test("lead created manually with a requirement gets matches", async ({ page, request }) => {
  await loginAgent(page, request, AGENT);
  await page.goto("/app/leads/new");
  await page.locator('input[name="name"]').fill("Sonal Shah");
  await page.locator('input[name="phone"]').fill("9876522222");
  await page.locator('select[name="purpose"]').selectOption("rent");
  await page.locator('input[name="bhk"][value="3"]').check();
  await page.locator('input[name="budgetMax"]').fill("40k");
  await page.locator('input[name="localities"]').fill("Bodakdev");
  await page.getByRole("button", { name: "Save buyer" }).click();
  await expect(page.getByRole("heading", { name: "Sonal Shah" })).toBeVisible();
  await expect(page.getByText("Matches from your inventory")).toBeVisible();
  await expect(page.getByText(/3 BHK Apartment for Rent in Bodakdev/)).toBeVisible();
});

test("billing: UPI payment submitted → admin confirms → plan active", async ({ page, request, browser }) => {
  await loginAgent(page, request, AGENT);
  await page.goto("/app/settings/billing");
  await expect(page.getByText(/Free trial — \d+ days left/)).toBeVisible();
  await page.getByRole("button", { name: "Pay by UPI QR" }).click();
  await expect(page.getByAltText("UPI QR code")).toBeVisible();
  await page.locator("#utr").fill("412345678901");
  await page.getByRole("button", { name: /I've paid/ }).click();
  await expect(page.getByText(/we'll verify/)).toBeVisible();

  const admin = await browser.newPage();
  await admin.goto("/admin/login");
  await admin.getByLabel("Admin password").fill(E2E_ENV.ADMIN_PASSWORD);
  await admin.getByRole("button", { name: "Log in" }).click();
  await expect(admin.getByRole("heading", { name: "Pilot dashboard" })).toBeVisible();
  await expect(admin.getByText(/UPI payment\(s\) to verify/)).toBeVisible();
  await admin.goto("/admin/payments");
  await expect(admin.getByText("412345678901").first()).toBeVisible();
  await admin.getByRole("button", { name: "Confirm" }).click();
  await expect(admin.getByText("Nothing pending")).toBeVisible();
  for (const p of ["/admin/agents", "/admin/listings", "/admin/inbox", "/admin/broadcast", "/admin/whatsapp"]) {
    await admin.goto(p);
    await expect(admin.locator("h1")).toBeVisible();
  }
  await admin.close();

  await page.reload();
  await expect(page.getByText(/Active until/)).toBeVisible();
  await expect(page.getByText("confirmed")).toBeVisible();
});

test("billing: online checkout (simulated without Razorpay keys) extends plan", async ({ page, request }) => {
  await loginAgent(page, request, AGENT);
  await page.goto("/app/settings/billing");
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Pay online (UPI / card)" }).click();
  await page.getByRole("button", { name: /Pay ₹/ }).click();
  await expect(page.getByText("Payment successful")).toBeVisible();
});

test("plan lapse: grace → locked (bot paused, pages live) → expired (contact card)", async ({ page, request }) => {
  const sql = postgres(E2E_ENV.DATABASE_URL, { max: 1 });
  const PHONE = "919800000303";
  await onboardAgent(request, PHONE, "Lapsed Agent");
  await wa(request, PHONE, "2 BHK flat in Vasna Vadodara 55 lakh 1000 sqft");
  await wa(request, PHONE, "done");
  const pub = await wa(request, PHONE, "1");
  const url = firstUrl(pub, /http:\/\/localhost:3100\/p\/[a-z0-9]+/);
  const [agent] = await sql`select id from agents where phone = ${PHONE}`;

  await sql`update subscriptions set period_end = now() - interval '10 days' where agent_id = ${agent.id}`;
  expect((await wa(request, PHONE, "list")).join()).toContain("plan has ended");
  await page.goto(url);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("2 BHK");

  await sql`update subscriptions set period_end = now() - interval '60 days' where agent_id = ${agent.id}`;
  await page.reload();
  await expect(page.getByText("This property link is not active right now")).toBeVisible();
  await sql.end();
});

test("security: agents cannot see each other's data; dev & cron endpoints are protected", async ({ page, request }) => {
  await loginAgent(page, request, AGENT);
  const sql = postgres(E2E_ENV.DATABASE_URL, { max: 1 });
  const [other] = await sql`select l.id from listings l join agents a on a.id = l.agent_id where a.phone = '919800000101' limit 1`;
  const [otherLead] = await sql`select le.id from leads le join agents a on a.id = le.agent_id where a.phone = '919800000101' limit 1`;
  await sql.end();
  const r1 = await page.goto(`/app/properties/${other.id}`);
  expect(r1?.status()).toBe(404);
  const r2 = await page.goto(`/app/leads/${otherLead.id}`);
  expect(r2?.status()).toBe(404);
  expect((await request.post("/api/dev/wa", { data: { from: "919999999999", text: "hi" } })).status()).toBe(404);
  expect((await request.get("/api/cron/tick")).status()).toBe(401);
  expect((await request.get("/api/wa/bridge/outbox")).status()).toBe(401);
  expect((await request.get("/api/export/leads")).status()).toBe(401);
  const ok = await request.get("/api/cron/tick", { headers: { authorization: `Bearer ${E2E_ENV.CRON_SECRET}` } });
  expect(ok.ok()).toBeTruthy();
});

test("lead CSV export", async ({ page, request }) => {
  await loginAgent(page, request, AGENT);
  const res = await page.request.get("/api/export/leads");
  expect(res.ok()).toBeTruthy();
  const csv = await res.text();
  expect(csv.split("\n")[0]).toContain("Name,Phone");
  expect(csv).toContain("Karan Mehta");
  expect(csv).not.toContain("Priya Patel"); // other agent's lead
});

test("festival greeting cards render in the agent's colours and need login", async ({ page, request }) => {
  expect((await request.get("/api/greeting/diwali")).status()).toBe(401);
  await loginAgent(page, request, AGENT);
  await page.goto("/app/more");
  await page.getByRole("link", { name: "Festival greeting cards" }).click();
  await page.getByRole("button", { name: /Diwali/ }).first().click();
  const img = page.getByRole("img", { name: "Happy Diwali card" });
  await expect(img).toBeVisible();
  await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBe(1080);
  const custom = await page.request.get("/api/greeting/diwali?msg=" + encodeURIComponent("Shubh Deepavali"));
  expect(custom.headers()["content-type"]).toContain("image/png");
  expect((await page.request.get("/api/greeting/nope")).status()).toBe(404);
});

test("branding from WhatsApp: colour, name, company, tagline, logo, welcome", async ({ page, request }) => {
  const A = "919800000277";
  await onboardAgent(request, A, "Meera Shah");
  expect((await wa(request, A, "colour maroon")).join()).toContain("Colour set to Maroon");
  expect((await wa(request, A, "colour #ffee88")).join()).toContain("too light");
  expect((await wa(request, A, "company: Shah Realty")).join()).toContain("Company set to Shah Realty");
  expect((await wa(request, A, "tagline: Homes in Vadodara since 2005")).join()).toContain("Tagline updated");
  expect((await wa(request, A, "welcome off")).join()).toContain("Welcome screen turned off");
  const logo = (await wa(request, A, { type: "image", text: "logo", media: { base64: b64("avatar.png"), mime: "image/png" } })).join();
  expect(logo).toContain("Logo");
  const brand = (await wa(request, A, "branding")).join();
  expect(brand).toMatch(/Colour: Maroon[\s\S]*Logo: added/);
  expect(brand).toContain("Shah Realty");
  // the logo is a branding image, not the start of a property draft
  expect((await wa(request, A, "done")).join()).not.toContain("Draft");
  await loginAgent(page, request, A);
  await page.goto("/app/settings");
  const handle = await page.locator("#handle").inputValue();
  await page.goto(`/${handle}`);
  await expect(page.getByText("Homes in Vadodara since 2005")).toBeVisible();
});
