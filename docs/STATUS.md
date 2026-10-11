# Build status

Everything below runs locally against Postgres with fake WhatsApp, SMS, payments and AI providers. Last full check: 2026-10-11.

## Built

**Customer app** (`/s/<salon>`, English / हिन्दी / ગુજરાતી on every screen)
- 3 themes; install prompt (Android and iOS hint); phone + one-time code login (SMS fallback if WhatsApp can't deliver)
- Designs gallery with save (heart) and "Saved" list, "surprise me", price builder, menu, AI try-on (opt-in)
- Booking with deposits, waitlist, "book with friends" group links; reschedule moves the same appointment; cancel/change cutoff
- Appointments list, My nails with refill progress per service, rewards + scratch cards + history, wallet entries
- Invite / gift a friend, offers, festival banner, contest voting, nail reveal with share kit and "+points" moment
- Rating, private feedback, aftercare tips, chair mode (Wi-Fi), download my data, delete my data
- Switched-off features are hidden and their pages return 404; paused salons show a "call us" page

**Studio** (`/studio/<salon>`, phone first)
- Today action feed + schedule, confirm, check out, no-show, "running late" message
- 60-second checkout, photo corner, share verification, weekly Instagram collage
- Customers: segments, search, notes, follow-ups, one-tap WhatsApp, "remind all due", CSV import (no messages sent) and export
- Campaigns: offers, festival packs, slot filler that picks the actual quietest window, tracking links
- Insights + ROI story; monthly ROI report on WhatsApp
- Settings: salon page & brand (theme, colours, logo, cover, hours, contact, Wi-Fi, languages), menu (one by one or paste a whole menu),
  gallery (upload, approve customer photos, feature), team (add staff with sign-in, bookable, deactivate), hours & time off,
  rules (deposits, refunds, change cutoff, rewards, message timing, caps), plan & billing (usage at cost), QR kit + printable posters
- Artist "My stats" (clients, revenue, rating, pre-book rate, portfolio); kiosk; TV display

**Console** (`/console`)
- Salons list, onboarding / demo builder (their menu, logo, photos, colour), feature switches, status, plan, theme
- Billing record per salon (price, setup fee, status, next bill, founding price, support minutes)
- Message log per salon (works with the fake provider, so journeys can be checked on any salon)
- Audit trail; audit-logged "open Studio" and full JSON data export
- Demo presenter with live WhatsApp preview, ROI calculator; demo salons only message the prospect's phone

**Engine**
- Event bus on Payload Jobs; refill journey; owner daily summary; alerts for new bookings, low ratings, customer cancellations, gallery submissions
- Loyalty, referrals, reviews routing (no gating, no review rewards), segments, birthdays
- Deposits refunded automatically (salon cancels, or customer cancels before the refund window)

**Quality**
- Unit: core 11, modules 28, themes 4, app 2. Integration (real Postgres): 26, including tenant isolation over every salon collection.
- Browser (Playwright): 17 across customer, studio, settings and console.
- Smoke crawler over every reachable page for four roles; Biome; type checks; module-boundary checks; GitHub Actions CI; production build.

## Needs real accounts before going live

| Item | Env vars | Notes |
| --- | --- | --- |
| Supabase (Mumbai) | `DATABASE_URL`, `S3_*` | see docs/runbooks/deploy.md |
| WhatsApp BSP | `MESSAGING_PROVIDER=live`, `WHATSAPP_*` | submit templates in `packages/modules/src/messaging/templates.ts` for approval |
| SMS (login code fallback) | `SMS_PROVIDER=msg91`, `SMS_API_KEY`, `SMS_TEMPLATE_ID` | needs a DLT-registered OTP template |
| Razorpay partner account | `PAYMENTS_PROVIDER=live`, `RAZORPAY_*` | payments and refunds act on the salon's own account (`X-Razorpay-Account`): confirm with Razorpay |
| AI image API (try-on) | `IMAGE_AI_URL`, `IMAGE_AI_KEY` | opt-in per salon |
| Google Wallet | `GOOGLE_WALLET_*` | optional loyalty pass |
| Domain + wildcard | `PUBLIC_URL`, `ROOT_DOMAIN` | Vercel nameservers for `*.domain` |

## Not built yet (deliberately left for after launch)

- Multiple branches per salon (`multiBranch` switch exists, no branch model)
- Custom per-salon theme editor (three built-in themes plus colours, logo and fonts cover pilots)
- Web push notifications (WhatsApp covers reminders); 2-factor login for platform admins
- Product analytics and error tracking (PostHog / Sentry): add keys and the SDKs when going live
- Embeddable booking widget / public API; automated subscription billing for salons (billing is recorded manually in the console)
- Journey timings per service (they are per salon today); console screens for festival packs, articles and photo frames (edit them in `/admin`)

## Known gaps to review

- Hindi and Gujarati wording is a careful first draft: have a native speaker review UI strings (`apps/platform/src/lib/i18n.ts`) and templates.
- Calendar (.ics) text and reward titles created by the engine are English only.
- WhatsApp and SMS prices in the cost ledger are estimates; set `WA_PRICE_*_PAISE` / `SMS_PRICE_PAISE` from your rate cards.
- Share-kit images use system fonts; on Vercel bundle a font if text looks plain.
- Demo designs are generated nail-art illustrations; use each salon's real photos at onboarding.
- Platform name is a placeholder ("Glow"): set `PLATFORM_NAME`.
