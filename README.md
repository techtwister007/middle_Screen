# Salon Growth Platform

One codebase that gives every salon its own branded customer app, a staff/owner studio and a retention + content engine, all run by us from a platform console.

- Product: [`PRODUCT.md`](./PRODUCT.md) · Build plan: [`BUILD_PLAN.md`](./BUILD_PLAN.md) · UX brief: [`UX_BRIEF.md`](./UX_BRIEF.md) · Sales demo: [`DEMO.md`](./DEMO.md)
- What was built and what is left: [`docs/STATUS.md`](./docs/STATUS.md)

## What's inside

| Path | What it is |
| --- | --- |
| `apps/platform` | Next.js 16 + Payload 3 app: customer PWA (`/s/<salon>`), studio (`/studio/<salon>`), console (`/console`), admin (`/admin`), API (`/api`) |
| `packages/core` | Module contract, event bus, tenant-scoped data access, money/phone/time helpers, feature switches |
| `packages/modules` | The 17 feature modules (catalog, gallery, customers, booking, visits, payments, messaging, loyalty, referrals, reviews, campaigns, contests, content-engine, reports, try-on, discovery, platform) |
| `packages/integrations` | Adapters: WhatsApp (fake / HTTP BSP), Razorpay, AI image try-on, Google Wallet pass |
| `packages/themes` | Theme contract + three themes (Blush, Noir & Gold, Studio White) with contrast-checked tokens |
| `packages/ui` | Shared design system primitives (Tailwind v4 + shadcn-style components, Vaul, Embla) |
| `packages/testing` | Test factories |

## Run it locally

Requirements: Node 22, pnpm 10, PostgreSQL 16.

```bash
./scripts/setup-local.sh          # install, create .env with random secrets, create databases, migrate, seed
cd apps/platform && pnpm dev      # http://localhost:3000
```

`./scripts/setup-local.sh --fresh` drops and reseeds the dev database. Doing it by hand: `pnpm install`, `createdb salon_dev salon_test`,
copy `apps/platform/.env.example` to `.env` (set `PAYLOAD_SECRET`, `CUSTOMER_SESSION_SECRET`), then `pnpm migrate && pnpm seed` in `apps/platform`.

Open:

- Customer apps: http://localhost:3000/s/glamnails · /s/aura · /s/riddhi (login code is `OTP_FIXED_CODE` in development)
- Studio: http://localhost:3000/studio/login — `owner@glamnails.test` / `owner-demo-123`
- Console: http://localhost:3000/console — `admin@platform.test` / `admin-demo-123` (salons, demo presenter, design library, content, customer lookup)
- Admin: http://localhost:3000/admin

Seed passwords are for local development only (override with `SEED_ADMIN_PASSWORD`, `SEED_OWNER_PASSWORD`).

## Checks

```bash
pnpm lint                                   # Biome
pnpm boundaries                             # modules must not import each other
pnpm -r exec tsc --noEmit                   # types
pnpm --filter @salon/core --filter @salon/modules --filter @salon/themes test   # unit tests
pnpm --filter @salon/platform test          # integration tests on Postgres (salon_test)
cd apps/platform && E2E_BASE_URL=http://localhost:3000 npx playwright test       # browser tests
cd apps/platform && node scripts/crawl.mjs   # logs in as visitor, customer, owner and admin, follows every link, reports errors
```

## Adding a feature module

1. Create `packages/modules/src/<name>/index.ts` exporting `defineModule({ key, feature, collections, tenantCollections, on, steps, recurring })`.
2. Add it to `packages/modules/src/registry.ts`.
3. `cd apps/platform && pnpm generate:types && pnpm migrate:create <name> && pnpm migrate` (new recurring jobs and message templates need a migration too: they are database enums).
4. Talk to other modules only through events (`packages/core/src/events.ts`). `pnpm boundaries` fails the build otherwise.

## Deploy (Vercel + Supabase)

See [`docs/runbooks/deploy.md`](./docs/runbooks/deploy.md).
