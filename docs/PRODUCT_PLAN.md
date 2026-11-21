# Property Listing Platform — Product Plan (draft for discussion)

Status: **brainstorm / not frozen**. Nothing gets built until this is confirmed.

---

## 1. What we are building (one line)

A WhatsApp-first tool for real estate agents: the agent sends the property's photos, videos and a voice note.
They get back one short, branded, beautiful property link. Then they see exactly which buyer opened it, what that buyer liked and who wants a site visit.

> The microsite gets us adopted. The lead tracking makes agents stay. The data network is the long-term asset.

### Decisions already taken (from the ChatGPT chat)
| Question | Your answer | Final stance |
|---|---|---|
| Who owns the buyer? | Agent owns the lead; platform provides CRM + analytics | ✅ Keep |
| Listings into future aggregator? | Automatic, no consent each time | ✅ One-time opt-in at signup (single checkbox, default ON), per-listing "private" toggle. Private collections never go public. |
| How are listings created? | Both WhatsApp + dashboard | ✅ Keep — WhatsApp is the main path |
| Target customer | All | ⚠️ Architecture supports all; **pilot sells only to individual agents** (15–20). Teams/builders later. |
| Welcome screen | Agent name/photo/company | ✅ 3 modes: none / minimal header (default) / full branded splash (max ~1.5s, skippable) |
| Login | Second priority, seamless | ✅ Buyers never log in. Agents log in once via WhatsApp magic link. |
| Links | Short and beautiful | ✅ `domain/p/xxxx`, `/c/xxxx`, `/agentname` |

---

## 2. Gaps in the ChatGPT plan (and fixes)

ChatGPT did the strategy well but missed several real-world and practical issues.

### A. Real-world agent concerns it ignored
1. **The agent's fear of being bypassed.** Agents often hide the exact address or building, so the buyer or another broker can't reach the owner directly. This is the #1 reason an agent would refuse to share a "nice detailed page".
   - Fix: a location privacy setting per listing: *exact pin / area only (~500 m circle) / hidden*. Building name and flat number are optional and hidden by default.
2. **Watermarks.** Agents get photos from other brokers that carry those brokers' watermarks, and they want their own brand on their images.
   - Fix: auto-watermark with the agent's name/logo (toggle). Removing another broker's watermark is not offered.
3. **Co-broking.** Many listings are shared broker-to-broker, so a "one property, many agents" model matters from day 1. ChatGPT mentioned this but put it in later phases.
   - Fix: build the `Property` vs `Listing` split now (cheap to do now, very expensive later).
4. **Price display.** Exact / "₹90–95 L" range / "Price on request" / negotiable flag.
5. **Property types differ.** Flat, villa, plot, shop/office, rental, PG each need different fields (a plot has no BHK; a rental needs deposit and furnishing).
   - Fix: one listing schema with type-specific field sets.
6. **Language.** Voice notes will be in Gujarati, Hindi or Hinglish.
   - Fix: the AI extraction must handle these. The buyer page needs an English + Gujarati/Hindi toggle (phase 1.5).
7. **Shared numbers and phones.** Agents often run their business from a personal WhatsApp on a single phone.

### B. Technical gaps
1. **Grouping WhatsApp media into one listing.** An agent forwards 15 photos as 15 separate messages, so the bot has to know when one property ends.
   - Fix: a session approach. Media arriving within ~10 minutes counts as one draft. The bot replies "Got 15 photos, 2 videos. Send more or type *done*". Typing *new* starts the next property.
2. **WhatsApp compresses images** and limits video size (~16 MB through the API).
   - Fix: accept the quality. For better photos, the agent can upload them as "document" or through the web upload.
3. **Link previews.** The WhatsApp preview (photo, title, price) only works if the page is server-rendered with Open Graph tags. A pure client-side app breaks this, so it affects the stack choice.
4. **"Who opened it" really needs per-lead links.** A generic link only tells us "someone opened it".
   - Fix: when sharing, the agent picks or creates a lead and gets a unique link for that person. This is the single most important tracking mechanism, and it costs nothing.
5. **Capturing the buyer's number.** Opening a link reveals no number, and ChatGPT was right about that. With per-lead links, the agent already supplied the number. For forwarded or anonymous views, we ask for name + mobile only when the buyer saves, enquires or requests a visit. In the pilot this is unverified, since SMS OTP costs money. WhatsApp-click verification can come later.
6. **Storage blows up with videos.**
   - Fix: compress on upload (720p). Keep originals only on the laptop or not at all. Optionally allow a YouTube-unlisted link instead of upload.
7. **Notifications cost money on WhatsApp.** Messages we start outside the 24-hour window are paid templates. ChatGPT's "daily brief on WhatsApp" is not free.
   - Fix: use free **PWA web-push notifications** for agents. A WhatsApp message goes out only when the agent has messaged us in the last 24 hours (free service window).
8. **Duplicate detection** (same flat from 4 brokers): phase 2. For now, just store an image hash + rough location so we can do it later.

### C. Business and process gaps
1. **The MVP was too big for a free, solo build.** It is cut down in §5.
2. **Payments for the pilot:** manual UPI + a "plan" field set by admin. No payment gateway.
3. **Feedback loop for the pilot** (your goal): an in-app "Give feedback" button, a usage-metrics admin page and a weekly 10-minute call per agent.
4. **Privacy (DPDP Act):** short privacy notice and consent text on buyer forms, a delete-my-data request, and agent-scoped data access. This is cheap to add now and painful to retrofit.
5. **Abuse:** a "Report listing" button, admin can disable a listing or an agent, and listings auto-expire after X days unless re-verified.

---

## 3. The three journeys (final)

### Agent
1. **Onboard (under 2 min):** message our WhatsApp number "hi", give name, company (optional), photo or logo (optional). That's it. A web dashboard magic link arrives on WhatsApp.
2. **Create listing:** forward media and a voice note, then type *done*. AI drafts the listing. The bot sends back a preview link with options: **Publish / Edit / Discard**.
3. **Edit (if needed):** a one-page editor on the web. AI-filled fields are highlighted, and missing ones are flagged. The AI never invents specs.
4. **Share:** "Share with whom?" Pick an existing lead or type a name + number. That creates a unique short link and a ready-made WhatsApp message (`wa.me` deep link), so the agent taps once and it's sent from their own WhatsApp.
5. **Collections:** select 3–10 listings for one lead and share one link.
6. **Track:** the dashboard home answers "who needs my attention today". It shows a lead timeline: opened → viewed gallery → saved → site-visit request. Push notifications fire only for meaningful events: first open, save, enquiry, visit request.
7. **Manage:** listing status (available / sold / rented / on hold), price edits keep the same link, notes and follow-up date per lead, and site-visit confirm/reschedule.

### Buyer
1. Receives the WhatsApp message with a rich preview.
2. Opens it with no login and no app. It loads fast on 4G. They see the agent's header or splash.
3. Sees the gallery (sections), video, key specs, description, amenities, location (per privacy setting), agent call/WhatsApp buttons.
4. Actions: **Save ♥, Ask a question, Request site visit (Today / Tomorrow / Pick date + morning/afternoon/evening), Share with family**.
5. Collections: a list of properties, mark ♥ / 👎, rank them, compare 2–3 side by side.
6. Name + mobile are asked only on save, ask or visit, with a one-line consent: *"Shared with Sharma Properties only."*

### Us (platform)
- Every listing becomes a structured record (type, price, area, locality, config, amenities, media, agent).
- Every buyer action becomes an event tied to share → lead → agent.
- Locality and demand data is aggregated anonymously. This is the future aggregator asset.
- The admin panel (on laptop) covers agents, listings, usage, feedback and abuse reports.

---

## 4. Architecture — free, and only the 24×7 parts hosted

### What must be online 24×7 (cloud, free tier)
| Piece | Why always on | Free option |
|---|---|---|
| Buyer pages (`/p`, `/c`, agent profile) + link previews | Buyers open links anytime | Cloudflare Pages/Workers (SSR) or Vercel hobby |
| Event tracking + buyer forms API | Every open/save/visit request | Same Worker / API routes |
| Agent dashboard (web/PWA) | Agent checks anytime | Same app |
| Database | Everything | Supabase free (Postgres 500 MB) or Neon free |
| Media storage + CDN | Images/videos | Cloudflare R2 (10 GB free, no bandwidth fee) |
| WhatsApp webhook receiver (production) | Agent messages arrive anytime | Same API; just **stores** the media and queues a job |
| Push notifications | Alert agent | Web Push (free) |

### What can live on your laptop
| Piece | Why it's OK offline |
|---|---|
| **AI processing worker** (voice → text, extract details, sort photos, write description, compress video, watermark) | It pulls queued jobs when the laptop is on. Agents see "Draft processing…". |
| Baileys WhatsApp bot (testing only) | Testing doesn't need 24×7 |
| Admin panel + analytics/intelligence reports | Only you use it |
| Original-quality media backup | Not needed online |

⚠️ **Trade-off to accept:** if the laptop is off, new listings wait in the queue. Fallback: the agent can always fill the web form manually and publish instantly with no AI needed, so the product never fully blocks.

### AI at zero cost
- Speech-to-text: **Whisper (local, on laptop)** handles Hindi/Gujarati reasonably.
- Detail extraction + description: a free-tier hosted LLM API or a local model (Ollama). To decide based on your laptop's RAM/GPU.
- Photo sorting (living/kitchen/bedroom…): a small local vision model, or skip it in v1 and let the agent reorder by drag.

### WhatsApp
- **Testing:** Baileys (unofficial WhatsApp Web library) on a spare number. Risk: the number can get banned, so never use your main number.
- **Production:** your chosen provider at chatsyncs.com (to confirm what it is — see questions). Agent-initiated chats (service conversations) are free on the official API. Our proactive messages are paid templates, so we minimise them.
- Code has one `WhatsAppProvider` interface with two adapters (Baileys / production), so switching needs no rewrite.

### Data model (core entities)
`Agent` · `Brand` · `Property` (physical asset) · `Listing` (agent's version: price, media, status, privacy) · `Media` · `Lead` (agent-owned) · `Share` (listing/collection → lead, unique short code) · `Collection` · `Event` (open, view, save, ask, visit…) · `VisitRequest` · `Note` · `Feedback`

### Suggested stack
- **Next.js** (SSR for link previews, PWA for the agent dashboard) on Vercel/Cloudflare
- **Postgres** (Supabase/Neon) + **R2** for media
- **Python worker** on laptop (Whisper, LLM calls, image/video processing via ffmpeg/Pillow)
- **Node** WhatsApp bot (Baileys for test)

Only real cost: a **domain** (~₹800–1,200/year), unless chatsyncs.com is your own domain to use.

---

## 5. Pilot MVP scope (build → test → give to 15–20 agents)

**In**
- Agent onboarding via WhatsApp + magic-link login to the dashboard
- Create listing: WhatsApp media + voice note → AI draft, and a manual web form
- One-page listing editor, status, price edit, location privacy, watermark
- Branding: name, photo, logo, colour, welcome-screen mode
- Short links + rich WhatsApp previews
- Per-lead share links + `wa.me` one-tap send
- Collections (multi-property link) with ♥ / rank / compare
- Buyer: save, ask, site-visit request, share
- Lead list + lead timeline + notes + follow-up date
- Site visits: request → confirm/reschedule/complete
- Push notifications for key events
- Admin (laptop): agents, plans (manual UPI), listings, usage metrics, feedback, reports
- Feedback button, privacy notice, delete request

**Later (after pilot feedback)**
Teams/brokerages, builder project pages, PDF brochure, buyer requirement matching, AI follow-up suggestions, daily WhatsApp brief, OTP verification, custom domains, Gujarati/Hindi UI, duplicate detection, public aggregator, payment gateway, native apps.

### Pilot success metrics
- 15+ of 20 agents active weekly
- Listings created per agent per week
- % of shares opened, % with a save/ask/visit
- Visit requests per agent
- How many would pay ₹299–699/month at the end

---

## 6. Open questions for you
1. **"Ballies"** — is this **Baileys** (the free WhatsApp Web library)? I've assumed so.
2. **chatsyncs.com** — is it a WhatsApp API provider you'll use for production, or your own domain where the app will be hosted? This decides the short-link domain.
3. **Laptop specs** (RAM, GPU, OS)? This decides local AI vs a free API.
4. **Pilot city/area** — Vadodara?
5. **Buyer page language** for the pilot — English only OK?
6. **Video:** upload into our storage, or allow YouTube links to save space?
