# Property Listing Platform — Product Plan (v2, for discussion)

Status: **brainstorm, not frozen**. Nothing gets built until you confirm.
Product name: **TBD** (working name "the app"). Hosted at its own subdomain `{product}.vectorscale.in` (see §8).

---

## 1. What we are building

A WhatsApp-first sales assistant for real estate agents:
1. **Send** photos, videos and a voice note on WhatsApp, and get back a beautiful branded property link in about a minute.
2. **Share** it to a buyer in one tap, and see exactly what that buyer did with it.
3. **Run the whole day from it:** inventory, leads, follow-ups, site visits. It becomes the agent's "business in their pocket".

Price: **₹500–1,000/month**. At this price the agent must *see* value every day, not once.

### Decisions locked
| Topic | Decision |
|---|---|
| Lead ownership | Agent owns the lead. We provide CRM + analytics. |
| Aggregator | One-time opt-in at signup (default ON). Per-listing "private" toggle. Private collections never public. |
| Listing creation | WhatsApp (main) + web dashboard |
| Customers | Individual agents for the pilot. Architecture ready for teams/builders. |
| WhatsApp | **Baileys** for testing, **Chatsync** (official API provider) for production |
| AI | Online **OpenAI-compatible** provider (laptop is i3, no GPU). Free tiers first. |
| Language | English only for the pilot. The AI still understands Hindi/Gujarati/Hinglish voice and text. |
| Video | Upload (compressed) **or** YouTube link |
| Buyer login | Never required |
| Agent login | Once, via WhatsApp magic link. Stays logged in. |
| Pilot city | Any — see §9 |
| Pilot pricing | First month free, then ₹500/month (manual UPI) |
| Admin panel | Protected page inside the main app (`/admin`) |
| Chatsync costs | Platform fee + per-message fees, so the bot sends **one reply per batch** (not per photo), and alerts go via free web push, not WhatsApp |

---

## 2. Competitor check: PropSite (propsite.in)

What they offer (from their site):
- Send photos + text on WhatsApp, and a listing page is ready in ~1 minute
- Agent website at `yourname.propsite.in`, listing URLs like `/3-bhk-satellite`
- Full-screen gallery, PDF brochure, collections ("For Mr. Mehta · 3 homes")
- Buyer taps to WhatsApp/call the agent directly
- Hindi/Hinglish/English input becomes a clean English page
- "1,200+ brokers", first listing free. Pricing isn't public.

**What they do NOT show:** buyer tracking, a lead CRM, site-visit booking, follow-up reminders, lead timelines, inventory search on WhatsApp, or a co-broker network.

**Conclusion:** the listing page is now *table stakes*. It has to be as good and as fast as PropSite's, but it is not our reason to exist. **Our edge is everything that happens after the link is shared.** PropSite stops at "buyer reaches you". We tell the agent *who* is interested, *what* they liked, *when* to call and *what* to show next.

Our one-line pitch:
> "PropSite makes your property look good. We tell you which buyer is ready to visit."

---

## 3. Tracking: can we capture the buyer's number on click?

**No — technically impossible.** When someone taps a link inside WhatsApp, WhatsApp opens it in a browser and sends us **no phone number** and no WhatsApp identity. No website can read it, and this is by design.

What we do instead (all free):

| Method | What we get | When |
|---|---|---|
| **Per-lead link** (main method) | The agent picks or types the lead's name + number while sharing, so every open of that link is "Rahul opened it" | Always |
| **"Continue on WhatsApp" verification** | Buyer taps "Save / Get updates on WhatsApp". WhatsApp opens with a pre-filled message to our number (e.g. `SAVE A82K`), they press send, and we now have their **real, verified WhatsApp number**. Free (buyer-initiated chat). Replaces SMS OTP. | Anonymous/forwarded viewers who want to save or enquire |
| Form (name + mobile) | Unverified number | Site visit / question |
| Anonymous session | "Someone opened it" + what they viewed | Forwarded links |

Honest labelling in the dashboard: **"Opened via Rahul's link"** vs **"Verified: +91 98xxx"** vs **"Anonymous viewer"**.

Forwarded links count as a feature: if Rahul forwards to his wife, we show "Rahul's link opened on 2 devices". That signals family discussion and high intent.

---

## 4. The anti-bypass promise (shown everywhere, not hidden in T&C)

The agent's fear: *"If I share a nice page, the buyer or another broker will go to the owner directly, or your platform will steal my buyers."* We answer it with a written **Agent Promise**, shown at onboarding, in the dashboard footer and on the pricing page:

> **Your buyers are yours. Always.**
> 1. We never contact your buyers for marketing, never sell or share their numbers, never show them other agents' properties.
> 2. Your property pages show **only your** name, phone and WhatsApp. No "similar listings from others".
> 3. Owner details, exact address and flat number are **never shown** unless you choose to.
> 4. Your leads and notes are visible only to you. Not to other agents, not to builders.
> 5. Future network listings: any buyer enquiry always goes to **the listing agent**.

Product features that back the promise:
- **Location privacy per listing:** exact pin / area only (~500 m circle, default) / hidden
- Building name and unit number hidden by default
- **Auto-watermark** with the agent's name/logo on every photo
- Buyer page has no platform-brand links that lead the buyer away (only a tiny "Powered by" footer)
- Data export for the agent's own leads (builds trust; the DPDP Act expects it anyway)

---

## 5. Daily use + stickiness (why they pay ₹500–1,000 and never leave)

Stickiness must come from **value and accumulated history**, not from trapping data. Agents talk to each other, and a reputation for hostage-taking kills sales. These are the honest lock-ins:

### A. Natural lock-ins (switching cost grows every day)
1. **Every link they ever shared lives on our domain.** Hundreds of links sit in buyers' WhatsApp chats. If the agent leaves, those go dead. *This is the strongest lock-in, and it's built into the product.*
2. **Their agent website** `name.vectorscale.in` (or a custom domain later) goes on visiting cards, Instagram bio and WhatsApp status.
3. **Complete lead history:** every buyer, every property shown, every note, every visit, every follow-up. Rebuilding that elsewhere is impossible.
4. **Their entire inventory, organised:** all properties with media, status and price history in one searchable place, instead of scattered WhatsApp chats.
5. **Habit:** the daily routine runs through our bot (below).

### B. Daily-use features (dead simple, all from WhatsApp)
| Feature | What the agent does | Why it's daily |
|---|---|---|
| **Inventory search bot** ⭐ | Types "2bhk gotri under 60L" to our WhatsApp number. Bot replies with matching listings + one collection link to forward | Every time a client calls |
| **"Who's hot" alerts** | Push: "Rahul viewed Gotri flat 3× and saved it — call now" | Several times a day |
| **Morning summary** | Opens app/PWA: today's visits, hot leads, follow-ups due | Every morning |
| **Follow-up reminders** | "Call Priya today (you set this)" | Daily |
| **Site visit planner** | Buyer requests → agent confirms with one tap → reminder to both | Weekly+ |
| **Quick share** | Bot: "share A82K to Rahul" → per-lead link ready | Many times a day |
| **Mark sold/rented** | Bot: "sold A82K" → page shows *Sold*, removed from collections | Weekly |
| **Requirement matching** | Saves "Rahul: 3BHK, 80L–1Cr, Gotri". When a matching property is added: "2 buyers match — share?" | Every new listing |
| **Digital visiting card** | Agent profile page with all live listings + QR | Constant |
| **Weekly report** | "This week: 42 views, 6 saves, 3 visits. Most-loved: Gotri 3BHK" | Weekly — *this is the visible value that justifies the bill* |

### C. "See the value" moments (shown inside the app)
- After the first share: *"Rahul opened your property 4 minutes after you sent it."*
- Monthly: *"You shared 38 properties, 11 buyers engaged, 4 site visits came through the app."*
- Collection link: *"Priya ranked Vasna #1 — she's ready to visit."*

**Rule:** any feature that needs more than 2 taps or any typing beyond a short phrase goes to "later" or gets redesigned.

---

## 6. The three journeys (final)

### Agent
1. **Onboard (under 2 min):** message our WhatsApp "hi" → name → company (optional) → photo/logo (optional) → done. Accept the Agent Promise + network opt-in. Dashboard magic link arrives on WhatsApp.
2. **Create:** forward photos/videos/YouTube link + a voice note or text → type *done* (or a 10-minute silence closes the batch). The AI drafts it. The bot sends a preview with **Publish / Edit / Discard**.
3. **Edit (optional):** one-page web editor. AI-filled fields are highlighted, missing ones are flagged. The AI never invents specs.
4. **Share:** "Share with?" Pick or type a lead → per-lead short link + a ready `wa.me` message sent from *their own* WhatsApp in one tap.
5. **Collections:** pick 3–10 listings → one link for one buyer.
6. **Track + act:** hot-lead alerts, lead timeline, notes, follow-up date, visit confirm/reschedule/complete, feedback after the visit.
7. **Manage:** status (available / on hold / sold / rented), price change keeps the same link, 30-day "still available?" check (one-tap Yes on WhatsApp).

### Buyer
1. Gets a WhatsApp message with a rich preview (photo, title, price, agent name).
2. Opens it: no login, fast on 4G, agent header (or optional splash, max 1.5 s, skippable).
3. Gallery (full-screen swipe), video/YouTube, key specs, description, amenities, location (per privacy), call/WhatsApp agent.
4. Actions: **♥ Save · Ask · Request visit (Today / Tomorrow / Pick date + morning/afternoon/evening) · Share with family**.
5. Collections: ♥ / 👎, rank, compare 2–3 side by side.
6. Identity asked only when needed, with consent: *"Shared only with Sharma Properties."*

### Us (platform)
- Structured records for every property/listing (type, price, area, locality, config, amenities, media, agent)
- Every buyer action becomes an event: share → lead → agent
- Aggregated, anonymous locality/demand data feeds the future aggregator
- Admin (on laptop): agents, plans, payments (manual UPI), usage, feedback, reports

---

## 7. Gaps fixed vs the ChatGPT plan (summary)
1. Anti-bypass: location privacy, watermark, hidden unit number, written promise (§4)
2. Per-lead links + WhatsApp-click verification instead of paid OTP (§3)
3. Media batching on WhatsApp (*done* / 10-min window)
4. Server-rendered pages for WhatsApp link previews
5. Paid WhatsApp templates avoided: free web push + replies inside the 24-hour window
6. `Property` vs `Listing` split for co-broking from day 1
7. Type-specific fields (plot / flat / villa / shop / rental), price display modes
8. MVP cut to what a free, solo build can ship (§10)
9. Pilot ops: manual UPI, feedback button, usage metrics, weekly agent call

---

## 8. Architecture — free tier, only 24×7 parts hosted

Since AI runs on an online API, **the laptop is no longer on the critical path.** Listings get processed in the cloud even when your laptop is off.

### Hosted 24×7 (free)
| Piece | Free option |
|---|---|
| Buyer pages, agent site, dashboard (PWA), API, WhatsApp webhook | **Next.js on Vercel (Hobby)** — SSR for link previews, serverless functions for the API |
| Database | **Supabase free** (Postgres 500 MB; also file auth helpers) |
| Media storage + CDN | **Cloudflare R2** (10 GB free, zero bandwidth fees) |
| AI: voice → text | **Groq free tier** (Whisper large-v3, OpenAI-compatible) |
| AI: extract details + write description | Groq / Gemini OpenAI-compatible endpoint, free tier (swappable via `OPENAI_BASE_URL`) |
| Background jobs (AI processing, batching timeouts) | Supabase table queue + Vercel cron / Supabase pg_cron |
| Agent notifications | Web Push (free) |
| DNS | Cloudflare free (manages `vectorscale.in`) |

### On your laptop
| Piece | Why |
|---|---|
| **Baileys test bot** | Testing only. Use a spare SIM — it can get banned. |
| Admin panel | Only you use it (it can also just be a protected page in the main app — to decide) |
| Weekly DB + media backups | Safety |
| Heavy video re-compression (optional) | Only if uploaded videos are too big. Most videos come compressed from WhatsApp, or as YouTube links. |

### WhatsApp abstraction
One `WhatsAppProvider` interface with two adapters: `BaileysAdapter` (laptop, testing) and `ChatsyncAdapter` (webhook, production). Same bot logic, so the switch is a config change.

### Domain plan: one subdomain per product
`vectorscale.in` will host several products, so **each product owns exactly one subdomain** and everything for it lives under that subdomain as paths. Nothing is shared between products.

| URL | Use |
|---|---|
| `vectorscale.in` | Your agency website (separate, untouched) |
| `{product}.vectorscale.in` | Product landing page (for selling to agents) |
| `{product}.vectorscale.in/app` | Agent dashboard (PWA) |
| `{product}.vectorscale.in/p/a82k` | Short property link |
| `{product}.vectorscale.in/c/r7mk` | Collection link |
| `{product}.vectorscale.in/sharma` | Agent website |
| `{product}.vectorscale.in/admin` | Your admin panel (protected) |
| `{product}.vectorscale.in/api/...` | API + WhatsApp webhook |

Why paths and not `sharma.{product}.vectorscale.in`: free SSL certificates cover only one subdomain level, and a nested wildcard needs a paid certificate. Paths are free, short and clean.

**Per-product isolation (repeat for every future app):**
- Its own Vercel project, bound only to `{product}.vectorscale.in`
- Its own database project (note: Supabase free allows only **2 active projects per account**; future apps may use Neon free or a second account)
- Its own R2 bucket `{product}-media`, its own env vars, keys and WhatsApp number
- Its own repo/branch (this branch = this product)

Later: a short, product-branded domain (~₹200–800/yr) can be pointed at the same app. Old links keep working.

**Total cost for the pilot: ₹0** (domain already owned). Watch-outs: free-tier limits on AI calls/day and 10 GB of storage. Fine for 20 agents; revisit at ~100.

### Core data model
`Agent` · `Brand` · `Property` (physical asset) · `Listing` (agent's version: price, media, status, privacy) · `Media` · `Lead` (agent-owned) · `Requirement` · `Share` (listing/collection → lead, short code) · `Collection` · `Event` · `VisitRequest` · `Note` · `FollowUp` · `Feedback`

---

## 9. Does the pilot city matter?

For the **product: no**, it works anywhere. It matters for two things:
1. **The future aggregator/data network:** 20 agents in one city give dense, connected inventory (co-broking, demand by locality). 20 agents spread across India give scattered data with no network effect.
2. **Support and selling:** you can meet agents in person, watch them use it and fix issues fast.

→ Pick **the city where you can personally meet 15–20 agents**. Ideally most of them work in overlapping areas.

---

## 10. Pilot MVP scope

**Build now**
- WhatsApp bot: onboarding, media batching, *done*, publish/edit, share, search, sold/available commands
- AI draft from voice/text (Hindi/Gujarati/Hinglish in, English out). Manual web form as a fallback.
- One-page editor; status; price modes; location privacy; watermark; YouTube/video
- Branding: name, photo, logo, colour, welcome mode; agent website
- Short links + rich previews; per-lead shares; `wa.me` one-tap send
- Collections with ♥ / rank / compare
- Buyer: save, ask, visit request, share; WhatsApp-click verification
- Lead list, timeline, notes, follow-ups, requirements + matching (simple filters, not AI)
- Site visits: request → confirm/reschedule/complete → feedback
- Hot-lead push alerts, morning summary screen, weekly value report
- Agent Promise, privacy notice, data export/delete
- Admin: agents, plan/payment status (manual UPI), usage metrics, feedback, abuse reports

**Later**
PDF brochure, teams/brokerages, builder projects, AI follow-up suggestions, custom domains, Gujarati/Hindi UI, duplicate detection, public aggregator, payment gateway, native apps.

### Pilot success metrics
- 15+ of 20 agents active weekly
- Bot searches + shares per agent per week (the habit metric)
- % of shares opened, % with a save/ask/visit
- Visit requests per agent per month
- How many convert at ₹500–1,000/month

---

## 11. Still open
1. **Product name**: pick from the shortlist in chat (sets `{product}`).
2. Chatsync number: you will share it later. Development and testing proceed on Baileys meanwhile.
