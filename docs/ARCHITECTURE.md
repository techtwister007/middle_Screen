# Architecture

## Principles
1. **Modular:** routes are thin; all business logic lives in `src/modules/*` (pure functions over the DB), so the
   web dashboard, the WhatsApp bot and the APIs reuse the same code.
2. **Provider-neutral:** WhatsApp (`console | baileys | chatsync`), storage (`local | s3/R2`) and AI (any
   OpenAI-compatible URL, or none) are swapped with env vars — no code changes.
3. **Agent Promise enforced in code:** buyer pages only ever receive `PublicListing` / `PublicAgent`
   (`src/modules/public.ts`), which never contain unit numbers, owner data or exact coordinates unless allowed.
   Every dashboard query is scoped by `agent_id`.
4. **Free-tier friendly:** no always-on worker. Background work is a Postgres job table, run right after requests
   (`after()`) and every minute by pg_cron → `/api/cron/tick`.
5. **Renamable:** product name / company / colours come from `src/config/brand.ts` + `NEXT_PUBLIC_*` env.

## Main flows

### Listing from WhatsApp
```
Agent → WhatsApp → provider webhook (/api/wa/chatsync | /api/wa/bridge/inbound | /api/dev/wa)
  → modules/bot.handleInbound
      media  → drafts.addDraftMedia → images.processImage (resize ×3, watermark, strip GPS) → storage
      text   → drafts.addDraftText
      "done" (or 10 min silence via jobs: finalize_draft)
             → drafts.finalizeDraft → ai.transcribe (voice) → ai.extractListing (AI or rule parser)
             → listings.createListing (status draft) → bot replies preview + 1/2/3
      "1"    → listings.publishListing → shares.generalListingShare (/p/code) → jobs: match_listing
```

### Sharing & tracking
```
Agent "share REF to Rahul 98…" / dashboard Share dialog
  → leads.findOrCreateLead → shares.leadShare  (personal code, one per listing×lead)
Buyer opens /p/{code}  (server-rendered, OG tags for WhatsApp preview)
  → client posts /api/t {open, gallery, video, dwell, …}
  → tracking.recordEvent → events row; first open → notify agent ("Rahul opened…")
                            → leads.refreshLeadIntent (transparent score + reasons) → "🔥 hot lead" alert
Buyer ♥ / ask / visit → /api/buyer → buyer.* → buyer_actions / questions / visits + notify
Anonymous viewer identifies → form (name+phone) or "Confirm with WhatsApp" (wa.me code → bot → verified phone)
  → buyer.identifyBuyer: links session → lead, back-fills earlier anonymous events
```

### Auth
* **Agents:** no passwords. *Continue with WhatsApp* shows `wa.me/BOT?text=LOGIN CODE`; when the bot receives it
  from a number, that browser (bound by cookie) is logged in. Magic links (`/app/auth?t=`) are sent by the bot.
  Sessions are signed JWT cookies (180 days).
* **Buyers:** anonymous `pp_sid` cookie; buyer sessions are keyed `sid:agentId` so agents never share buyer state.
* **Admin:** single password (`ADMIN_PASSWORD`) → signed cookie.

### Billing
`subscriptions.period_end` is the single source of truth. `billing.computeAccess()` derives:
`ok` → `grace` (7 d, everything works) → `locked` (30 d: dashboard/bot/tracking paused, buyer pages live) → `expired`
(pages show contact card). Razorpay (orders + checkout + webhook) or manual UPI (UTR → admin confirms) call
`billing.confirmPayment()` which extends `period_end` without losing remaining days.

## Data model (src/db/schema.ts)

| Table | Purpose |
|---|---|
| `agents` | Agent profile, branding, bot onboarding state |
| `subscriptions`, `payments` | Plan period & payment records (Razorpay / UPI / manual) |
| `properties` | Physical asset (locality, coords, private building/unit). Future: many listings per property (co-broking, dedupe) |
| `listings` | Agent's listing: price, fields (JSON per type), status, privacy, visibility, `ref` for bot commands |
| `media` | Images (3 sizes) & videos; owned by a listing or a WhatsApp draft |
| `drafts` | WhatsApp batch being collected (texts, voice notes, location) |
| `leads` | Agent-owned buyers: stage, requirement (JSON), follow-up, intent score |
| `shares` | Short links `/p/{code}`, `/c/{code}` — listing or collection, optionally for one lead |
| `collections` | Shortlists (ordered listing ids) |
| `buyer_sessions`, `events`, `buyer_actions` | Tracking: anonymous sessions, event stream, save/like/rank per listing |
| `questions`, `visits`, `notes` | CRM |
| `notifications`, `push_subscriptions` | Activity centre & web push |
| `wa_verifications`, `login_tokens` | WhatsApp-click verification, magic links |
| `wa_messages` | Message log + outbox for the Baileys bridge |
| `jobs` | Background queue |
| `feedback`, `reports`, `data_requests`, `announcements` | Ops & compliance |

The future aggregator reads `listings` with `visibility = 'network'` joined to `properties`, plus aggregated
`events` / `leads.requirement` — no schema change needed to start.

## Adding things
* **New bot command:** `src/modules/bot/index.ts` → `command()`; copy in `bot/messages.ts`.
* **New background task:** `registerJob("name", fn)` in `modules/job-handlers.ts`, `enqueue("name", payload)`.
* **New property field:** add to `ListingFields` in `schema.ts` (JSON — no migration), the editor
  (`app/app/(main)/properties/[id]/edit/Editor.tsx`), `keySpecs()` in `lib/format.ts`, and the AI prompt.
* **Schema change:** edit `schema.ts` → `npm run db:generate` → commit `drizzle/` → `npm run db:migrate`.
