import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { E2E_ENV } from "../../playwright.config";

export const DEV_KEY = E2E_ENV.CRON_SECRET;
export const fixture = (name: string) => path.resolve("tests/e2e/fixtures", name);
export const b64 = (name: string) => readFileSync(fixture(name)).toString("base64");

/** Talk to the WhatsApp bot as `from` through the simulator endpoint. Returns the bot's replies. */
export async function wa(request: APIRequestContext, from: string, body: Record<string, unknown> | string): Promise<string[]> {
  const data = typeof body === "string" ? { type: "text", text: body } : body;
  const r = await request.post("/api/dev/wa", { headers: { "x-dev-key": DEV_KEY }, data: { from, ...data } });
  expect(r.ok(), await r.text()).toBeTruthy();
  return (await r.json()).replies as string[];
}

export const firstUrl = (texts: string[], re: RegExp) => {
  for (const t of texts) {
    const m = t.match(re);
    if (m) return m[0];
  }
  throw new Error(`no url matching ${re} in:\n${texts.join("\n---\n")}`);
};

/** Log an agent into the dashboard using a magic link from the bot. */
export async function loginAgent(page: Page, request: APIRequestContext, phone: string) {
  const replies = await wa(request, phone, "login");
  const link = firstUrl(replies, /http:\/\/localhost:3100\/app\/auth\?t=\S+/);
  await page.goto(link);
  await expect(page).toHaveURL(/\/app/);
}

export async function onboardAgent(request: APIRequestContext, phone: string, name: string, company?: string) {
  await wa(request, phone, "hi");
  await wa(request, phone, name);
  await wa(request, phone, company ?? "skip");
  await wa(request, phone, "skip");
  const r = await wa(request, phone, "YES");
  expect(r.join("\n")).toContain("You're all set");
}
