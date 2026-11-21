# Deployment — free, on `proppulse.vectorscale.in`

Everything below is on free tiers. Only the parts that must be online 24×7 are hosted; your laptop runs the
Baileys test bridge and backups.

```
                 ┌──────────────── Cloudflare (DNS for vectorscale.in, free) ───────────────┐
 buyers/agents → │ proppulse.vectorscale.in  ──CNAME──► Vercel (Next.js app + API, free)    │
                 │ proppulse-media.vectorscale.in ──► Cloudflare R2 bucket (photos/videos)  │
                 └───────────────────────────────────────────────────────────────────────────┘
 Vercel app ──► Supabase Postgres (free, Mumbai)    ──► Groq API (AI, free tier)
 Supabase pg_cron ──(every minute)──► /api/cron/tick       Chatsync ──webhook──► /api/wa/chatsync
```

Do the steps in order. Total time: ~1 hour. You never paste keys into code — only into the dashboards / `.env`.

---

## 1. Database — Supabase

1. https://supabase.com → New project → name `proppulse`, region **Mumbai (ap-south-1)**, save the DB password.
2. Project Settings → Database → **Connection string**:
   * **Transaction pooler** (port `6543`) → this is `DATABASE_URL` for Vercel.
   * **Session pooler / direct** (port `5432`) → use this once from your laptop to run migrations.
3. From your laptop:
   ```powershell
   $env:DATABASE_URL="postgresql://postgres.xxxx:PASSWORD@aws-0-ap-south-1.pooler.supabase.com:5432/postgres"
   npm run db:migrate
   ```

> Supabase free allows **2 active projects per account** — keep that in mind for future VectorScale products.
> Free projects pause after 7 days with zero activity; daily use + the cron below keeps it awake.

## 2. Domain — move `vectorscale.in` DNS to Cloudflare (free)

1. https://dash.cloudflare.com → Add site → `vectorscale.in` → Free plan.
2. At your domain registrar, replace the nameservers with the two Cloudflare gives you. (Your agency website records get imported automatically; check them.)

## 3. Media storage — Cloudflare R2

1. Cloudflare → R2 → Create bucket `proppulse-media` (location: Asia-Pacific).
2. Bucket → Settings → **Custom domain** → `proppulse-media.vectorscale.in` (public read).
3. Bucket → Settings → **CORS policy** (needed for direct video uploads):
   ```json
   [{ "AllowedOrigins": ["https://proppulse.vectorscale.in"], "AllowedMethods": ["PUT", "GET"], "AllowedHeaders": ["*"], "MaxAgeSeconds": 3600 }]
   ```
4. R2 → Manage API tokens → Create token (Object Read & Write, this bucket) → note **Access Key ID**, **Secret**, and the **S3 endpoint** `https://<accountid>.r2.cloudflarestorage.com`.

## 4. AI — Groq (free)

https://console.groq.com → API Keys → create. Defaults in `.env.example` already point to Groq
(`llama-3.3-70b-versatile` + `whisper-large-v3`). Any OpenAI-compatible provider works — just change
`AI_BASE_URL`, `AI_MODEL`, `AI_API_KEY` (e.g. Gemini: `https://generativelanguage.googleapis.com/v1beta/openai`).

## 5. App — Vercel

1. https://vercel.com → Add New → Project → import `techtwister007/middle_Screen`.
2. Settings → Git → **Production Branch** = `property-listing-app`.
3. Settings → Environment Variables (Production) — copy from `.env.example` and set:

   | Variable | Value |
   |---|---|
   | `APP_URL` | `https://proppulse.vectorscale.in` |
   | `DATABASE_URL` | Supabase **transaction pooler** URL (port 6543) |
   | `SESSION_SECRET` | 40+ random characters |
   | `ADMIN_PASSWORD` | strong password (10+ chars) |
   | `CRON_SECRET` | random string |
   | `DEV_TOOLS` | `false` |
   | `STORAGE_DRIVER` | `s3` |
   | `S3_ENDPOINT` / `S3_BUCKET` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | from step 3 |
   | `S3_PUBLIC_URL` | `https://proppulse-media.vectorscale.in` |
   | `AI_API_KEY` | Groq key |
   | `WA_PROVIDER` | `baileys` while testing, `chatsync` for the pilot |
   | `WA_NUMBER` | the bot's WhatsApp number, digits only (`91…`) |
   | `BRIDGE_SECRET` | random string (same in `bridge/baileys/.env`) |
   | `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | from `npm run keys:vapid` |
   | `UPI_ID` / `UPI_NAME` | your VectorScale UPI ID and display name |
   | `PLAN_PRICE_INR` | `500` |

4. Deploy. Then Settings → Domains → add `proppulse.vectorscale.in`.
5. In Cloudflare DNS add: `CNAME proppulse → cname.vercel-dns.com` with **proxy OFF (grey cloud)**.

> ⚠️ Vercel **Hobby is for non-commercial use**. It's fine for building & testing. When agents start paying,
> upgrade to Vercel Pro (~$20/mo), or move to Cloudflare Workers (OpenNext) which allows commercial use on the free plan.

## 6. Scheduler — Supabase pg_cron → `/api/cron/tick` (every minute)

Supabase → SQL Editor → run (replace the secret):

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'proppulse-tick',
  '* * * * *',
  $$ select net.http_get(
       url := 'https://proppulse.vectorscale.in/api/cron/tick',
       headers := jsonb_build_object('Authorization', 'Bearer YOUR_CRON_SECRET')
     ) $$
);
-- check runs:  select * from cron.job_run_details order by start_time desc limit 10;
```

The tick closes WhatsApp photo batches after 10 min of silence, sends visit reminders, and once a day (after 8 AM IST)
sends renewal reminders, follow-up nudges, "is this still available?" checks and Monday weekly reports.

## 7. WhatsApp

**Testing (Baileys, laptop):** set `WA_PROVIDER=baileys` on Vercel, then on your laptop run the bridge
(`bridge/baileys/README.md`) with `APP_URL=https://proppulse.vectorscale.in`. Use a spare SIM.

**Production (Chatsync):**
1. In Chatsync, set the webhook URL to `https://proppulse.vectorscale.in/api/wa/chatsync` and a verify token.
2. Vercel env: `WA_PROVIDER=chatsync`, `CHATSYNC_API_URL`, `CHATSYNC_API_KEY`, `CHATSYNC_PHONE_ID`,
   `CHATSYNC_VERIFY_TOKEN`, `CHATSYNC_APP_SECRET` (for signature checks), `WA_NUMBER`.
3. The adapter (`src/lib/wa/chatsync.ts`) uses the **Meta WhatsApp Cloud API format** (most BSPs proxy it 1:1).
   If Chatsync's docs differ (URL paths, auth header, webhook shape), only that one file needs adjusting.
4. Cost control is built in: one bot reply per photo batch; agent alerts go via free web push; WhatsApp is only
   sent inside the free 24-hour window that starts when the agent messages the bot.

## 8. Payments — Razorpay + UPI

1. Razorpay Dashboard → Settings → API Keys → **Test mode** keys first → `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`.
2. Settings → Webhooks → URL `https://proppulse.vectorscale.in/api/billing/razorpay/webhook`, events
   `payment.captured` and `order.paid`, set a secret → `RAZORPAY_WEBHOOK_SECRET`.
3. Switch to live keys after KYC. Manual UPI works without Razorpay: agents scan your UPI QR, enter the UTR,
   you confirm in **/admin/payments**.

## 9. Go-live checklist

- [ ] `DEV_TOOLS=false`, strong `ADMIN_PASSWORD`, random `SESSION_SECRET` / `CRON_SECRET` / `BRIDGE_SECRET`
- [ ] `https://proppulse.vectorscale.in` loads; `/admin` login works
- [ ] Send `hi` to the bot number → onboarding replies arrive
- [ ] Forward 2 photos + text + `done` → draft → `1` → link opens with photo & price
- [ ] Paste a property link into WhatsApp → preview shows photo, title, price
- [ ] `select * from cron.job_run_details …` shows successful runs
- [ ] Enable push on your phone (dashboard banner) → open a personal link from another phone → notification arrives
- [ ] Razorpay test payment extends the plan; UPI submission appears in /admin/payments
- [ ] Run `npm run backup` from the laptop against production `DATABASE_URL` (session pooler URL)
