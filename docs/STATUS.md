# Build status

Built in one pass per BUILD_PLAN.md (2026-10-11). Everything below runs locally against Postgres with fake WhatsApp/payments/AI providers.

## Done

- **Platform**: multi-tenant salons, staff roles, plans + feature switches, cost ledger, audit log, subdomain/custom-domain routing, demo salons that expire after 7 days.
- **Customer app** (`/s/<salon>`): 3 themes, phone-code login, designs gallery + moodboards + "surprise me", price builder, booking with deposits/waitlist/group bookings, appointments (+ calendar file), profile, rewards + scratch cards, invite + gift links, offers, contest voting, nail reveal + share kit, rating, private feedback, aftercare, chair mode (Wi-Fi, playlist), AI try-on (opt-in), PWA manifest + offline page, English/Hindi/Gujarati.
- **Studio** (`/studio/<salon>`): Today action feed + schedule, 60-second checkout, photo corner + share verification, customers + notes + follow-ups + one-tap WhatsApp, campaigns + festival packs + tracking links, insights + ROI story + health score, settings, check-in kiosk, TV display.
- **Console** (`/console`): salons list, onboarding form, per-salon controls and feature switches, demo presenter ("time machine") with live WhatsApp preview, ROI calculator.
- **Engine**: event bus on Payload Jobs, messaging policy (consent, caps, quiet journey), loyalty, referrals, reviews routing, segments, birthday rewards, refill reminders, owner summaries.
- **Quality**: 42 unit, 16 integration (incl. tenant isolation over all 30 salon collections), 6 browser tests; Biome, type checks, module-boundary checks; GitHub Actions CI; production build passes.

## Needs real accounts before going live

| Item | Env vars | Notes |
| --- | --- | --- |
| Supabase (Mumbai) | `DATABASE_URL`, `S3_*` | see docs/runbooks/deploy.md |
| WhatsApp BSP (Gupshup/Interakt/AiSensy) | `MESSAGING_PROVIDER=live`, `WHATSAPP_*` | templates in `packages/modules/src/messaging/templates.ts` must be submitted for approval |
| Razorpay partner account | `PAYMENTS_PROVIDER=live`, `RAZORPAY_*` | uses partner model (`X-Razorpay-Account`): confirm with Razorpay |
| AI image API (try-on) | `IMAGE_AI_URL`, `IMAGE_AI_KEY` | opt-in per salon |
| Google Wallet | `GOOGLE_WALLET_*` | optional loyalty pass |
| Domain + wildcard | `PUBLIC_URL`, `ROOT_DOMAIN` | Vercel nameservers for `*.domain` |

## Known gaps / to review

- Hindi and Gujarati message templates and UI strings are first drafts: get a native speaker to review.
- WhatsApp per-message prices in the cost ledger are estimates; update from your BSP's rate card.
- Share-kit images render text with system fonts; on Vercel add a bundled font if text looks plain.
- Demo designs are generated nail-art illustrations; replace with each salon's real photos at onboarding.
- Platform name is a placeholder ("Glow"): set `PLATFORM_NAME`.
