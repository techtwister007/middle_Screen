import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against a production build on port 3100 with an isolated test database
 * (proppulse_test) and the WhatsApp "console" provider (simulator). Run: npm run test:e2e
 */
const PORT = 3100;
export const E2E_ENV = {
  APP_URL: `http://localhost:${PORT}`,
  DATABASE_URL: process.env.E2E_DATABASE_URL ?? "postgres://pp:pp@localhost:5432/proppulse_test",
  LOCAL_STORAGE_DIR: "./storage-test",
  WA_PROVIDER: "console",
  DEV_TOOLS: "true",
  CRON_SECRET: "e2e-cron",
  ADMIN_PASSWORD: "e2e-admin-password",
  SESSION_SECRET: "e2e-secret-e2e-secret-e2e-secret-e2e",
  AI_API_KEY: "",
  RAZORPAY_KEY_ID: "",
  RAZORPAY_KEY_SECRET: "",
  VAPID_PUBLIC_KEY: "",
  VAPID_PRIVATE_KEY: "",
  DRAFT_BATCH_MINUTES: "10",
};

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: 0,
  reporter: [["list"]],
  globalSetup: "./tests/e2e/global-setup.ts",
  use: { baseURL: `http://localhost:${PORT}`, ...devices["Pixel 7"], trace: "off" },
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: E2E_ENV,
  },
});
