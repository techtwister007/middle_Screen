# Salon Growth Platform: UX Brief for Design

This brief is for the designer, Claude Design, who will create the UI. It describes **who uses the product, what they are trying to do, which screens and moments exist, and what each must let people do.**

It deliberately says **nothing about how things should look.** Colours, typography, layout, motion, illustration, metaphors and screen structure are yours to invent. Where an idea below sounds visual ("a stamp card", "a reveal"), treat it as describing the *experience*, not prescribing the design. Merge screens, split them, or replace a pattern with a better one whenever it serves the person using it.

Background: [`PRODUCT.md`](./PRODUCT.md) (what we sell and why) and [`BUILD_PLAN.md`](./BUILD_PLAN.md) (how it is built).

---

## Contents

1. [The product in one paragraph](#1-the-product-in-one-paragraph)
2. [The few things that are fixed](#2-the-few-things-that-are-fixed)
3. [Who uses it](#3-who-uses-it)
4. [UX principles](#4-ux-principles)
5. [Customer app](#5-customer-app)
6. [Moments outside the app](#6-moments-outside-the-app)
7. [Staff / artist app](#7-staff--artist-app)
8. [Owner app](#8-owner-app)
9. [In-salon surfaces: reception kiosk and salon display](#9-in-salon-surfaces-reception-kiosk-and-salon-display)
10. [Platform console (our team)](#10-platform-console-our-team)
11. [Cross-cutting experience](#11-cross-cutting-experience)
12. [Screen and surface inventory](#12-screen-and-surface-inventory)
13. [Sample content for mock-ups](#13-sample-content-for-mock-ups)
14. [What we'd love to see from you](#14-what-wed-love-to-see-from-you)

---

## 1. The product in one paragraph

Each nail studio or salon gets its **own branded app** (a web app that works from a link and can be added to the phone's home screen). Customers use it to discover designs, book, keep a diary of their nails, collect rewards, try designs on their own hand, and send gifts and invites to friends. The salon's staff use a fast companion app to check customers out and photograph finished nails. The owner gets a simple app that tells them what to do today and how the business is doing. All salons run on one shared platform, which our team manages from a console. The product's purpose is to **turn one visit into many, and every happy customer into new customers and new Instagram content.**

---

## 2. The few things that are fixed

These are requirements of the platform, not stylistic choices:

1. **Every salon has its own look.** The customer app must be designable as **many different themes over the same screens**: at minimum a clean default, a luxurious one and a minimal editorial one, plus fully custom themes for premium salons. Please design at least **three clearly different theme directions** for the customer app. A salon's logo, colours and fonts must be able to change without redesigning screens.
2. **Phone first.** Almost everyone uses a mid-range Android phone. Every customer, staff and owner screen must work beautifully one-handed on a small screen. The owner app and platform console should also work well on a laptop.
3. **Three languages:** English, Gujarati and Hindi, switchable at any time. Text length varies a lot between them.
4. **Works from a link.** Customers never need to install anything to browse or book. Installing is an optional upgrade.
5. **Accessible.** Readable for older customers, large enough tap targets, sufficient contrast in every theme, nothing that relies on colour alone.
6. **Our brand stays out of the way.** The customer app is the salon's brand. The platform appears only as a small "powered by" mark.

Everything else is open.

---

## 3. Who uses it

| Person | Who they are | What they want | Where they use it |
| --- | --- | --- | --- |
| **First-time visitor** | Found the salon on Instagram, Google or through a friend | See designs and prices without DMing; trust the place; book quickly | Phone, from a link or QR code |
| **Regular customer** | Comes every 3–4 weeks for refills or new sets | Rebook fast; see their history; rewards; feel recognised | Phone, sometimes from the home screen |
| **Referred friend / gift recipient** | Received a gift or invite on WhatsApp | Open the gift, feel special, redeem it easily | Phone, from a WhatsApp link |
| **Contest voter** | A customer's friend voting for their design | Vote in seconds | Phone, from a shared link |
| **Artist (staff)** | Does nails all day, hands often busy or wet | Know who's next; check out in seconds; photograph the work; get credit | Salon phone or their own phone |
| **Receptionist / manager** | Runs the front desk in bigger salons | Manage the day's bookings and walk-ins without chaos | Tablet or phone at the counter |
| **Owner** | Runs the business, often also an artist; not technical; lives on WhatsApp | Know what to do today; fill empty slots; see if it's working; look good online | Phone mostly, laptop sometimes |
| **Our team (platform admin)** | Onboards and supports salons | Launch a salon in under 48 hours; spot salons in trouble; keep costs visible | Laptop |

---

## 4. UX principles

1. **Design for moments, not daily use.** A customer visits every 3–6 weeks. The app must shine at four moments: **choosing, in the chair, right after the visit, and between visits.** It should never pester people to open it.
2. **The nails are the hero.** Photos of real work are the most persuasive and emotional content in the product. Give them space.
3. **Price and time are never hidden.** "How much and how long?" is the question salons answer 50 times a day. Answer it everywhere a design or service appears.
4. **Three taps to book.** From any design: choose, pick a slot, confirm. Login only when unavoidable, done with a phone number and a code.
5. **Recognition over navigation.** A returning customer should see *their* things first: next appointment, refill due, rewards, last design.
6. **Delight at the peaks.** The reveal of their finished nails, a scratch card, a gift opening and a contest win are emotional peaks. Make them memorable and shareable.
7. **WhatsApp is part of the UX.** Many interactions start or end in WhatsApp. Messages, previews and links are designed surfaces too.
8. **Tell the owner what to do, not what happened.** The owner sees actions ("6 customers are due — remind them") before charts.
9. **Staff speed beats completeness.** If a staff action takes more than a few seconds it won't happen, and the data dies.
10. **Generous, never pushy.** Offers feel like gifts and recognition, never spam or countdown-timer pressure.

---

## 5. Customer app

### 5.1 How people arrive

Instagram bio link · Instagram story link · QR code (mirror, bill, shop window, aftercare card, poster) · WhatsApp message or Status · Google Maps profile · a friend's invite or gift · a contest vote link · the city discovery page.

**The landing should adapt to the entry point.** Someone from a story about a specific design should land on that design. A friend's invite opens the gift. A QR code on the mirror inside the salon opens the in-chair experience.

### 5.2 First visit vs returning

- **First visit:** who this salon is, the best work, clear prices, trust signals (artists, hygiene, real reviews, location), the first-visit offer, and an easy way to book or ask a question.
- **Returning (recognised by login or device):** greeting by name, next appointment, refill countdown, rewards, "repeat my last design", what's new since their last visit.

### 5.3 Screens and what each must do

You're free to merge, split or reorganise these.

**Home**
- Salon identity, what makes them special, location and opening status ("open now, closes 8 pm").
- Current offers and the season's highlight (e.g. Navratri designs).
- New this month.
- For returning customers: next appointment, refill countdown, points and wallet balance, active rewards and their expiry.
- Fast paths: Book, Explore designs, My nails, Invite a friend.

**Explore designs (gallery)**
- Browse real designs by category, occasion (wedding, garba, office, party), season, colour, length or shape, budget and time available.
- Each design shows price ("from ₹…"), time, the artist and a **Book this look** action.
- Save to a moodboard.
- **Taste builder (idea):** a quick like/skip way to discover styles, after which the gallery is personalised.
- **"Surprise me within ₹X":** suggests designs that fit a budget and time.
- Designs from real customers (with consent) are marked as such.

**Design detail**
- Large photos, possibly close-ups and different angles.
- Price breakdown builder: base service plus add-ons (art on 2 fingers, chrome, gems, extensions length) with live total and time.
- Who did it (artist), similar designs, how long it lasts, aftercare.
- Actions: Book this look · Try it on my hand · Save · Share · Ask a question (opens WhatsApp with the design attached).

**Menu (services)**
- Services grouped clearly with price, duration and what's included.
- Packages and prepaid offers ("pay ₹5,000, get ₹6,000").
- Each service links to designs that use it.

**Booking flow**
- Start from a design, a service, "repeat last", or a reminder link.
- Choose services and add-ons; choose an artist or "anyone"; pick a date and slot (show how busy days are; offer the waitlist if full).
- Optional inspiration photo upload ("can you do this?"), with a note.
- Deposit payment for long services (UPI-first).
- Login with phone number + one-time code only at the point it's needed.
- Confirmation: add to calendar, share with a friend, directions, what to expect.
- **Group booking:** book for 2+ people (bridal party, friends). The organiser creates the booking and friends join via a link to pick their own design.
- Reschedule and cancel easily, with the cancellation policy shown kindly.

**Before the visit**
- A reminder card: time, artist, address with map, parking tip, "remove old gel?" or other prep, the chosen design.
- A soft nudge to save a design if they haven't chosen one.

**In the chair** (entered via the mirror QR code, or automatically during the appointment)
- A calm, salon-specific mode for the 1–2 hours they're sitting there.
- Pick and **pre-book the next refill** before leaving, with a small reward for doing so.
- Browse next-time ideas; save to moodboard.
- Enter this month's contest; invite a friend; add the app to the home screen.
- After payment: the **scratch card** reveal of their next-visit reward.
- Optional idea: the salon's Wi-Fi details, a playlist, today's artist profile.

**The reveal (after the visit)**
- Their professional nail photos arrive as a moment, not a file: the design name, the artist's credit and the salon's frame.
- One-tap share kit: Instagram story, WhatsApp Status, square post, each with the salon's handle and their personal invite link.
- "Feature my nails in the gallery" consent.
- Rate the visit. Everyone then sees the Google review option, and anyone unhappy also gets a direct private line to the owner.
- Points credited, with a visible "you earned" moment.

**My nails (nail diary)**
- A personal visual history of every set: photo, date, design, artist, price.
- **Repeat this design** on any past set.
- Refill countdown or "nail health" status for the current set.
- **Hand profile (idea):** nail shape, length preference, skin tone, sensitivities, so suggestions and try-on feel personal.

**Try-on**
- Try colours, shapes and designs on a hand illustration or a photo of their own hand.
- AI try-on: put a chosen gallery design on their own hand photo (limited tries, shown kindly).
- Compare two looks side by side; save; book the one they like.

**Rewards and wallet**
- Stamp progress, points, tier, what the next reward is and how close they are.
- Active rewards with expiry (next-visit reward, birthday-month treat).
- Wallet balance and prepaid packages with remaining services.
- Add to Google Wallet.
- History of what they earned and used.

**Invite and gift**
- **Gift a friend:** send ₹200 off a first visit via WhatsApp, with a personal message. See whether friends have visited and what they earned.
- **Buy a gift card:** choose amount or a service, occasion (birthday, Raksha Bandhan, Diwali), message, recipient's phone; pay; the recipient gets a gift reveal (section 6).
- Referral leaderboard (opt-in visibility).

**Contests**
- Nail of the Month: current entries, their own entry, vote count, sharing "vote for me", past winners, prize, terms.

**Care and trends**
- Aftercare for the exact service they had.
- Seasonal trend stories and short articles.

**Profile and settings**
- Name, birthday, language, consents (marketing, gallery, contest), notifications, saved address preference, data download and delete.

**Notifications inbox (optional)**
- Everything the salon has sent them in one place, for those who installed the app.

### 5.4 Key customer flows to design end to end

1. Instagram story → design → Book this look → slot → code login → deposit → confirmed.
2. Refill reminder on WhatsApp → one tap → same artist, same design pre-selected → confirmed.
3. In the chair → pre-book next refill → pay → scratch card → reward saved.
4. After the visit → reveal → share to WhatsApp Status → friend taps link → friend's first booking.
5. Friend receives a gift on WhatsApp → gift reveal → claims → books.
6. Group booking for a bridal party.
7. Try-on on own hand → compare → book.
8. Lapsed customer receives a win-back message → sees what's new → books with the offer.

---

## 6. Moments outside the app

These are designed surfaces too:

| Surface | What it must do |
| --- | --- |
| **WhatsApp messages** (confirmation, reminders, refill due, reveal, reward expiry, win-back, birthday, festival, gift received, vote) | Short, warm, branded voice; one clear button; link preview that looks good |
| **Link previews** (when salon, design, gift or vote links are shared) | Salon-branded preview image and title |
| **Share kit images** (Instagram story, WhatsApp Status, square post) | Make the customer's nails look amazing; carry the salon's identity and handle; a frame for each theme and season |
| **Gift reveal page** | An unwrapping moment for a gift card or friend invite, then a clear path to claim and book |
| **Vote page** | Opens straight on the entry; vote with phone + code in seconds; invites the voter to explore the salon afterwards |
| **Google Wallet loyalty pass** | Salon-branded card showing stamps and points |
| **QR posters and stickers** (mirror, window, counter, aftercare card, bill) | Printable, salon-branded, with a clear reason to scan |
| **Monthly ROI report** (sent to the owner as an image or PDF on WhatsApp) | Tells the month's story in one glance: bookings, repeat visits, referrals, posts, revenue influenced |
| **Owner's daily summary** (WhatsApp) | Yesterday's results and today's actions, with buttons |
| **Calendar invite** | Clear title, address, salon name |
| **Installed app icon and splash** | The salon's identity on the customer's home screen |

---

## 7. Staff / artist app

The staff app is used **standing, between customers, often one-handed and sometimes with wet or gloved hands.** Speed and big targets matter more than anything.

**Today**
- Who's next and when, with the customer's name, photo, the design they chose, their inspiration photo, notes ("sensitive cuticles"), visit count and last design.
- Bookings to confirm; walk-ins to add.
- Running late and no-show quick actions.

**Checkout (the most important staff screen)**
- Find the customer by phone (or they're already selected from the appointment).
- Services done, add-ons, price adjustments, apply a reward or wallet balance.
- Payment: show a UPI QR or send a payment link; or mark cash or card.
- Prompt to **pre-book** the next visit with free slots shown.
- Trigger the customer's scratch card.
- Target: done in seconds.

**Photo corner**
- Camera with framing guidance (hand position, angle, light check).
- Choose frame (theme or season), name the design, credit the artist.
- Take several shots, pick the best, send. The customer receives the reveal.
- Optional before/after.

**Share verification**
- A list of customers who say they shared, with one tap to confirm each.

**Customer card**
- History, designs, preferences, spend, consents, notes, segment ("due", "VIP").

**My portfolio and stats**
- The artist's own designs in the gallery, their ratings, pre-booking rate, leaderboard position, tips or credit received.

**Schedule**
- Their calendar, availability, time off requests.

---

## 8. Owner app

The owner is busy, non-technical and lives on WhatsApp. The app should feel like **a smart assistant that hands them a short list of things to do,** with the business picture one tap away.

**Today (action feed)**
- Short cards the owner can act on in one tap:
  - "6 customers are due for a refill — send reminders"
  - "Tuesday 2–5 pm is empty — launch a slot-filler deal?"
  - "Priya rated 2 stars — call her"
  - "3 shares to verify"
  - "Navratri is in 3 weeks — launch the pack?"
- Today's appointments and requests.
- Yesterday at a glance: visits, revenue, new customers.

**Business (insights)**
- Plain-language insights first ("Your repeat rate is up 8% since reminders started"), then charts for those who want them.
- Bookings by source (Instagram, QR, referrals, Google, walk-in), revenue, average bill, first-to-second-visit rate, repeat rate, revenue by service and artist, no-shows, discount spend, campaign results.
- The **monthly ROI story**: what the platform brought in versus what it cost.

**Customers**
- Search and filter; groups (new, regular, due, at risk, lapsed, VIP) with one-tap actions per group.
- Customer profile with full history.

**Campaigns**
- Launch an offer, a slot-filler deal or a festival pack. Preview exactly what customers will see and receive on WhatsApp, the audience size and the estimated message cost.
- Referral programme settings; contests; first-visit offer.
- Results per campaign.

**Gallery and menu**
- Add services, prices and designs fast, from the phone.
- **Photo-to-menu (idea):** photograph a printed rate card and get a draft menu to confirm.
- Reorder, feature and archive designs; approve customer-submitted photos.

**Salon page editor**
- Choose and reorder the sections of their customer app; change cover photos, colours and fonts within their theme; see a live preview on a phone frame.

**Team**
- Artists, roles, schedules, performance, leaderboard.

**Settings**
- Hours, branches, deposit rules, reward rules, discount budget, message limits, reminder timings per service, payment account connection, WhatsApp connection, languages.

**Billing and costs**
- Their plan, invoices, WhatsApp and AI usage passed through at cost.

**Help**
- One tap to WhatsApp our support; short how-to guides.

---

## 9. In-salon surfaces: reception kiosk and salon display

Two surfaces that run inside the salon on spare devices:

**Reception kiosk (tablet at the counter)**
- Walk-in check-in: the customer types their phone number and joins the system, choosing services and seeing the expected wait.
- "Scan to see designs" for people waiting.
- Contest and referral prompts.

**Salon display (TV or old tablet on the wall)**
- A looping showcase of the salon's best designs, new arrivals, this month's offer and the contest leaderboard, each with a QR code to book or vote.
- Optional "now serving" or today's artists.
- Must look good from across the room and refresh on its own.

---

## 10. Platform console (our team)

Used on a laptop by our small team.

**Salons overview**
- Every salon with health signals: activation (20 customers in 14 days), bookings this month, message volume and cost, support load, payment status, churn risk.

**Onboarding wizard (launch a salon in under 48 hours)**
1. Basics: name, address, link (subdomain/path), plan.
2. Branding: logo upload, colours and fonts suggested from the logo, theme choice with live preview.
3. Menu import (from a sheet, a photo of a rate card, or manual entry).
4. Gallery upload in bulk.
5. Connect payments and WhatsApp.
6. Generate the QR kit and printables.
7. Invite staff.
8. Go-live checklist.

**Theme studio**
- Preview any theme with any salon's content on multiple phone sizes and in all three languages; adjust a salon's overrides; spot contrast problems.

**Salon detail**
- Settings, features on or off, theme, users, impersonate the owner for support (clearly marked), activity log, costs, invoices.

**Content library**
- Festival campaign packs, frames, articles, WhatsApp templates, shared across all salons.

**Costs and billing**
- Message, SMS and AI costs per salon per month; subscription status; invoices.

**City discovery**
- Which salons are listed in each city and the page's performance.

---

## 11. Cross-cutting experience

**States to design for every screen**
- First-time (empty) states that teach and invite, rather than looking broken.
- Loading on slow networks; partial content; offline with clear retry.
- Errors in plain, friendly language with a way forward.
- Success moments.

**Themes**
- The same screens in each theme direction. A theme should change the personality (type, colour, shape, imagery treatment, motion style, iconography), not the meaning or the flow.
- Salon-level overrides: logo, a few colours, font choice, cover imagery.

**Notifications**
- WhatsApp is the main channel; push for installed apps; in-app inbox optional.
- Customers control what they receive.

**Language and tone**
- Warm, short, celebratory, never salesy. Same personality in English, Gujarati and Hindi.

**Trust and privacy**
- Consents are clear and easy to change. Customers can see and delete their data.
- Prices, cancellation rules and deposit rules are always visible before paying.

**Seasonal moments**
- The customer app can take on a seasonal skin or highlight (Navratri, Diwali, wedding season, Valentine's) without a redesign.

---

## 12. Screen and surface inventory

A checklist of everything to design. "Theme-able" means it must work in every customer theme.

| # | Screen / surface | Audience | Theme-able |
| --- | --- | --- | --- |
| 1 | Home (first visit) | Customer | Yes |
| 2 | Home (returning) | Customer | Yes |
| 3 | Explore designs / gallery + filters | Customer | Yes |
| 4 | Taste builder / Surprise me | Customer | Yes |
| 5 | Design detail + price builder | Customer | Yes |
| 6 | Menu / services + packages | Customer | Yes |
| 7 | Booking flow (services, artist, slot, inspiration, deposit, confirm) | Customer | Yes |
| 8 | Phone + code login | Customer | Yes |
| 9 | Group booking (organiser + friend joining) | Customer | Yes |
| 10 | Waitlist | Customer | Yes |
| 11 | Upcoming appointment / reschedule / cancel | Customer | Yes |
| 12 | In-the-chair mode | Customer | Yes |
| 13 | Scratch card reveal | Customer | Yes |
| 14 | Nail reveal + share kit + rating | Customer | Yes |
| 15 | My nails (diary) + hand profile | Customer | Yes |
| 16 | Try-on (illustration, own photo, AI, compare) | Customer | Yes |
| 17 | Rewards, wallet, packages, Google Wallet | Customer | Yes |
| 18 | Invite a friend + status + leaderboard | Customer | Yes |
| 19 | Buy a gift card | Customer | Yes |
| 20 | Contests (entries, vote, results) | Customer | Yes |
| 21 | Care tips and trends | Customer | Yes |
| 22 | Profile, language, consents, data | Customer | Yes |
| 23 | Install prompt | Customer | Yes |
| 24 | Gift reveal page | Gift recipient / friend | Yes |
| 25 | Vote page | Contest voter | Yes |
| 26 | Share kit images (story, status, square) and frames | Customer's audience | Yes |
| 27 | WhatsApp message set + link previews | Customers, owner | Yes |
| 28 | QR posters, stickers, aftercare card | Customers in salon | Yes |
| 29 | Google Wallet pass | Customer | Yes |
| 30 | Staff Today | Artist / reception | No |
| 31 | Checkout + payment QR + pre-book + scratch trigger | Artist / reception | No |
| 32 | Photo corner camera | Artist | No |
| 33 | Share verification | Artist | No |
| 34 | Customer card | Staff, owner | No |
| 35 | Artist portfolio + stats + schedule | Artist | No |
| 36 | Owner Today (action feed) | Owner | No |
| 37 | Business insights + ROI story | Owner | No |
| 38 | Customers and groups | Owner | No |
| 39 | Campaign launcher + festival packs + results | Owner | No |
| 40 | Gallery and menu management (+ photo-to-menu) | Owner | No |
| 41 | Salon page editor with live preview | Owner | No |
| 42 | Team | Owner | No |
| 43 | Settings, billing, help | Owner | No |
| 44 | Monthly ROI report (image/PDF) | Owner | No |
| 45 | Reception kiosk | Walk-ins | Yes |
| 46 | Salon display (TV) | People in the salon | Yes |
| 47 | Platform: salons overview | Our team | No |
| 48 | Platform: onboarding wizard | Our team | No |
| 49 | Platform: theme studio | Our team | No |
| 50 | Platform: salon detail, content library, costs, discovery | Our team | No |
| 51 | City discovery page | New customers | Platform brand |

---

## 13. Sample content for mock-ups

Use realistic content so the designs feel true to the market.

**Salons**
- *Glam Nails Studio*, Alkapuri, Vadodara: Instagram-heavy, trendy, 4 artists.
- *Aura Beauty Lounge*, Gotri: premium salon with nails, lashes and brows.
- *Nails by Riya*: home studio, one artist.

**Artists:** Riya, Meera, Krupa, Sneha.

**Customers:** Priya Shah (regular, Gold tier), Ananya Patel (first visit), Hetal Desai (lapsed).

**Services and prices**

| Service | Price | Time |
| --- | --- | --- |
| Gel polish (hands) | ₹799 | 45 min |
| Gel extensions with nail art | ₹1,999 | 2 h |
| Acrylic extensions | ₹2,299 | 2 h 15 min |
| Refill | ₹1,199 | 1 h 15 min |
| Chrome / cat-eye add-on | ₹300 | 15 min |
| Art on 2 fingers | ₹200 | 10 min |
| Classic manicure | ₹599 | 40 min |
| Bridal nails package | ₹4,999 | 3 h |

**Design names:** Garba Glow, Mirror Chrome, Milky Pink French, Diwali Diya Gold, Bridal Mehendi Lace, Ocean Cat-Eye, Minimal Moon.

**Moments:** Navratri campaign, "Nail of the Month: October", gift card for Raksha Bandhan, birthday-month treat, refill due in 3 days.

**Owner numbers:** "Yesterday: 9 visits, ₹14,200 · 6 due today · 3 at risk"; "October: 34 bookings via your page, 12 repeat refills from reminders, 5 new customers from referrals, 41 tagged posts, ₹38,400 revenue influenced."

---

## 14. What we'd love to see from you

- **Three distinct customer theme directions** applied to the same key screens (home, gallery, design detail, booking, reveal, rewards).
- The **key flows in section 5.4** designed end to end.
- The staff **checkout** and **photo corner**, and the owner's **Today** feed, which are the screens that make or break daily use.
- The **emotional peaks**: nail reveal, scratch card, gift reveal, contest win.
- Ideas we haven't thought of. If a better pattern exists for any screen here, use it.
