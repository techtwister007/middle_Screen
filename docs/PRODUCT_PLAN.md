# PropPulse by VectorScale — Final Product Plan (v3)

> **Status:** ✅ built (all milestones M0–M6). See README.md to run it, docs/DEPLOYMENT.md to go live.
> **Working name:** *PropPulse*. Changeable at any time (see §2). A product of **VectorScale**.

---

## 1. Product in one paragraph

A WhatsApp-first sales assistant for real estate agents. The agent forwards a property's photos, videos and a voice note to our WhatsApp number and gets back a beautiful, agent-branded property link in about a minute. The agent shares that link to a specific buyer in one tap. From then on the app shows who opened it, what they liked, who saved it and who wants a site visit. It tells the agent when to call, and it runs inventory, leads, follow-ups and visits, mostly from WhatsApp.

**Pitch:** *"Other apps make your property look good. PropPulse tells you which buyer is ready to visit."*

**Price:** first month free, then **₹500/month** for the pilot (₹500–1,000 later).

---

## 2. Branding and name: changeable later

- The product name, tagline, colours, logo, company name ("VectorScale") and domain all come from **one config file** (`src/config/brand.ts`) plus env vars. Nothing is hard-coded in pages, bot messages or emails.
- Renaming = edit config + add the new subdomain to the same Vercel project.
- **Old links never break:** short codes (`/p/a82k`) are domain-independent. When the domain changes, the old subdomain stays attached as an alias that redirects to the new one, forever.
- Every page footer says *"Powered by {Product} · a VectorScale product"*: small and unobtrusive on buyer pages.

---

## 3. Hosting layout on `vectorscale.in`

Each VectorScale product owns **one subdomain**. Everything for that product is a path under it, so future products stay fully separate.

| URL | Purpose |
|---|---|
| `vectorscale.in` | VectorScale agency website (separate project, untouched) |
| `proppulse.vectorscale.in` | Product landing page (sell to agents) |
| `…/app` | Agent dashboard (installable PWA) |
| `…/p/{code}` | Property link (per-lead or general) |
| `…/c/{code}` | Collection link |
| `…/{agent-handle}` | Agent's own website |
| `…/admin` | Your admin panel (protected) |
| `…/api/*` | API, WhatsApp webhook, Razorpay webhook, cron endpoints |

**Per-product isolation:** a separate Vercel project, database, R2 bucket, env vars/keys, WhatsApp number and repo branch.

---

## 4. Stakeholder promises

### Agent Promise (shown at onboarding, in the dashboard footer and on the pricing page)
> **Your buyers are yours. Always.**
> 1. We never contact your buyers for marketing, never sell or share their numbers, never show them other agents' properties.
> 2. Your pages show only **your** name, phone and WhatsApp.
> 3. Owner details, exact address and unit number are never shown unless you choose to.
> 4. Your leads and notes are visible only to you.
> 5. In any future network, enquiries for your listing always go to you.

### Buyer promise
No login, no app, fast. Your details go only to the agent who shared the link.

### Platform (VectorScale)
A structured property, agent and demand database built from day 1. Aggregated and anonymised for future market intelligence and the aggregator. Agents opt in once at signup for network listing (default ON) and can mark any listing private.

---

## 5. Features (pilot scope)

### 5.1 Agent onboarding (under 2 minutes, on WhatsApp)
`hi` → name → company (optional) → photo/logo (optional) → accept the Agent Promise + network opt-in → **30-day trial starts** → dashboard magic link sent. A web signup exists too (enter mobile, then confirm via WhatsApp).

### 5.2 Listing creation
- **WhatsApp:** forward photos/videos/YouTube links + a voice note or text. The batch closes on *done* or after 10 minutes of silence. The AI drafts the listing and the bot replies **once** with a preview link + `1 Publish · 2 Edit · 3 Discard`.
- **Web:** one-page form; drag-drop media (compressed in the browser, uploaded straight to storage).
- **AI** (OpenAI-compatible API): transcribes the voice (Hindi/Gujarati/Hinglish/English), extracts fields, writes an English title + description, and flags missing fields. **Never invents specs.**
- **Property types:** Flat, Villa/House, Plot, Shop/Office, Rental, PG. Each has its own fields.
- **Price modes:** exact / range / "on request" + negotiable flag. Sale or rent (rent + deposit).
- **Location privacy:** exact pin / area only (default) / hidden. Building and unit are hidden by default.
- **Watermark:** agent name/logo on photos (default ON).
- **Video:** upload (max ~50 MB) or YouTube link.
- **Status:** available / on hold / sold / rented. Price edits keep the same link.
- Every 30 days the bot asks "still available?" and a one-tap reply refreshes it. Otherwise the listing shows *"availability being confirmed"*.

### 5.3 Buyer property page
- Rich WhatsApp preview (photo, title, price, agent)
- Welcome mode: none / minimal header (default) / branded splash (≤1.5 s, skippable)
- Full-screen swipe gallery, video, key specs, description, amenities, location per privacy setting
- Sticky **Call / WhatsApp agent** buttons
- **♥ Save · Ask a question · Request site visit** (Today / Tomorrow / date + morning/afternoon/evening) · **Share with family**
- Identity asked only on these actions:
  - per-lead link → already known
  - otherwise **"Confirm on WhatsApp"** (verified number, free) or a name + mobile form
  - one-line consent: *"Shared only with {Agent}."*
- Sold listing: shows *Sold*, plus "See other properties from {Agent}"

### 5.4 Collections
The agent selects 2–10 listings for one buyer and gets one link. The buyer can ♥/👎, rank, compare 2–3 side by side, and request visits for several properties.

### 5.5 Agent website
`…/{handle}`: photo, logo, tagline, areas served, all public live listings with filters, call/WhatsApp, QR code for visiting cards.

### 5.6 Sharing and tracking
- Share → "With whom?" Pick a lead or type name + number → unique short link + `wa.me` message, sent from the agent's **own** WhatsApp in one tap.
- Events: open, gallery view, video play, time on page, save, ask, visit request, share, revisit, open on a new device.
- Dashboard labels stay honest: *Opened via Rahul's link* / *Verified +91…* / *Anonymous viewer*.
- **Intent badge** with visible reasons: Exploring → Interested → Hot (e.g. "3 visits + saved").

### 5.7 Lead CRM (simple, activity-first)
- Lead list filtered by: New / Interested / Hot / Visit / Closed / Lost
- Lead profile: requirement (budget, areas, config, buy/rent, timeline), properties shared + their reaction, timeline, notes (typed or voice), follow-up date
- **Requirement matching:** a new listing that matches saved requirements triggers "2 buyers match — share?" (rule-based filter)
- Add a lead: from the share flow, manually, or by forwarding a contact card to the bot

### 5.8 Site visits
Buyer request → agent gets an alert → one-tap **Confirm / Reschedule / Decline** → visit day reminder → after the visit, a quick "How did it go?" (liked / not / negotiating) updates the lead.

### 5.9 Daily habit layer
- **Home screen:** today's visits, hot leads, follow-ups due, recent activity
- **Push alerts** (free web push), meaningful events only: first open, save, question, visit request, hot lead
- **Weekly value report:** "42 views · 6 saves · 3 visits · most-loved: Gotri 3BHK" (in-app, plus WhatsApp if the agent chatted with the bot in the last 24 h)

### 5.10 WhatsApp bot commands (plain words, typos tolerated)
| Agent types | Bot does |
|---|---|
| *(media)* … `done` | Creates a draft listing |
| `2bhk gotri under 60L` | Searches own inventory, replies with a list + one collection link |
| `share A82K to Rahul 98xxxxxxx` | Creates the lead (if new) + per-lead link + ready message |
| `sold A82K` / `available A82K` / `price A82K 92L` | Updates the listing |
| `leads` / `today` | Hot leads / today's visits and follow-ups |
| `link` | Dashboard magic login link |
| `help` | Menu |

### 5.11 Billing
- **Trial:** 30 days, full features, no card.
- **Plan:** Pro ₹500/month (amount from config; ₹500–1,000 later). Quarterly/annual optional.
- **Razorpay** (Subscriptions or Payment Links): auto-renew. The webhook activates or extends the plan.
- **Manual UPI:** shows the VectorScale UPI QR/ID. The agent pays and enters the UTR/reference. **You confirm in `/admin`** and the plan extends. An invoice/receipt is generated either way.
- **Reminders** at 7 days, 3 days and 1 day before expiry (in-app + bot reply).
- **When unpaid:**
  - 7-day grace
  - then the dashboard, bot and new listings are locked
  - existing buyer pages **stay live for 30 more days** (protects the agent's reputation) but tracking and alerts pause
  - after that, pages show the agent's contact card only
  - pay → everything returns instantly with full history

### 5.12 Admin (`/admin`, for you)
Agents (status, plan, trial end, usage), UPI payments to confirm, Razorpay payments, listings (disable/flag), abuse reports, feedback inbox, metrics (active agents, listings, shares, open rate, actions, visits), broadcast a notice to agents.

### 5.13 Trust, privacy, safety
Privacy notice + terms (VectorScale), buyer consent text, agent data export (CSV), buyer delete request, "Report listing" button, auto-expiry of stale listings, rate limits, no public listing of private items.

### Explicitly later (after pilot feedback)
PDF brochure, teams/brokerages, builder project pages, AI follow-up suggestions, custom agent domains, Hindi/Gujarati UI, duplicate-property detection, public aggregator, native apps.

---

## 6. Architecture

### 6.1 Stack (₹0 for the pilot except Razorpay's per-transaction fee and Chatsync fees)
| Layer | Choice | Free tier notes |
|---|---|---|
| App (pages, dashboard PWA, API) | **Next.js (App Router) + TypeScript + Tailwind** on **Vercel Hobby** | SSR for link previews. Note: Hobby is for non-commercial use; move to Vercel Pro ($20/mo) or Cloudflare when revenue starts. |
| Database | **Supabase Postgres** (free, 500 MB) + **Drizzle ORM** | Pauses after 7 days of zero activity (won't happen with daily use) |
| Media | **Cloudflare R2** + public CDN bucket | 10 GB free, zero bandwidth fees |
| Image processing | `sharp` in API routes (resize to 3 sizes + watermark) | — |
| AI | **Groq** (Whisper large-v3 + Llama) via OpenAI-compatible SDK; fallback Gemini. Configured by `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` | Free tier ample for 20 agents |
| Jobs and timers | Jobs table in Postgres; work runs right after the request (`after()`), plus **Supabase pg_cron → `/api/cron/*` every minute** for batch timeouts, reminders and retries | Vercel Hobby cron is only daily, hence pg_cron |
| Push | Web Push (VAPID) | Android: works directly. iPhone: after "Add to Home Screen". |
| WhatsApp (test) | **Baileys bridge** on your laptop | Spare SIM only |
| WhatsApp (prod) | **Chatsync** webhook → `/api/wa/chatsync` | Per-message fees, so one reply per batch |
| Payments | **Razorpay** (test mode during development) + manual UPI | ~2% per transaction, no monthly fee |
| DNS | Cloudflare (`proppulse` CNAME → Vercel) | — |
| Tests | Vitest (logic) + Playwright (end-to-end) | — |

### 6.2 What runs where
- **Cloud, 24×7:** everything buyers and agents touch, including AI processing. The laptop is **not** on the critical path.
- **Your laptop:** the Baileys bridge (testing only), weekly backup script (DB dump + R2 sync), local development.

### 6.3 WhatsApp design
- The bot's logic lives **in the cloud app** (`/api/wa/inbound`), independent of the provider.
- `BaileysBridge` (laptop): receives messages → uploads media → POSTs a normalised message to the app → sends the app's replies back.
- `ChatsyncAdapter` (cloud): converts Chatsync webhooks to the same normalised format and sends replies through the Chatsync API.
- Switching = set `WA_PROVIDER=chatsync` + number + keys. **No code change.**
- Buyer "Confirm on WhatsApp" uses the same number: the code in the message links the buyer's verified number to the session.

### 6.4 Data model (core tables)
| Table | Key fields |
|---|---|
| `agents` | id, phone (unique), name, company, handle, photo, logo, brand_colour, tagline, welcome_mode, network_opt_in, promise_accepted_at, status |
| `subscriptions` | agent_id, plan, status (trial/active/grace/locked), period_end, razorpay_sub_id |
| `payments` | agent_id, method (razorpay/upi), amount, utr/ref, status (pending/confirmed/failed), confirmed_by |
| `properties` | id, type, locality, city, lat/lng, building (private), unit (private) — the physical asset |
| `listings` | id, code, agent_id, property_id, purpose (sale/rent), title, description, price/min/max/mode, fields (JSON per type), location_privacy, status, visibility (private/network), verified_at |
| `media` | listing_id, kind (image/video/youtube/doc), url variants, order, section, hash |
| `drafts` | agent_id, incoming media + text/voice, state (collecting/processing/ready), ai_output |
| `leads` | agent_id, name, phone, verified, stage, source, requirement (JSON), next_follow_up |
| `shares` | code, agent_id, listing_id or collection_id, lead_id (nullable) |
| `collections` | code, agent_id, lead_id, title, listing ids + order |
| `sessions_buyer` | anonymous id, device, first share, linked lead |
| `events` | type, share_id, session_id, listing_id, lead_id, meta, ts |
| `buyer_actions` | save/rank/reaction/question per lead × listing |
| `visits` | lead, listing, requested slot, confirmed slot, status, outcome |
| `notes` | lead_id, text/voice, ts |
| `push_subs`, `jobs`, `feedback`, `reports`, `wa_messages` (log), `audit_log` | — |

Every query is scoped by `agent_id` (one agent can never read another's data).

---

## 7. Build plan (milestones)

Each milestone ends with something you can click and test.

| # | Milestone | Deliverable you test |
|---|---|---|
| **M0** | Foundation | Repo scaffold, brand config, DB schema, R2, deployed "hello" at `proppulse.vectorscale.in` |
| **M1** | Listings + buyer page | Dev login, web listing form, media upload/watermark, buyer page, WhatsApp previews, short links, agent website, branding settings |
| **M2** | WhatsApp bot (Baileys) | Onboarding, media batching, AI draft, publish/edit/discard, magic link, `sold/price/available` |
| **M3** | Share + track | Leads, per-lead links, `wa.me` send, event tracking, timeline, intent badge, save/ask/visit, Confirm-on-WhatsApp, collections + compare |
| **M4** | CRM + habit | Follow-ups, requirements + matching, visit flow, push alerts, home screen, weekly report, bot `search/leads/today/share` |
| **M5** | Billing + admin | Trial logic, Razorpay (test mode), UPI + admin confirm, reminders, lock/grace, admin panel, feedback, reports, privacy/terms, data export |
| **M6** | Hardening + pilot ready | Full E2E tests, mobile performance (fast on 4G), Chatsync adapter, backups, seed demo agent, landing page, onboarding script for agents |

Then: **pilot with 15–20 agents** for 4–6 weeks, with weekly feedback calls, and iterate.

### Testing plan
- Automated: unit tests (AI parsing, matching, billing state), Playwright (buyer page, share flow, dashboard, payments in Razorpay test mode)
- Manual: Baileys on a spare number. You plus 2–3 friendly agents run real listings before the pilot.
- Pilot metrics (in `/admin`): weekly active agents, bot commands/agent/week, shares, % opened, % with action, visits, trial→paid conversion

---

## 8. What I need from you (when we reach that milestone)
| When | Item |
|---|---|
| M0 | Free accounts: Vercel, Supabase, Cloudflare (with `vectorscale.in` DNS on it), Groq. You add the keys yourself in the dashboards/env, never paste them in chat. |
| M2 | Spare SIM/number for Baileys testing |
| M5 | Razorpay account (test keys first), VectorScale UPI ID/QR |
| M6 | Chatsync number + API credentials |

---

## 9. Risks and mitigations
| Risk | Mitigation |
|---|---|
| Baileys number banned | Spare SIM, low volume, testing only; production on Chatsync |
| Free-tier limits hit | Fine for 20 agents; storage watch in admin; upgrade path documented |
| Vercel Hobby non-commercial clause | Move to Pro or Cloudflare once paying agents start (₹0 until then) |
| AI misreads details | Agent always reviews before publish; missing fields flagged; never invents |
| Agents don't come back daily | Bot search + hot alerts + weekly value report; track usage; call inactive agents |
| Chatsync per-message cost | One reply per batch, push for alerts, no marketing templates |
| Privacy (DPDP) | Consent text, agent-scoped data, export/delete, privacy notice |
