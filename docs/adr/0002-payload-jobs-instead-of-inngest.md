# 2. Payload Jobs Queue instead of Inngest

Date: 2026-10-11 · Status: accepted (changes BUILD_PLAN.md section 5.5)

**Decision.** Events and delayed steps run on Payload's built-in Jobs Queue (`waitUntil` for delays, `schedule` for recurring tasks), triggered on Vercel by a cron hitting `/api/payload-jobs/run` every 5 minutes. In development and tests (`EVENTS_MODE=inline`) handlers run immediately.

**Why.** One fewer vendor and secret to manage, jobs live in our own Postgres (visible in the admin), and the behaviour we need (retries, delays, schedules) is built in.

**Trade-off.** Delayed steps run within ~5 minutes of their time rather than to the second. That is fine for reminders. If volume grows, the bus can switch to Inngest without touching modules: only `packages/core/src/bus.ts` changes.
