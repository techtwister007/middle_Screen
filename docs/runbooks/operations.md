# Operations runbook

**WhatsApp provider down.** Set `MESSAGING_PROVIDER=fake` temporarily; messages are logged with status so nothing is lost. Staff can send one-tap prefilled messages from a customer's page in the studio (click-to-chat).

**Razorpay webhook failures.** Payments stay `created`. Re-send from the Razorpay dashboard; capture is idempotent. Staff can also mark a visit paid at checkout.

**A job is stuck or failing.** Check `payload-jobs` in `/admin`. Re-run with `pnpm payload jobs:run --all-queues` or call `/api/payload-jobs/run?allQueues=true` with `Authorization: Bearer $CRON_SECRET`.

**Suspend a salon** (unpaid): console → salon → status `suspended`. Their customer app shows not found; data is kept.

**Customer asks for their data to be deleted.** They can do it in their profile (anonymised so the salon's financial records stay intact), or a platform admin anonymises the customer in `/admin`.

**Restore from backup.** Supabase dashboard → Database → Backups (PITR on Pro add-on). Restore to a new project, point `DATABASE_URL` at it, verify, then switch.

**Demo salons** expire to `suspended` 7 days after creation unless `settings.keepDemo` is set.
