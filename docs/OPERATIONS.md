# Operations — running the pilot

## Daily (5 minutes)
* **/admin** → pending UPI payments, new feedback, listing reports.
* **/admin/payments** → check each UTR in your bank/UPI app → *Confirm* (plan extends instantly, agent gets a push).
* **/admin/agents** → sort by "Bot active" / "Last buyer activity"; call agents who went quiet.

## Weekly
* `npm run backup` from your laptop (set `DATABASE_URL` to the Supabase **session pooler** URL).
* 10-minute feedback call per pilot agent; log notes in /admin/inbox feedback (or your own sheet).
* **/admin** pilot metrics: weekly active agents (target 15+/20), shares opened %, engaged %, visit requests.
* Broadcast new features from **/admin/broadcast**.

## Onboarding an agent in person
1. Ask them to send **hi** to the bot number → 4 quick questions → done.
2. Forward photos of a property they're working on + voice note → **done** → **1**.
3. `share REF to <a friend> <number>` → open the link on your phone → they see the alert. That's the "wow" moment.
4. Turn on notifications in the dashboard (Android: Chrome; iPhone: Share → Add to Home Screen first).

## Support actions (/admin/agents/:id)
* **Open as agent** — see exactly what they see.
* **Grant paid months** — cash payments, goodwill, referrals.
* **Extend by days** — longer trial.
* **Disable** — abuse; their pages stop showing.

## DPDP data requests (/admin/inbox)
Respond within 30 days. Delete a buyer's personal data across all agents (Supabase SQL editor):
```sql
-- replace with the number in digits incl. country code
update leads set name = '[deleted]', phone = null, phone_verified = false where phone = '919876543210';
delete from wa_messages where phone = '919876543210';
delete from wa_verifications where phone = '919876543210';
```
Then mark the request resolved.

## Rename the product
1. Set `NEXT_PUBLIC_PRODUCT_NAME` (and optionally tagline/colours in `src/config/brand.ts`) → redeploy.
2. New domain: add it in Vercel → set `APP_URL` to the new URL → set `APP_ALIAS_HOSTS=proppulse.vectorscale.in`
   (keep the old domain attached in Vercel). Every old link 308-redirects to the new domain — nothing breaks.
3. Update the Chatsync webhook URL, Razorpay webhook URL and pg_cron URL.

## Switch WhatsApp provider
`WA_PROVIDER=console` (simulator) → `baileys` (laptop bridge) → `chatsync` (production). Only env vars change.
Bot logic is identical across all three.

## Free-tier limits to watch

| Service | Free limit | Fine for |
|---|---|---|
| Supabase | 500 MB DB, 2 projects | ~100 agents |
| Cloudflare R2 | 10 GB, no egress fees | ~150 listings with video, ~2,000 photo-only |
| Vercel Hobby | 100 GB bandwidth, non-commercial | building & testing (see DEPLOYMENT.md) |
| Groq | rate-limited free tier | pilot volumes |
| WhatsApp (Chatsync) | per-message + platform fee | minimised by design |

When storage grows: encourage YouTube links for long videos; videos >50 MB are rejected with that tip.

## Monitoring
* Vercel → Logs (errors are logged with `[bot]`, `[jobs]`, `[wa]`, `[ai]`, `[push]` prefixes).
* `select type, status, count(*) from jobs group by 1,2;` — failed jobs show `error`.
* `select * from wa_messages where status = 'failed' order by created_at desc limit 20;` — undelivered bot messages.
