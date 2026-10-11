# Deploy to Vercel + Supabase

1. **Supabase** (region: Mumbai, Pro plan): create the project. Copy the pooled connection string (Supavisor, port 6543) into `DATABASE_URL`. Create a Storage bucket `media` (public) and S3 access keys; set `S3_BUCKET`, `S3_ENDPOINT` (`https://<project>.supabase.co/storage/v1/s3`), `S3_REGION=ap-south-1`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`.
2. **Vercel**: import the repo, set the project root to `apps/platform` (it has `vercel.json`: region `bom1`, migrations before build, jobs cron every 5 minutes).
3. **Environment variables** (Production): everything in `apps/platform/.env.example`, with real secrets:
   - `PAYLOAD_SECRET`, `CUSTOMER_SESSION_SECRET`: long random strings
   - `PUBLIC_URL=https://<your domain>`, `ROOT_DOMAIN=<your domain>`
   - `CRON_SECRET`: random; Vercel sends it to the jobs endpoint
   - `EVENTS_MODE=queue`
   - `MESSAGING_PROVIDER=live` + `WHATSAPP_API_URL`, `WHATSAPP_API_KEY`, `WHATSAPP_WEBHOOK_SECRET` once the BSP is approved (until then keep `fake`)
   - `PAYMENTS_PROVIDER=live` + `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
   - Do **not** set `OTP_FIXED_CODE` in production (it is ignored when `NODE_ENV=production` anyway).
4. **Domain**: add `<domain>` and `*.<domain>` to Vercel (wildcard needs Vercel nameservers) so `salon.<domain>` works.
5. **Webhooks**: Razorpay → `https://<domain>/api/webhooks/razorpay` (event `payment_link.paid`). WhatsApp BSP → `/api/webhooks/whatsapp` with header `x-webhook-secret`.
6. **First admin**: run `pnpm seed` once against production only if you want the demo salons; otherwise create the platform admin in `/admin` on first visit.
