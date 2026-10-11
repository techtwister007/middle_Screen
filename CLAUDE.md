# Working on this repo

Read `README.md` first. Product decisions live in `PRODUCT.md`, `BUILD_PLAN.md`, `UX_BRIEF.md` and `DEMO.md`.

## Rules that keep the platform safe

- **Every salon-owned document has a `tenant` field.** Server code reads and writes salon data through `forTenant(payload, salonId)` from `@salon/core`, never raw `payload.find` without a tenant filter. Public pages use `overrideAccess` only via `forTenant`.
- **Modules never import each other.** Cross-module behaviour goes through events (`emit()` / `on:` handlers / `schedule()` steps). `pnpm boundaries` enforces this. Shared pure helpers live in `packages/modules/src/_shared`.
- **Money is integer paise.** Use `rupees()` / `formatINR()` from core. Never floats.
- **Phones are E.164.** Use `normalizePhone()`.
- **IDs from URLs/forms are strings.** Normalise with `asId()` before writing relationships.
- **Feature checks go through `isEnabled()`** (or `salonFeatures()` in the app), driven by plan + per-salon overrides.
- **No salon-specific code paths.** Differences belong in settings, feature switches or themes.
- **Messaging rules:** marketing needs consent and respects weekly/monthly caps; reminders are utility messages; never reward Google reviews, never gate the review link.
- **Payments settle in the salon's own Razorpay account.** We never hold customer money.
- **Server actions:** don't call `redirect()` after changing cookies in the same action (the cookie change can be dropped). Return and let the client navigate.

## After changing collections

```bash
cd apps/platform
pnpm generate:types
pnpm migrate:create <short_name>   # also fixes Payload's type imports for Vitest
pnpm migrate
```

## Tests to keep green

Unit (core, modules, themes), integration (`apps/platform/tests/int`: tenant isolation + full journey), e2e (`apps/platform/tests/e2e`). The tenant-isolation suite must never be skipped.
