# PropPulse — by VectorScale

WhatsApp-first property sharing & buyer intelligence for real estate agents.

> Agent forwards property photos + a voice note on WhatsApp → gets a beautiful branded link in a minute →
> shares a **personal** link to a buyer → sees who opened it, what they liked, who wants a site visit.

*"PropPulse"* is a working name. Rename anytime — see [docs/OPERATIONS.md](docs/OPERATIONS.md#rename-the-product).

| Doc | What's inside |
|---|---|
| [docs/PRODUCT_PLAN.md](docs/PRODUCT_PLAN.md) | The agreed product plan (features, pricing, decisions) |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How the code is organised, data model, request flows |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Step-by-step free deployment on `proppulse.vectorscale.in` |
| [docs/OPERATIONS.md](docs/OPERATIONS.md) | Running the pilot: admin tasks, payments, backups, rename, limits |
| [docs/LIFECYCLE.md](docs/LIFECYCLE.md) | Agent / buyer / platform journey coverage, friction removed, what is deferred |
| [bridge/baileys/README.md](bridge/baileys/README.md) | Testing with a real WhatsApp number (Baileys) |

---

## What agents and buyers get

- **Look:** forest green on warm paper, DM Sans (self-hosted), rounded surfaces, automatic **dark mode**, motion throughout (page entrances, sheets, press feedback), a branded welcome screen and loading skeletons. Design plan and history: [docs/UI_REDESIGN_PLAN.md](docs/UI_REDESIGN_PLAN.md).
- **Buyer property page:** hero photos, overlapping summary card, pinned section tabs, EMI and total cost, **neighbourhood** (nearby schools, hospitals, shops, parks and transport with drive/walk times, a rings diagram, and "How far is your place?"), visit booking, ask, save, share.
- **Collections:** like / not for me, rank, compare, progress, top-picks on WhatsApp. **Agent website** with filters and "Save contact".
- **Agent app:** Today screen with "Needs attention", buyers with intent and next action, listing editor with a **listing-strength** meter, **WhatsApp Status image** and **copy-for-portals** per listing, today's **visit route** in Google Maps, branding with live preview.

Neighbourhood data comes from OpenStreetMap through Photon (free). It is computed in a background job when a listing is published or edited and cached on the property, so buyer pages make no map calls. Set `NEARBY_PROVIDER=off` to disable it (tests do this). Area-only listings show rounded distances and quantised directions so the building can't be pinpointed.

## Run it on your laptop (Windows 11)

**Install once:** [Node.js 22 LTS](https://nodejs.org), [Git](https://git-scm.com), and [PostgreSQL 16](https://www.postgresql.org/download/windows/) (remember the password you set for user `postgres`).

```powershell
git clone https://github.com/techtwister007/middle_Screen.git proppulse
cd proppulse
git checkout property-listing-app
npm install
copy .env.example .env
```

Create the database (PowerShell, uses the password you chose while installing PostgreSQL):

```powershell
psql -U postgres -c "CREATE USER pp WITH PASSWORD 'pp' SUPERUSER;"
psql -U postgres -c "CREATE DATABASE proppulse OWNER pp;"
```

> Prefer not to install PostgreSQL? Create a free Supabase project and put its connection string in `DATABASE_URL` instead.

Then:

```powershell
npm run db:migrate      # create tables
npm run dev             # http://localhost:3000
npm run db:seed         # (second terminal) demo agent with 4 listings, leads & shares
```

| Open | What |
|---|---|
| http://localhost:3000 | Landing page |
| http://localhost:3000/app/login → *Developer login* → `9800000001` | Agent dashboard (demo agent) |
| http://localhost:3000/admin (password `admin` from `.env`) | Admin panel |
| http://localhost:3000/admin/whatsapp | **WhatsApp simulator** — chat with the bot as any number |

Everything works with **zero accounts and zero keys**:

* WhatsApp → simulator (`WA_PROVIDER=console`); switch to Baileys or Chatsync later.
* AI → built-in rule-based parser (English/Hinglish). Add a free Groq key for voice notes + better descriptions.
* Storage → local `./storage` folder. R2 in production.
* Payments → simulated checkout. Razorpay test keys later.

### Try the core flow in 2 minutes (simulator)

1. `/admin/whatsapp` → phone `919800000009` → send `hi`, your name, `skip`, `skip`, `yes`.
2. Attach 2–3 photos (📷 button), then type `3 BHK flat in Gotri Vadodara 1450 sqft furnished 95 lakh`, then `done`, then `1`.
3. Type `share <REF> to Rahul 9876543210` → open the personal link in another browser → tap ♥, *Book site visit*.
4. Log in as that agent (Developer login → `9800000009`) → see the alert, the lead, the visit request.

---

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on :3000 |
| `npm run build && npm start` | Production build & server |
| `npm run typecheck` | TypeScript check |
| `npm test` | Unit tests (Vitest) — parser, intent, matching, billing, privacy |
| `npm run test:e2e` | Full end-to-end browser tests (Playwright) — builds first, uses `proppulse_test` DB |
| `npm run db:generate` | Create a migration after editing `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Demo data (app must be running) |
| `npm run keys:vapid` | Generate keys for free push notifications |
| `npm run backup` | Export all tables to `./backups/<date>/` (JSON) |

**E2E setup on your laptop (once):** `psql -U postgres -c "CREATE DATABASE proppulse_test OWNER pp;"` and `npx playwright install chromium`.

---

## Tech stack (all free tiers)

Next.js 15 (App Router, TypeScript, Tailwind 4) · PostgreSQL + Drizzle ORM · Cloudflare R2 · any OpenAI-compatible AI (Groq) · Web Push · Razorpay + manual UPI · WhatsApp via Baileys (test) / Chatsync (production).

## Project layout

```
src/
  config/        brand.ts (name/colours — rename here), env.ts (all settings, validated)
  db/            schema.ts (all tables), index.ts (connection)
  lib/           ai/ (parser + OpenAI-compatible client), wa/ (WhatsApp providers), storage/ (local | R2),
                 auth/ (sessions, magic links), images.ts (resize/watermark), push.ts, phone.ts, format.ts
  modules/       business logic — agents, listings, media, drafts, leads, shares, tracking, buyer, visits,
                 collections, matching, billing, notify, verify, jobs, bot/ (WhatsApp assistant)
  app/           routes — / (landing), /app (agent dashboard), /admin, /p /c /[handle] (buyer pages), /api
  components/    ui.tsx, buyer/ (property & collection pages), app/ (dashboard widgets)
drizzle/         SQL migrations
bridge/baileys/  laptop WhatsApp bridge for testing
scripts/         migrate, seed, backup, vapid
tests/           unit/ (Vitest), e2e/ (Playwright)
```
