import { z } from "zod";

const bool = z
  .string()
  .optional()
  .transform((v) => v === "1" || v === "true");

const schema = z.object({
  NODE_ENV: z.string().default("development"),
  APP_URL: z.string().default("http://localhost:3000"),
  /** Comma separated old hostnames that should 301 to APP_URL (used after a rename). */
  APP_ALIAS_HOSTS: z.string().default(""),
  DATABASE_URL: z.string().default("postgres://pp:pp@localhost:5432/proppulse"),
  SESSION_SECRET: z.string().default("dev-only-secret-change-me-dev-only-secret"),
  ADMIN_PASSWORD: z.string().default("admin"),
  CRON_SECRET: z.string().default("dev-cron"),
  DEV_TOOLS: bool,

  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  LOCAL_STORAGE_DIR: z.string().default("./storage"),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default("auto"),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_PUBLIC_URL: z.string().optional(),

  AI_BASE_URL: z.string().default("https://api.groq.com/openai/v1"),
  AI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default("llama-3.3-70b-versatile"),
  AI_TRANSCRIBE_MODEL: z.string().default("whisper-large-v3"),

  /** Neighbourhood data and buyer place search (OpenStreetMap via Photon). "off" disables all calls. */
  NEARBY_PROVIDER: z.enum(["photon", "off"]).default("photon"),
  PHOTON_URL: z.string().default("https://photon.komoot.io"),

  WA_PROVIDER: z.enum(["console", "baileys", "chatsync"]).default("console"),
  /** Bot WhatsApp number in international format without + (e.g. 919812345678). */
  WA_NUMBER: z.string().default("919999999999"),
  BRIDGE_SECRET: z.string().default("dev-bridge"),
  CHATSYNC_API_URL: z.string().optional(),
  CHATSYNC_API_KEY: z.string().optional(),
  CHATSYNC_PHONE_ID: z.string().optional(),
  CHATSYNC_VERIFY_TOKEN: z.string().optional(),
  CHATSYNC_APP_SECRET: z.string().optional(),

  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().default("mailto:support@vectorscale.in"),

  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  UPI_ID: z.string().default("vectorscale@upi"),
  UPI_NAME: z.string().default("VectorScale"),

  PLAN_PRICE_INR: z.coerce.number().default(500),
  TRIAL_DAYS: z.coerce.number().default(30),
  GRACE_DAYS: z.coerce.number().default(7),
  PAGES_AFTER_LOCK_DAYS: z.coerce.number().default(30),
  DRAFT_BATCH_MINUTES: z.coerce.number().default(10),
  LISTING_VERIFY_DAYS: z.coerce.number().default(30),
});

export const env = schema.parse(process.env);
export const isProd = env.NODE_ENV === "production";
export const devTools = env.DEV_TOOLS || !isProd;
export const appUrl = env.APP_URL.replace(/\/$/, "");

const DEFAULT_SECRET = "dev-only-secret-change-me-dev-only-secret";
/** Production safety: refuse weak defaults (checked at use time so builds never fail). */
export function assertProdSecrets(kind: "session" | "admin") {
  if (!isProd) return;
  if (kind === "session" && (env.SESSION_SECRET === DEFAULT_SECRET || env.SESSION_SECRET.length < 32))
    throw new Error("SESSION_SECRET must be set to a random string of 32+ characters in production");
  if (kind === "admin" && (env.ADMIN_PASSWORD === "admin" || env.ADMIN_PASSWORD.length < 10))
    throw new Error("ADMIN_PASSWORD must be set to a strong password (10+ characters) in production");
}
