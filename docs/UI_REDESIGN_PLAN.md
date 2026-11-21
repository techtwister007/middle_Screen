# PropPulse UI/UX Redesign: Plan (v1, for review)

> Status: **proposal, no code changed yet.** Approve or adjust the decisions in §21. Build then follows the phases in §20.
> Written after a screen-by-screen review of the current app on a Pixel 7 (buyer page, collection, agent website, landing page, agent home, properties, editor, leads, lead detail) and a read of the code (`globals.css`, `brand.ts`, `agents` schema, `ProfileForm.tsx`, buyer components, bot commands).

---

## Part A: The lines we need to think along

1. **Stakeholders and what "professional" means to each:** buyer, agent, VectorScale/admin, prospective agent (landing page)
2. **Design principles and anti-"AI slop" rules:** the bar every screen is judged against
3. **Design system foundation:** tokens for colour, type, spacing, radius, elevation and motion; light and dark
4. **Theme engine:** Looks × Palettes × Mode; agent-wide vs per-listing; how it's stored and rendered fast
5. **Brand kit:** logo, photo, name, company, tagline, watermark, palette from logo
6. **Welcome (loading) screen and loading states:** customisable splash, skeletons, image blur-up
7. **Buyer surfaces:** property page, collection, agent website, sheets, gallery, sold/unavailable, **WhatsApp link preview**
8. **Agent app:** navigation, home, listings, editor, leads, lead detail, collections, visits, insights, settings, billing
9. **"See as buyer":** full visibility of exactly what the customer sees
10. **Motion system:** entry/exit, transitions, loading, micro-interactions, without bloat
11. **Depth, 3D and elevation:** where it adds polish and where it becomes a gimmick
12. **Zero-training UX:** self-explanatory screens, empty states, microcopy, first-run
13. **WhatsApp-first parity:** what the agent can do (login, manage, theme) without opening the app
14. **End-to-end SaaS automation:** signup to renewal with no manual steps
15. **Performance on 4G and low-end Android:** budgets and how we keep them
16. **Accessibility and contrast:** every look × palette × mode stays readable, enforced by tests
17. **Landing page and admin**
18. **Tooling:** design skills and references
19. **QA:** the visual test matrix, review checkpoints
20. **Phasing:** build order
21. **Decisions needed from you**

---

## Part B: Thinking each line through

### 1. Stakeholders

| Who | Sees | "Professional" means | Today's main failure |
|---|---|---|---|
| **Buyer** | WhatsApp preview → property / collection page → agent website | Feels like a premium property brochure from a serious agent; fast; obvious next step (WhatsApp / visit) | Generic card stack; awkward photo overlays; icon-only WhatsApp; cryptic `#` / ⚖ buttons; long scroll |
| **Agent** | Dashboard PWA + WhatsApp bot | "This makes *me* look good" + "I know who to call today" in under 5 seconds | Everything is a bordered white box with equal weight; the attention panel says "All caught up" while a buyer has just opened a link; long single-page editor; small tap targets |
| **Prospective agent** | Landing page | Instantly sees the beautiful output and the "who's ready to visit" power | Doesn't show the product's best asset: the buyer page in different looks |
| **VectorScale / admin** | `/admin` | Clean, fast, trustworthy ops | Functional but unstyled; lowest priority |

**Key insight:** the buyer's *first* impression is not our page. It is the **WhatsApp link preview card** (OG image). Today that's a plain photo. A designed, agent-branded preview card (photo + price + BHK + agent logo, in the agent's look) is the single highest-leverage visual change. It is seen by every buyer, in every chat, before they even tap.

### 2. Design principles and anti-slop rules

**Principles**
1. **Photos are the hero.** Real estate is visual; UI chrome recedes. Edge-to-edge images, minimal frames.
2. **One primary action per screen.** Everything else is visibly secondary.
3. **Hierarchy through type and space, not boxes.** Remove most borders; group by spacing and subtle surface changes.
4. **Agent brand first, ours last.** Buyer pages carry the agent's identity; "Powered by" stays tiny.
5. **Fast is a feature.** Nothing decorative may cost LCP or input latency on a ₹10k Android phone on 4G.
6. **Self-explanatory.** If it needs a tooltip to be understood, redesign it.
7. **Consistent.** One component library, one spacing scale, one motion language across buyer, agent and admin.

**Banned patterns** (the "AI slop" checklist every PR is checked against)
- Emoji as decoration in headings/UI copy ("Hello, Rakesh 👋", "All caught up ✨", "🔥 Hot" chip): replace with designed icons/badges
- Every section in an identical rounded white card with a 1px ring ("card soup")
- Purple/blue gradients, glows, glassmorphism everywhere, gradient text
- Generic centred hero + 3 feature cards on the landing page
- Icon-only buttons for important actions
- Grey drop shadows on everything; equal radius on everything
- Placeholder-ish copy ("Fastest way: …"), ALL CAPS labels everywhere, filler sentences
- Inconsistent capitalisation, mixed date formats (current `mm/dd/yyyy` picker), raw phone numbers

### 3. Design system foundation

Rebuild `src/components/ui.tsx` into a small, typed component library backed by **semantic CSS variables** (not hard-coded `stone-*` / `brand-*` classes). Every screen consumes tokens, so looks and dark mode are free once tokens switch.

**Token groups**
- **Colour (semantic):** `--bg`, `--surface-1/2/3` (elevation surfaces), `--text`, `--text-muted`, `--text-subtle`, `--border`, `--primary`, `--on-primary`, `--primary-soft`, `--accent`, `--success/--warning/--danger/--info` (+ `-soft`), `--focus`, `--scrim`
- **Typography:** `--font-display`, `--font-body`, `--font-num` (tabular figures for prices); a 7-step type scale (12/13/15/17/20/24/32 + display 40) with matched line-heights and tracking
- **Space:** 4-pt scale (4, 8, 12, 16, 20, 24, 32, 40, 56); screen gutter 16 px; section rhythm 32 px
- **Radius:** per-look scale (`--r-sm/md/lg/xl`, e.g. Minimal = 6/8/12, Bold = 12/16/24)
- **Elevation:** `--e0…--e4` (see §11)
- **Motion:** `--dur-fast 140ms`, `--dur 220ms`, `--dur-slow 360ms`, `--ease-out cubic-bezier(.22,1,.36,1)`, `--ease-in cubic-bezier(.4,0,1,1)`, `--spring` (CSS `linear()` approximation)

**Colour generation:** palettes are defined in **OKLCH**. From one seed colour we derive a 50–950 scale and pick `--on-primary` (white or near-black) by contrast ratio. Dark mode is *not* an inversion: it uses dark neutral surfaces (`oklch(18% …)`, tinted slightly with the palette hue), lighter primary tints, and replaces shadows with lighter surfaces.

**Components (one implementation, all looks):** Button (primary / secondary / ghost / danger; sizes; loading state), IconButton (always with an aria-label, ≥44 px), Input / Textarea / Select / PriceInput / PhoneInput / DateChips + Indian-format date picker, Chip / Segmented control, Card (only where grouping truly needs it), ListRow, Avatar, Badge / StatusPill, Sheet (bottom sheet with drag-to-close), Dialog, Toast with Undo, Tabs, Skeleton, EmptyState, Stat, ProgressRing, PhoneFrame (for previews), ThemeScope (applies a look + palette + mode to a subtree).

### 4. Theme engine (core of your request)

The agent chooses a theme in three independent layers, like choosing a phone theme:

```
Look      (layout + typography + shape personality)   e.g. Signature
Palette   (colours)                                     e.g. Emerald, or "From my logo", or custom
Mode      Light / Dark / Auto (follows buyer's phone)
```

**Proposed Looks (4 to start; each fully designed in light AND dark):**

| Look | Personality | Type | Layout signature | Good for |
|---|---|---|---|---|
| **Signature** (default) | Editorial, premium brochure | Serif display for title & price + clean sans body | Full-bleed hero with soft fade into content, large price, specs as an icon row, generous whitespace | Most agents; apartments & villas |
| **Minimal** | Quiet, Swiss, photo-only | Single sans family, light weights | Hairline dividers, no shadows, square-ish corners, monochrome UI, colour only on the main CTA | Agents who want "clean"; modern projects |
| **Luxe** | Dark-first, high-end | Elegant high-contrast serif + wide-tracked small caps labels | Cinematic hero, champagne/gold accents, slow refined motion | Luxury villas, premium projects, NRI buyers |
| **Bold** | Modern, energetic, confident | Geometric grotesk, heavy weights | Colour blocks, big numbers, chunky rounded cards, playful micro-motion | Rentals, younger agents, commercial |

Later candidates: *Classic* (traditional brokerage, structured) and *Heritage* (warm, ornamental Indian accents). Four looks × two modes = 8 fully QA'd variants, which is the realistic limit for doing them *properly* rather than "for name's sake".

**Palettes:** about 12 curated palettes, each tested in all looks and both modes (e.g. Emerald, Ocean, Royal Navy, Terracotta, Saffron, Plum, Forest, Graphite, Rose Gold, Teal, Sandstone, Midnight). Plus:
- **From my logo:** on logo upload, the server (sharp, already installed) extracts dominant colours and proposes 2–3 palettes.
- **Custom colour:** any hex. If it fails contrast, it is auto-adjusted (OKLCH lightness) and the agent sees "Adjusted slightly so text stays readable."

**Scope and inheritance**
```
Agent default theme  →  applies to every listing, collection, the agent website and the welcome screen
   └─ Listing override (optional) → "Use a different look for this property" (e.g. Luxe for one villa)
   └─ Collection: uses agent default (optional override later)
```
- Settings → **Appearance**: change once and it applies everywhere ("Applies to all 12 listings").
- Editor → **Appearance** section: "Same as my default" (default) or "Custom for this listing".
- "Reset all listings to my default" bulk action.

**Data model**
- `agents.theme jsonb`: `{ look, palette, customColor?, mode, density? }`. Migration maps the existing `brand_color` → `customColor`.
- `agents.welcome jsonb`: replaces `welcome_mode` (see §6).
- `listings.theme jsonb NULL`: null means inherit.
- `media.lqip text`, `media.dominant_color text`: generated during image processing for blur-up placeholders.

**Rendering (no flash, no extra JS)**
- The server resolves the effective theme and writes it on the page root: `<html data-look="signature" data-mode="dark" style="--seed: …">` plus precomputed palette variables. No client-side theme flash.
- `Auto` mode uses `@media (prefers-color-scheme)` purely in CSS.
- Each look = one CSS layer of token overrides + a handful of `data-look` structural variants. Only structural differences that CSS can't express (e.g. hero composition) get React variants. All looks share the same components, so fixes apply everywhere.
- Fonts are **self-hosted via `next/font`** (replaces today's render-blocking Google Fonts stylesheet). Only the active look's fonts load on a buyer page (≈2 files, subset, `font-display: swap`). Font choice must include the **₹ glyph** and have a Devanagari/Gujarati fallback path for later language support.

### 5. Brand kit

Settings → **Brand**, mirrored in onboarding and WhatsApp:
- Logo (with automatic background removal hint, light and dark logo variants; if only one is given we test contrast and add a subtle backing plate when needed)
- Profile photo (auto circular crop, face-centred)
- Display name, company, tagline, RERA number (adds trust), areas served, phone/WhatsApp
- Watermark style: off / name / logo; position; opacity. Rendered small in a corner, not as today's clipped pill.
- Live preview beside every field.

### 6. Welcome screen and loading states

**Welcome screen (agent-customisable)**

| Style | What the buyer sees (≤1.5 s, tap to skip, first visit only) |
|---|---|
| None | Straight to property |
| Minimal header | Agent bar only (today's default) |
| **Logo reveal** | Brand-colour (or dark) background, logo scales/fades in, name + tagline rise in, then cross-fades to the hero |
| **Cover** | The property's hero photo, darkened, with the agent's logo + "Presented by Rakesh Sharma" |
| **Personal greeting** | Per-lead links: "Hi Priya, here are the homes I picked for you", with the agent photo |

The agent can customise: style, background (brand colour / dark / photo), logo vs photo, greeting text (with `{buyer}` placeholder), and show once vs every time. Constraints: CSS-only animation, the hero image keeps loading underneath (no LCP penalty), and it respects reduced-motion (shows a static card for 600 ms instead).

**Loading states**
- `loading.tsx` skeletons for every route, shaped like the real layout, per look (no generic spinners)
- Image blur-up from `lqip` / dominant colour, then a 200 ms fade-in when loaded
- Buttons show inline spinners and stay the same width; optimistic UI for like/save/stage changes
- Agent app: top progress bar on navigation; pull-to-refresh on lists

### 7. Buyer surfaces

**Property page (`/p/[code]`), redesigned structure:**
1. Hero gallery: edge to edge, swipe, small caption chip, counter, corner watermark; tap opens a full-screen viewer with pinch-zoom
2. Status + type line, **title**, locality (tap → map)
3. **Price block:** large price, price/sq ft, EMI estimate, Negotiable badge
4. **Key facts:** 2×2 or 4-across icon grid (BHK, area, floor, furnishing), never wrapping awkwardly
5. Highlights (AI-extracted 3 bullet points), then description with "Read more"
6. Amenities as an icon grid, top 8 + "View all"
7. **Location:** static map preview (privacy-aware circle for "area only"), nearby landmarks later
8. Video / floor plan / brochure tiles
9. Agent card: photo, name, company, RERA, "Usually replies in X min"
10. "Not quite right? Tell me what you need" requirement capture
11. Footer: Report · Powered by

**Sticky action bar (redesigned):** `[ WhatsApp Rakesh ]` (primary, labelled) + `[ Book visit ]` (secondary) + overflow (Ask, Save, Share). It auto-hides while scrolling down and returns on scroll up; safe-area aware.

**Collection (`/c/[code]`):**
- Header: "Priya, 4 homes picked for you": agent photo + note as a quote
- Cards: shorter (4:3), swipeable photo strip inside each card, price + title + 3 facts, **Like / Not for me** as clear labelled buttons
- "Compare" becomes a selection mode ("Select 2–3 to compare") with a bottom tray; "Rank" becomes drag-to-reorder in a "My favourites" view, so there are no cryptic `#` / ⚖ icons
- Progress: "You've reviewed 2 of 4"
- Sticky: WhatsApp agent + "Book visits for my likes"

**Agent website (`/[handle]`):** hero with agent photo/cover, trust strip (years, deals, RERA), filters as sticky chips, listing grid (1-col mobile, 2-col tablet), testimonials later, QR + "Save contact" (vCard).

**WhatsApp preview (OG image), themed:** a 1200×630 card rendered with `next/og`: hero photo on one side, price / BHK / locality on the other, agent logo + name in the look's typography. Collections get a 2×2 photo mosaic + "4 homes for Priya".

**Sold / unavailable page:** dignified state ("This home has found its owner") + similar listings from the same agent, never a dead end.

### 8. Agent app

**Navigation (information architecture)**
```
Today   ·   Listings   ·   [ + ]   ·   Buyers   ·   More
```
- **Today:** what needs action now (the hub)
- **Listings:** properties + collections (segmented)
- **[ + ]:** centre action sheet: Add property · Share · New collection · Add buyer · "Send photos on WhatsApp"
- **Buyers** (renamed from "Leads", which agents rarely say): list + pipeline
- **More:** Visits, Insights, Appearance, Brand, Billing, Help

**Today (home)**
- Greeting (no emoji) + plan status if relevant
- **Action feed** of cards, newest/most urgent first: "Priya opened your shortlist · 2 min ago" → [WhatsApp] [Call]; "Visit at 5 pm · 3 BHK Gotri" → [Directions] [Confirm]; "2 buyers match your new listing" → [Share]
- Fixes today's bug where fresh activity doesn't reach "Needs your attention"
- Compact stats row (views, interested, visits this week) with sparkline; tap → Insights
- First-run checklist until complete (see §12)

**Listings:** large photo rows with status pill, views/likes counts, quick actions (Share · See as buyer · More); filters; search; swipe actions.

**Editor:** split into collapsible steps with a **completeness meter** and **auto-save**:
`Photos & video → Basics (type, sale/rent, BHK) → Price → Details → Location & privacy → Appearance → Visibility`
- Photo grid: big tiles, drag to reorder, long-press menu (Set cover, Rotate, Delete), ≥44 px targets; fixes today's ~20 px arrow buttons
- Placeholders shortened; help text below fields instead of truncated placeholders
- Sticky bottom bar: `See as buyer` · `Publish / Save`
- Smart defaults from the agent's history (city, furnishing, common amenities)

**Buyers list:** each row shows the interest signal (intent ring Exploring → Interested → Hot with the reason), the last property viewed, last activity time, and a one-tap WhatsApp button. Filter chips with a scroll fade hint.

**Buyer detail:**
- Header: name, formatted number, intent meter with reasons ("Opened shortlist · liked 2 · asked a question"), **one** stage control (removes today's duplicate badge + dropdown)
- Primary actions: WhatsApp · Call · Share more
- Tabs: **Activity** (timeline) · **Properties** (shared listings *and collections*, each with its reaction; fixes the bug where the opened shortlist doesn't appear) · **Notes** (typed/voice) · **Details** (requirement, contact)
- Follow-up: chips (Today eve, Tomorrow, 3 days, 1 week, Pick…) with an Indian-format date picker

**Collections, Visits, Insights, Settings, Billing:** the same system applied. Visits = agenda view by day with confirm/reschedule; Insights = honest charts (dataviz rules: one accent colour, direct labels); Billing = plan card + clear renew button + receipts.

**Agent app theming:** the app uses the **PropPulse product theme** with Light / Dark / Auto. The agent's palette appears inside previews and as a subtle accent option; the dashboard itself stays consistent and familiar.

### 9. "See as buyer"

- Available from: every listing row, the editor, collections, the Appearance studio, and Brand settings
- Opens the real buyer page in **preview mode** (signed, agent-only): no tracking events, no notifications, a slim banner "Preview, buyers don't see this bar" with toggles **Light / Dark**, **Look**, **Welcome screen replay**, and **WhatsApp preview** (shows the OG card as it appears in a chat bubble)
- **Appearance studio:** a live phone-frame preview of one of the agent's real listings; controls in a bottom sheet on mobile, side panel on desktop. Switching look/palette/mode animates in place. "Apply to all listings" / "Only this listing".

### 10. Motion system

**Rules** (Emil Kowalski-style principles)
- Animate only `transform` and `opacity` (plus `clip-path` sparingly); never layout properties
- Enter 200–260 ms ease-out; **exit faster** (140–180 ms ease-in); nothing over 400 ms except the welcome screen
- Motion explains *where things come from and go*; no decorative looping animation
- No animation on high-frequency actions (typing, rapid toggles)
- Interruptible (CSS transitions, not keyframes, for interactive elements)
- `prefers-reduced-motion`: replace movement with short fades
- Per look: Minimal = subtle/fast, Signature = smooth, Luxe = slower and refined, Bold = springy

**Where**
| Moment | Motion |
|---|---|
| Page enter | Content staggers up 8 px + fade (40 ms steps, max 5 items) |
| Route change (app) | View Transitions API cross-fade/slide (progressive enhancement; no-op on unsupported browsers) |
| Images | Blur-up → sharp fade; hero gets a gentle scale 1.04 → 1 |
| Bottom sheets / dialogs | Slide up with spring; scrim fade; drag-to-dismiss; exit faster |
| Like / save | Heart pop (scale 1 → 1.25 → 1) + soft haptic (`navigator.vibrate(8)` where supported) |
| Buttons | Press scale .97, release spring |
| Lists | New items slide in; removed items collapse + fade (with Undo toast) |
| Numbers | Stats count up once on first view |
| Tabs / segmented | Indicator slides between options |
| Accordions (editor) | Height via `interpolate-size` / grid-rows trick, no JS measuring |
| Publish success | Check-mark draw + confetti-free subtle burst of the brand colour |
| Welcome screen | §6 |
| Collection swipe | Card follows the finger with slight rotation; like/skip flies out |
| Scroll | Sticky bar hide/show; hero parallax via **CSS scroll-driven animations** (no JS; ignored where unsupported) |

**Budget:** all motion is CSS + ~3 KB of shared JS helpers. **No Framer Motion** (≈30–40 KB) on buyer pages.

### 11. Depth, 3D and elevation

**Elevation scale** (layered, colour-tinted shadows, not flat grey):
- `e0` flat · `e1` resting cards · `e2` raised (sticky bars, chips on photos) · `e3` sheets/popovers · `e4` dialogs
- Each level = 2–3 stacked shadows (tight contact shadow + soft ambient), tinted with the palette hue
- **Dark mode:** elevation = lighter surface (`surface-1…3`) + faint top highlight border; shadows nearly invisible there

**Tasteful 3D**
- Hero photo: subtle depth parallax on scroll (CSS only)
- Collection cards: stacked-deck depth on the first card + tilt while dragging
- Agent card / OG preview: slight perspective "floating card" in the Appearance studio and landing page
- Primary buttons: inner top highlight + press-down depth
- Landing page: phone mockup with real 3D perspective rotating between looks

**Avoided:** device-orientation tilt, heavy blur/glass on low-end phones (backdrop-filter only where cheap, with a solid fallback), WebGL/3D libraries.

### 12. Zero-training UX

- **Labels on every important action** (icon + word); icon-only only for universal ones (back, close, share)
- **Empty states teach:** each empty screen says what it is for, shows one example, and offers one button ("No buyers yet. Share a property and anyone who opens it appears here. [Share a property]")
- **First-run checklist** on Today: Add logo · Pick your look · Add first property · Share it with one buyer · Install app. Each step one tap, ticks animate, and the list disappears when done.
- **Progressive disclosure:** advanced fields hidden behind "More details"
- **Undo instead of "Are you sure?"** for reversible actions
- **Plain words:** Buyers, Visits, "Who opened", "Interested", "Ready to visit"; no jargon (CRM, lead stage, intent score)
- **Indian formats everywhere:** ₹ lakh/crore, dd MMM, 12-hour time, +91 98765 00001
- **Contextual one-time tips** (dismissible, max one per screen)
- **Buyer side:** no login, consent line on actions, every button self-describing
- Later: Hindi / Gujarati UI toggle (fonts chosen now to support it)

### 13. WhatsApp-first parity

Already works: login via WhatsApp (`login` / `link`), create listings from photos + voice, `share`, `sold` / `available` / `price`, `list`, `leads`, `today`, `find`, onboarding, billing.

**Add:**
| Agent sends | Bot does |
|---|---|
| a logo image with caption `logo` | Sets logo, suggests 3 palettes from it ("Reply 1/2/3") |
| a photo with caption `photo` | Sets profile photo |
| `name …` / `company …` / `tagline …` / `rera …` | Updates brand kit |
| `look` | "1 Signature · 2 Minimal · 3 Luxe · 4 Bold" with a preview link for each |
| `dark` / `light` / `auto` | Sets mode |
| `colour` | Palette options, or accepts a hex |
| `look A82K luxe` | Per-listing override |
| `preview A82K` | Sends the agent's own preview link (OG card unfurls in chat = instant visual check) |
| `welcome` | Welcome-screen options |
| `report` | This week's summary as a designed image card (rendered with `next/og`) |
| Morning digest (automatic, opt-in) | "Today: 2 visits, 3 buyers to call" with deep links |

Interactive buttons/lists when the provider supports them (Chatsync / Cloud API), with numbered replies as the fallback (Baileys).

### 14. End-to-end SaaS automation

Signup (WhatsApp or web) → **guided setup** (brand kit → pick look with live preview → first listing) → trial → reminders → auto-renew / UPI → grace → lock → recovery. This already exists in the backend; the gaps are mostly **UI surfacing**:
- Plan status banner + renew flow that's one tap
- Onboarding wizard rebuilt around the Appearance studio (the "wow" moment)
- Automatic OG images, LQIP, palette-from-logo, availability checks, weekly report: no manual steps
- Admin: automated dunning visibility, health metrics; manual UPI confirmation remains the only human step (by design)

### 15. Performance budget (buyer pages, Moto G-class device, slow 4G)

| Metric | Budget |
|---|---|
| LCP | < 2.5 s |
| CLS | < 0.05 |
| INP | < 200 ms |
| JS (gzip) on `/p` | < 90 KB total, motion helpers ≤ 3 KB |
| Fonts | ≤ 2 files, self-hosted, subset |
| Hero image | `sm/md/lg` WebP via `srcset`, preloaded, LQIP inline |

Theme CSS is server-selected, so no runtime theme JS. Lighthouse CI on buyer pages fails the build if budgets break.

### 16. Accessibility and contrast

- WCAG AA: 4.5:1 body text, 3:1 large text and UI boundaries, in **every** look × palette × mode
- The palette generator guarantees `--on-primary` contrast; custom colours are auto-corrected
- Text on photos always sits on a scrim gradient
- Tap targets ≥ 44 px, visible focus rings, labels on all inputs, `aria-live` for toasts
- Automated: axe-core `color-contrast` checks inside Playwright across the matrix (§19)

### 17. Landing page and admin

- **Landing:** lead with the output. An interactive phone mockup lets visitors switch looks (Signature → Minimal → Luxe → Bold, light/dark) on a real listing, then shows the "Priya opened your link" notification. Clear pricing, WhatsApp CTA, social proof. No generic 3-card feature grid.
- **Admin:** apply the design system + dark mode; data-dense tables; lowest priority.

### 18. Tooling: design skills and references

Your ChatGPT shortlist is sensible. Recommended use, each with one job:
| Skill | Job here |
|---|---|
| **Impeccable** | Critique each redesigned screen against the brief |
| **Unslop** | Gate: remove AI-looking patterns (§2 banned list) |
| **Taste** + Anthropic **Frontend Design** | Art direction for the 4 looks |
| **Emil Kowalski** | Motion and interaction details (§10) |
| **Vercel Web Interface Guidelines** | Final accessibility/interaction review |
| UI UX Pro Max | Optional: we already have a product and a token system planned, so lower value |

Approach: I review each skill's contents first (they are third-party code/instructions), then install them **into the project** (`.claude/skills/`) so they're versioned with the repo, rather than globally.

**References:** your Dribbble inspiration did **not** come through in the message (only the ChatGPT images arrived). Please re-attach the screenshots or paste the Dribbble links; they'll be used to shape the moodboard in Phase 0.

### 19. QA: visual test matrix

- **Playwright visual suite:** 4 looks × 2 modes × 3 stress palettes (very light e.g. saffron, very dark e.g. navy, mid e.g. emerald) × buyer screens (property, collection, website, welcome, sheets, sold) on Pixel 7 + iPhone SE (small) → screenshot baselines + axe contrast checks
- **Agent app:** every main screen × light/dark × Pixel 7
- Existing gates stay: `typecheck`, unit tests, all 32 E2E tests (selectors updated where markup changes)
- Low-end check: CPU-throttled (4×) + slow-4G profile for buyer pages
- **Your review checkpoints:** after Phase 0 (direction), Phase 2 (buyer pages) and Phase 4 (agent app), with a screenshot gallery page for each

### 20. Phasing

| Phase | Scope | Output / checkpoint |
|---|---|---|
| **0. Direction** | Collect your references; moodboard; **style tiles**: the property page rendered as static mockups in all 4 looks × light/dark | You pick and adjust looks before any real build |
| **1. Foundation** | Tokens, OKLCH palette generator + contrast guard, `next/font` self-hosting, elevation, motion primitives, component library, dark-mode infrastructure, theme resolver + DB migration (`agents.theme`, `agents.welcome`, `listings.theme`, `media.lqip`) | Component gallery page (all components, all looks, both modes) |
| **2. Buyer surfaces** | Property page, collection, agent website, sheets, gallery, sold/unavailable, welcome screens, skeletons, themed OG images | Checkpoint: screenshot matrix |
| **3. Customisation** | Appearance studio, Brand kit, per-listing override, welcome-screen editor, "See as buyer" preview mode, palette-from-logo, guided onboarding | Agents can theme everything centrally or per listing |
| **4. Agent app** | New navigation, Today feed, Listings, Editor (steps + auto-save), Buyers list/detail (+ bug fixes), Collections, Visits, Insights, Settings, Billing, light/dark | Checkpoint: screenshot matrix |
| **5. WhatsApp parity** | Brand/theme/preview/report commands, morning digest, interactive replies | Bot E2E tests |
| **6. Landing + admin** | Interactive look switcher landing; admin restyle | |
| **7. Hardening** | Full visual + a11y matrix, Lighthouse budgets, low-end device pass, polish sweep (Impeccable/Unslop review of every screen) | Release |

Every phase ends with typecheck + unit + E2E (+ new visual tests), then commit and push to `property-listing-app`.

### 21. Decisions (answered)

| # | Question | Decision |
|---|---|---|
| 1 | Inspiration | 6 Dribbble references received (analysed in §22); more may follow |
| 2 | Looks | **4 looks, each done in full detail:** Signature, Minimal, Luxe, Bold |
| 3 | Buyer dark mode | Default **Auto** (follows buyer's phone); Luxe defaults to Dark; agent can force Light/Dark |
| 4 | Agent app theming | **Fixed PropPulse product theme** with Light/Dark/Auto; the agent's palette appears in previews, their logo/avatar in the header. A consistent dashboard is easier to learn and support. |
| 5 | PropPulse brand | **Refresh** the product identity (logo, colour, type); 2–3 directions shown in Phase 0 |
| 6 | Design skills | Approved: review, then install into the project `.claude/skills/` |
| 7 | Leads → Buyers | Approved |

---

## Part C: Additions after your answers

### 22. What we take from the references (inspiration, not copies)

| Ref | What works | What we take | Goes into |
|---|---|---|---|
| **1. Warm peach, frosted** | Soft tinted background, frosted cards, a floating pill "dock" nav, very large numbers, one **black emphasis card** among light ones, interactive mortgage slider, agent "available to call" strip | Big-number price hierarchy; **interactive EMI calculator** (slider for down payment, tenure, rate) replacing today's static "EMI from" line; one high-contrast emphasis card per screen; floating dock nav | Bold look; property page; agent app nav |
| **2. Sage, soft** | Title set beside/over a cut-out hero, "Available" pill, icon spec tiles, **map with a named area polygon**, round arrow CTA, floating round dock | Area polygon map is exactly our **"area only" privacy mode** made beautiful; icon spec tiles; soft single-hue backgrounds | Signature look; location section |
| **3. Blue, conventional** | Very clear, scannable: image-left list rows, category icon row, labelled bottom nav, filter button by search | Information density and clarity for the **agent app** lists (Listings, Buyers); labelled nav (no icon-only) | Agent app |
| **4. Monochrome** | Full-bleed photo welcome with big confident type, **black pill buttons**, outline secondary pill, facility chips, agent mini-card with map snippet, sticky "Reserve visit" pill | Almost a direct definition of the **Minimal** look and the **Cover** welcome style; agent mini-card + map snippet | Minimal look; welcome screen; agent card |
| **5. Navy, hotel** | Title + **price tag overlaid on hero**, amenity icon row, photo preview strip, heart square + "Book" pill, 360° view | Hero overlay composition; amenity icon row; preview strip; 360° tour as a later feature | Signature & Luxe looks |
| **6. Findora** | **Logo badge on photo** + curved photo-to-white transition welcome, heavy "WELCOME" type, 2-column cards with price badge on image, **verified shield** | Curved-edge welcome; 2-col compact grid for the agent website; **"Verified" badge** (we already confirm availability every 30 days, so show it) | Welcome screen; agent website; trust badges |

**Important difference from the references:** they use perfect 3D renders. Our agents upload phone photos of mixed quality. So the design must make *ordinary photos look good*:
- Consistent aspect ratios and smart crop (centre of interest), never stretched
- Gentle automatic enhancement at upload (sharp: normalise levels, slight saturation/sharpen, auto-rotate); original kept
- Scrim gradients behind any text on photos
- Cover photo auto-chosen (brightest, widest, landscape) and changeable in one tap

**What we deliberately avoid:** heavy glass blur on low-end Android (we use solid tinted surfaces with a blur only where cheap), USD-style Western layouts that ignore lakh/crore, emoji in headings ("Let's start exploring 👋").

**Mapped to our 4 looks**
- **Signature:** refs 2 + 5 (overlay title/price on hero, soft single-hue surfaces, icon spec tiles, area map)
- **Minimal:** ref 4 (monochrome, black pills, big confident type, hairlines)
- **Luxe:** ref 5's depth, dark-first with champagne accents and serif type
- **Bold:** refs 1 + 6 (warm tints, rounded, big numbers, black emphasis card, heavy grotesk, floating dock)

### 23. Automatic logo and brand kit (no design skill needed)

Many agents have no logo. **Nothing should require one.**

**Flow:** the agent enters only their name (or company). A logo already exists.
1. On signup (web or WhatsApp) we generate a **monogram logo** from the name: "Sharma Properties" → **SP**, "Rakesh Sharma" → **RS**.
2. It is rendered as an **SVG** in the agent's palette and the look's typography, plus PNG versions (via sharp) for watermarks, WhatsApp previews and favicons.
3. **6 ready styles** to pick from in one tap: circle, rounded square, roof-line mark (a simple house-roof stroke over the initials), shield/crest, wordmark only, initials + full-name lockup.
4. It updates automatically when the name, palette or look changes, until the agent uploads their own logo (then theirs always wins; they can switch back any time).
5. Light and dark variants are generated automatically, so the logo is visible on every background.
6. Also generated from it: favicon / PWA icon for the agent website, the watermark, and the welcome-screen mark.

The same "auto first, customise later" idea is applied to the whole brand kit:
| Item | Automatic default | Agent can change |
|---|---|---|
| Logo | Monogram (above) | Upload / pick another style |
| Colours | Palette from logo, or a curated default | Pick palette / custom |
| Look | Signature | Any of 4, globally or per listing |
| Website link | From name (`/sharma-properties`) | Edit |
| Tagline | Suggested from city/areas: "Homes in Gotri & Alkapuri, Vadodara" | Edit |
| Name | From WhatsApp profile name where the provider sends it | Edit |
| Welcome screen | Logo reveal | Style, text, background |

### 24. Other ways to make things effortless

**For the agent: less typing, more done for them**
- **WhatsApp Status image (high value):** every new listing auto-gets a 9:16 story image in the agent's look (photo, price, BHK, area, logo, short link). Indian agents post listings on WhatsApp Status daily, so this is free reach for them and for us. Delivered via the bot ("Here's your Status image") and a Download button.
- **Digital visiting card:** auto-generated card image + vCard + QR for the agent website, ready to share or print.
- **Auto cover photo, auto enhancement, auto captions** (room type from AI where available), auto title/description (exists), auto highlights (3 bullets)
- **Smart defaults:** remembers the agent's city, common amenities, furnishing; repeat building → prefill floors/amenities
- **Ready share messages** in English or Hinglish, personalised with the buyer's name
- **Duplicate listing** ("Same building, different flat")
- **Bulk actions:** mark sold, change look, share several as a collection
- **Voice everywhere:** voice note → notes, follow-ups, listing edits ("price 92 lakh")
- **One-tap follow-up suggestions** after events ("Priya liked 2, send a visit slot?")
- **Brochure PDF** in the agent's look, auto-generated (already "later" in the product plan; the theme system makes it straightforward)

**For the buyer: zero friction**
- Opens instantly, no login; "Save contact" (vCard) of the agent
- Interactive EMI calculator
- Share with family in one tap (WhatsApp)
- Visit booking with quick slots (Today / Tomorrow / weekend)
- "Not right? Tell me what you need": a 3-tap requirement form

**For us: zero operations**
- All images, logos, story images and OG cards are generated automatically at upload/publish
- Onboarding needs only phone + name; everything else has a good default

### 25. Our branding on every page

One line only, in the footer of buyer pages and agent websites:

> with ❤ from **PropPulse**

- "PropPulse" = `brand.name` (renames automatically) and is a **link to our website** (`brand.companyUrl` / landing page), with `?ref={agent-handle}` added for attribution.
- Style: small, the look's muted text colour; the heart in the look's accent. Identical position in every look.
- Not on the WhatsApp preview card or the welcome screen (the agent's moment).
- Generated images (Status image, visiting card, brochure, greeting cards): the same line in tiny type in a corner.
- Growth loop: visitors arriving via `?ref=` see "Get a page like this free for 30 days"; referring agent earns a free month when the new agent pays.

### 26. Next steps

1. **Phase 0 starts:** review and install the design skills; product brand directions (2–3 options for PropPulse); static **style tiles** of the property page, collection card, welcome screen and WhatsApp preview card in the 4 looks × light/dark, plus 6 auto-logo samples.
2. Further Dribbble references you send are folded into the moodboard as they arrive.
3. You pick and adjust; then Phase 1 (foundation) begins.

---

## Part D: Final plan

### 27. Colour schemes inside each look

Every look ships with **8 colour schemes designed for that look** (not one generic palette list), each in **light and dark**. A scheme is more than one colour: it sets background tint, surfaces, primary, accent, emphasis-card colour and photo-scrim tint, so each one feels genuinely different.

| Look | 8 schemes |
|---|---|
| **Signature** | Emerald · Ocean · Terracotta · Plum · Sandstone · Slate · Forest · Rose |
| **Minimal** | Ink (pure mono) · Stone · Sage · Navy · Clay · Olive · Mocha · Graphite |
| **Luxe** | Champagne Gold · Rose Gold · Emerald & Gold · Sapphire · Onyx & Pearl · Bordeaux · Bronze · Platinum |
| **Bold** | Saffron · Coral · Electric Blue · Lime · Magenta · Tangerine · Teal Pop · Sunflower |

Plus, in every look: **From my logo** (auto-extracted) and **Custom colour** (auto-corrected for contrast).

**Variety:** 4 looks × 8 schemes × 2 modes = **64 built-in combinations**, plus logo/custom, for little extra effort, because schemes are only token sets on top of the same components.

**How the agent picks:** Appearance studio → Look (4 big preview cards) → Scheme (8 swatches under the chosen look, each swatch a mini preview) → Mode. The live phone preview updates instantly. "Apply to all listings" or "Only this listing". WhatsApp: `look`, `scheme`, `dark`/`light`.

**Quality guarantee:** all 64 are generated from OKLCH token definitions and checked by a **unit test** for WCAG contrast on every text/background pair (cheap, runs in CI). Screenshot tests sample each scheme once per look.

**Storage:** `theme = { look, scheme, mode, customColor? }` on the agent, optional override on a listing.

### 28. More quick wins (low effort, high value)

Effort: S = a few hours, M = about a day. All reuse what already exists (OG image rendering, AI, bot, tracking, billing).

**For agents**
| Feature | Why it matters | Effort |
|---|---|---|
| **Owner report link** | Share a read-only page with the property *owner*: views, interested buyers (anonymised), visits. Agents use it to win and keep mandates. | M |
| **Price-drop alert** | When the agent lowers a price: "Notify 3 buyers who liked this?" One tap sends personalised WhatsApp links. | S |
| **Copy for portals** | One tap copies a well-formatted listing text for 99acres / MagicBricks / Facebook / OLX | S |
| **"For Sale" board QR poster** | Printable A4 in the agent's look with a QR; scans tracked as source "Board" | S |
| **WhatsApp Status image** (§24) | Daily free promotion | S |
| **Festival greeting cards** | Diwali, Navratri, New Year… in the agent's brand, ready to forward to all contacts. Keeps them in buyers' minds; carries our footer. | S |
| **Visit-day route** | All today's visits in order as one Google Maps multi-stop link | S |
| **Listing quality tips** | "Add 3 more photos: listings with 8+ photos get more opens". Simple rules, shown in the editor and on Today. | S |
| **Calendar invites** | Confirmed visits as .ics, added to the phone calendar | S |
| **Duplicate listing** | "Same building, another flat" | S |
| **Reply templates** | Common replies (price, availability, visit slots) in English/Hinglish with the buyer's name filled in | S |
| **Testimonials** | After a deal closes, the buyer gets a one-tap review link; reviews show on the agent website | M |
| **Inactivity nudges** | Bot tip if no share in 3 days: "Gotri 3 BHK hasn't been shared; send to 2 matching buyers?" | S |

**For buyers**
| Feature | Why it matters | Effort |
|---|---|---|
| **Interactive EMI calculator** | Instant affordability | S |
| **Total cost estimate** | Price + stamp duty + registration (state table, starts with Gujarat) | S |
| **"Notify me if the price drops"** | Buyer value; gives the agent a warm, verified lead | S |
| **Read in Hindi / Gujarati** | One tap translates the description using the existing AI | S |
| **Download brochure (PDF)** | For family members who aren't on WhatsApp | M |
| **Save agent contact** | vCard | S |
| **Directions after visit confirmation** | Exact pin revealed only once the agent confirms (keeps privacy) | S |

**For us (PropPulse / VectorScale)**
| Feature | Why it matters | Effort |
|---|---|---|
| **"with ❤ from PropPulse" link + `?ref=`** | Visibility and attribution on every buyer page | S |
| **Referral month** | Agents bring agents | S |
| **Showcase gallery** | Opt-in real agent pages shown on the landing page as proof | S |
| **Churn early-warning in admin** | Agents inactive 7+ days flagged; bot nudges automatically | S |
| **Footer on generated images** | Every Status image, greeting card and brochure carries our name | S |
| **Monthly "your business" summary** | Value recap before renewal (opens, buyers, visits), which lowers churn | S |

Later (bigger): 360° tours, nearby-places map, locality demand insights, white-label upsell, custom domains.

### 29. Final phased plan

| Phase | What | Approval gate |
|---|---|---|
| **0. Prototype** *(next)* | One interactive prototype page (static HTML, separate from the app): switch **Look × Scheme × Mode** live and see the **welcome screen, property page, collection, WhatsApp preview card, Status image** in phone frames; **auto-logo** generator (6 styles, live from a typed name); the **"with ❤ from PropPulse"** footer; key **agent app** screens (Today, Buyer detail, Appearance studio) in light/dark; **3 PropPulse brand directions**; motion demos (entry/exit, sheet, like, skeleton). Built with **Sonnet** to save tokens; I review it against this plan before showing you. | **You approve / adjust** |
| 1. Foundation | Tokens, 4 looks × 8 schemes × 2 modes, contrast tests, self-hosted fonts, motion + elevation primitives, component library, theme resolver, DB migration, auto-logo generator | Component gallery |
| 2. Buyer surfaces | Property, collection, website, welcome, sheets, gallery, sold page, OG card, footer branding, EMI/total-cost | **Screenshot matrix review** |
| 3. Customisation | Appearance studio, brand kit, per-listing override, See as buyer, palette from logo, guided onboarding | |
| 4. Agent app | New nav, Today, Listings, Editor, Buyers, Collections, Visits, Insights, Settings, Billing; light/dark; bug fixes | **Screenshot matrix review** |
| 5. Quick wins | §28 S-items first, then M-items | |
| 6. WhatsApp parity | Brand/look/scheme/preview/report commands, digest | |
| 7. Landing + admin | Interactive look switcher landing, showcase, admin restyle | |
| 8. Hardening | Visual + a11y matrix, Lighthouse budgets, low-end Android pass, Impeccable/Unslop sweep | Release |

Every build phase: typecheck + unit + all E2E (+ new visual/contrast tests) → commit → push to `property-listing-app`.

---

## Part E: Location and neighbourhood intelligence

### 30. Why

For Indian buyers, *where* matters as much as *what*: school runs, parents' hospital access, office commute, daily needs, vastu. Today the page shows only "Gotri, Vadodara" + a Maps link. This section turns location into a visual, decision-making tool for buyers, a talking point for agents, and a differentiator for us.

### 31. Features (useful, not gimmicks)

**For buyers (on property and collection pages)**
| Feature | What the buyer sees | Value |
|---|---|---|
| **Nearby summary** | Icon tiles: "6 schools within 2 km · 3 hospitals · 11 daily-needs shops · 2 parks" | Instant feel of the area |
| **Nearest places ladder** | For each category the nearest 2–3 places: name, distance, drive / two-wheeler / walk time, a small relative-distance bar | Answers "how far is the school / hospital?" |
| **Radial rings diagram** | Home at centre, rings at 1/2/3 km, coloured dots per category, filter chips | Understand the neighbourhood at a glance, without a heavy map |
| **Add your place** | Buyer types office / child's school / parents' home → distance + times by car, two-wheeler, walk; saved as a chip ("Office · 18 min") | The most personal, decisive question; also a strong buying signal |
| **Commute compare** (collections) | Bars comparing drive time from the buyer's place to each home in the shortlist; shortest highlighted | Makes choosing between homes easy |
| **Transport** | Railway station, bus/BRTS stop, metro (where it exists), airport, highway access | Daily-life practicality |
| **Vastu compass** | Compass graphic showing main-door facing + sunrise direction ("East facing · morning sun in living room") | Very relevant to Indian buyers; uses the existing "facing" field |
| **Full map (on tap)** | Interactive map with category toggles, loaded only when tapped | Detail without slowing the page |

**For agents**
- **Auto-generated** at publish: zero work. The agent can hide categories, remove a wrong place, and **add landmarks** ("Opposite Gotri Lake", "5 min from upcoming metro station").
- **Location highlights** suggested for the description and for the Status image / brochure ("3 schools within 1 km").
- **Buyer insight:** when a buyer adds a place, the agent sees it on the buyer's profile ("Office: Alembic City · 18 min from Gotri 3 BHK"), shared with clear consent ("Only shared with Sharma Properties"). This makes better recommendations and better calls.
- **Smarter matching:** buyer requirement can include "within 20 min of my office"; matching ranks by commute.

**For us**
- Every listing gains structured neighbourhood data, which feeds the future locality-insights and aggregator plans.

**Later candidates:** drive-time zones ("15-min drive area"), upcoming-infrastructure tags curated by agents, locality price per sq ft from our own anonymised data, air quality, waterlogging reports. These are left out for now: the data is unreliable or not yet ours.

### 32. Visual design

- **Radial rings diagram** = pure SVG, themed by the look's tokens, works in light/dark, ~3 KB. This is the default visual, not a map.
- **Distance ladder** rows with icons and proportional bars (dataviz rules: one accent, direct labels).
- **Count tiles** in the look's tile style.
- **Commute compare** horizontal bars, shortest bar in the primary colour.
- **Compass** SVG with facing arrow and sun arc.
- **Full map** only on tap: MapLibre + free OpenFreeMap tiles, lazy-loaded (≈200 KB only for those who open it).
- Each look styles these differently (Minimal = hairline mono; Luxe = gold on dark; Bold = chunky coloured dots).

### 33. Data, cost and privacy

| Need | Source (pilot, ₹0) | Notes |
|---|---|---|
| Nearby places (schools, hospitals, shops, parks, transport) | **OpenStreetMap via Overpass API** | Free; attribution "© OpenStreetMap contributors" required; Indian tier-2 coverage is decent but incomplete, so agents can add/remove places |
| Travel times | **OpenRouteService** (free key) or self-hosted OSRM later; fallback straight-line × road factor labelled "approx." | Times are "typical, without traffic"; we say so |
| "Add your place" search | **Ola Maps** or **Mappls (MapmyIndia)** autocomplete (Indian address quality, free tiers) or Photon/Nominatim | Decision needed (§34) |
| Map tiles (on tap) | **OpenFreeMap** (no key, free) | |

- **Computed once at publish** (background job, cached in `listings.nearby jsonb`, refreshed monthly or when the pin moves). The buyer page makes **no** extra API calls for the summary, ladder or diagram, so it stays fast and free.
- Only "Add your place" calls an API live (rate-limited, cached per place).
- **Privacy:** for "area only" listings, distances are computed from the true pin on the server but **rounded** (0.5 km steps) and the home is drawn as an area circle, never a pin, so nobody can triangulate the exact building. "Hidden" location → only locality-level info, no ladder or diagram.
- A buyer's places are stored in their buyer session and shared only with that agent.

### 34. Decisions

1. Address search provider for "Add your place": **Ola Maps** (recommended: Indian data, free tier) vs Mappls vs OSM-based (free, weaker Indian addresses).
2. Show places of worship as a category? Useful to many buyers, but sensitive. *Recommendation: off by default; agent can enable it per listing.*

### 35. Where it fits in the phases

- **Phase 0 prototype:** neighbourhood section, Add-your-place, commute compare and vastu compass shown visually.
- **Phase 2 (buyer surfaces):** summary tiles, ladder, radial diagram, compass, transport, lazy full map.
- **Phase 3 (customisation):** agent landmark editor, category toggles.
- **Phase 5 (quick wins):** Add your place, commute compare, buyer-place insight for agents, commute-aware matching.

---

## Part F: Build log

### Round 1 (shipped)
Direction: the approved whole-product look (forest green on warm paper, DM Sans, rounded surfaces, soft depth), from `prototype/look.html`.

- **Foundation** (`src/app/globals.css`, `src/app/layout.tsx`): neutral and brand palettes redefined, so every screen takes the look; automatic **dark mode** (`prefers-color-scheme`) remapping the same tokens; DM Sans + Hind Vadodara self-hosted with `next/font` (no render-blocking font request); `lang="en-IN"`.
- **Motion**: page entrance on every app navigation (`(main)/template.tsx`), staggered sections, press feedback on buttons/links, sliding nav and tab indicators, slide-up sheets, animated success tick, heart pop, image fade-in, shimmer skeletons. Entrances use `animation-fill-mode: backwards` so they never trap fixed dialogs. Reduced-motion respected globally.
- **Welcome / loading**: branded agent-app welcome screen once per session (`AppSplash`, gated by a `beforeInteractive` script); redesigned buyer welcome splash (logo/initials reveal + progress); buyer page loading skeletons (`/p`, `/c`, agent site).
- **Screens rebuilt**: buyer property page (hero photo with agent pill, overlapping summary card, sticky jump tabs, section cards, floating action bar), agent home, buyer (lead) detail (profile card, intent meter, next-action card, icon timeline), floating bottom navigation ("Buyers" naming), UI kit.
- **Cleanup**: decorative emojis removed; one WhatsApp green; "Leads" → "Buyers" on screens; footer "with ❤ from PropPulse".
- **Fixes found on the way**: an inline script in the app layout broke server-action redirects (moved to `next/script beforeInteractive`); app-wide `loading.tsx` turned 404s into 200s (removed); action bars repositioned above the floating nav; share E2E test now waits for the "opened" event before closing the buyer tab.

### Next rounds
Collection page and agent website in the new layout; property editor steps; visits/insights polish; neighbourhood section (Part E); quick wins (Part D §28).
