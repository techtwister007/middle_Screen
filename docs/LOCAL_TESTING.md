# Test the whole product on your laptop (before creating any accounts)

Everything runs on your Windows laptop: app, database, real WhatsApp (Baileys), public HTTPS link for phones.
No Supabase / Vercel / Cloudflare account / Groq / Razorpay needed. Cost: ₹0.

```
 Your phone (agent)  ──WhatsApp──►  bot number (spare SIM, linked to laptop)
                                         │ Baileys bridge (bridge/baileys)
                                         ▼
 Laptop:  PostgreSQL  ◄──  PropPulse app (localhost:3000)  ◄── cloudflared tunnel ◄── buyer's phone opens https://xxxx.trycloudflare.com/p/…
```

## One-time setup (~20 min)

1. Install: **Node.js 22 LTS**, **Git**, **PostgreSQL 16** (note the `postgres` password), and the tunnel:
   ```powershell
   winget install --id Cloudflare.cloudflared
   ```
2. Get the code and install:
   ```powershell
   git clone https://github.com/techtwister007/middle_Screen.git proppulse
   cd proppulse
   git checkout property-listing-app
   npm install
   copy .env.example .env
   ```
3. Create the database:
   ```powershell
   psql -U postgres -c "CREATE USER pp WITH PASSWORD 'pp' SUPERUSER;"
   psql -U postgres -c "CREATE DATABASE proppulse OWNER pp;"
   ```
4. Edit `.env` (Notepad) — for local testing only these matter:
   ```
   WA_PROVIDER=baileys            # real WhatsApp  (or "console" to use the built-in simulator)
   WA_NUMBER=91XXXXXXXXXX         # the spare bot number, digits only
   BRIDGE_SECRET=pick-any-long-random-text
   ADMIN_PASSWORD=admin
   ```
   Optional: `AI_API_KEY=` a free Groq key → voice notes + nicer descriptions. Without it a built-in parser is used.
5. Bot WhatsApp number: spare SIM + **WhatsApp Business** app, profile name & photo set. See
   [bridge/baileys/README.md](../bridge/baileys/README.md) for how to keep it safe from blocks.
6. Bridge settings: `copy bridge\baileys\.env.example bridge\baileys\.env` and put the **same** `BRIDGE_SECRET`.

## Every time you test

```powershell
npm run local
```
This migrates the DB, builds the fast production version, opens a public HTTPS link (cloudflared), starts the
WhatsApp bridge, and prints all links. **First run only:** scan the QR shown in the terminal with the bot's
WhatsApp (Settings → Linked devices → Link a device). After that it reconnects by itself.

Variants: `npm run local -- --dev` (hot reload while editing) · `-- --lan` (no tunnel, phone on same Wi-Fi) · `-- --no-bridge`.

> The public link changes each time you start (free quick tunnel). Links shared in an earlier session stop
> working after a restart — fine for testing. Production uses the fixed `proppulse.vectorscale.in`.

## End-to-end test script (≈30 minutes, two phones)

Use **your phone as the agent** and **a second phone (family/friend) as the buyer**.

| # | Do | Expect |
|---|---|---|
| 1 | Agent phone: send `hi` to the bot number | Welcome → name → company → photo → promise → *You're all set* + dashboard link |
| 2 | Forward 3–4 property photos + a PDF floor plan, then type `3 BHK Gotri Vadodara 1450 sqft furnished` | One "Got it" reply only |
| 3 | Type `done` | "Creating your listing…" then *Draft ready* with **Missing: price** |
| 4 | Reply `92 lakh` | *Updated: price* |
| 5 | Reply `1` | *Live!* + link. Open it — photos, price, map, floor plan |
| 6 | Type `share REF` (the 5-letter ref), then send the buyer's **contact card** | Personal link + "Send on WhatsApp" link |
| 7 | Send that link to the buyer phone. Paste it in WhatsApp | Rich preview (photo, title, price) |
| 8 | Buyer: open it, swipe photos, tap ♥, *Ask* a question, *Book site visit* | Agent gets alerts in the dashboard (and push, if enabled) |
| 9 | Agent dashboard (link from step 1) → Home | "Needs your attention": visit request + question; lead shows 🔥 with reasons |
| 10 | Visits → *Confirm* | Buyer reloads the page → *Site visit confirmed* + *Add to calendar* |
| 11 | Lead page → *Reply on WhatsApp* to the question, add a note, set follow-up *Tomorrow* | Question shows ✓ Answered |
| 12 | Bot: `find 3bhk under 1cr`, `leads`, `today`, `price REF 90L` | Search results, top buyers, today's plan, price updated on the same link |
| 13 | Property → *Sold* → pick the buyer | Buyer page shows Sold + "want similar options?"; Insights: deals closed = 1 |
| 14 | Buyer: on the sold page, tap *want similar options?*, fill 2 BHK / budget | Agent alert "…is looking for…" with matches |
| 15 | Settings → billing → *Pay by UPI QR* → enter any 12-digit UTR | Admin (`/admin`) → Payments → Confirm → agent sees *Active until…* + Receipt |
| 16 | Enable alerts on the agent phone (banner on Home; iPhone: Add to Home Screen first) | Next buyer action pings the phone |
| 17 | Close the laptop lid / restart, run `npm run local` again | Bridge reconnects **without QR**; bot answers again |

Automated checks you can run any time (no phone needed):
```powershell
npm test               # unit tests
npm run test:e2e       # 37 browser end-to-end tests (needs: psql -U postgres -c "CREATE DATABASE proppulse_test OWNER pp;" and npx playwright install chromium)
npm run test:bridge    # WhatsApp bridge safety tests (app must be running with WA_PROVIDER=baileys)
```

## Fast on a modest laptop (i3)
* Use `npm run local` (production build) for testing — pages are ~10× faster than dev mode.
* Close other heavy apps; first build takes 1–2 min, later starts are quicker.
* Photos are processed once at upload; buyer pages serve small pre-resized WebP files.

## When you're happy
Create the accounts and follow [DEPLOYMENT.md](DEPLOYMENT.md). Nothing in the code changes — only `.env` values.
