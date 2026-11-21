# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Buyers and tenants in India** (primary design audience for buyer pages). They receive a property or shortlist link from an agent on WhatsApp, open it on a mid-range Android phone over 4G, often while commuting or at home with family, and decide whether to call, ask, or book a site visit. No login, no app. Families share links with each other.
- **Independent real-estate agents and small brokerages** in Indian cities (pilot: Vadodara). They work from their phone and WhatsApp all day, forward property photos and voice notes, and need to look professional to buyers and owners. Many have no logo or brand kit. They must never need training.
- **VectorScale/PropPulse admin**: operations, payments confirmation, abuse handling.

## Product Purpose

An agent forwards property photos/videos and a voice note to the PropPulse WhatsApp number and gets back an agent-branded property page in about a minute. They share it to a specific buyer in one tap; the app then shows who opened it, what they liked, who saved it and who wants a site visit, and tells the agent when to call. Success: buyers book visits; agents close faster and look more professional than competitors; agents renew.

## Positioning

"Other apps make your property look good. PropPulse tells you which buyer is ready to visit." The buyer page carries the agent's identity (not a portal's), every link is personal to one buyer, and the agent sees honest buyer intent signals. Agents' buyers stay theirs: no marketing to buyers, no other agents' listings shown.

## Operating Context

- Everything starts and ends in WhatsApp: link previews in chats, WhatsApp Status posts, wa.me replies, the bot for agent commands and login.
- Buyer pages: mobile-first, fast on 4G, low-end Android.
- Indian conventions: ₹ lakh/crore, BHK, sq ft, carpet/built-up area, RERA numbers, vastu/facing, societies and localities, stamp duty and registration, Hinglish.
- Agents work in Vadodara-type tier-2 cities first; Hindi/Gujarati UI planned later.

## Capabilities and Constraints

- Built: listings from WhatsApp (AI draft), web editor, per-buyer share links, collections (like/skip/rank/compare), agent website, tracking and intent, leads CRM, visits, push alerts, billing (Razorpay + UPI), admin.
- Stack: Next.js 15 App Router, Tailwind 4, Postgres/Drizzle, sharp image pipeline, R2 storage.
- Agents can choose the look of their buyer pages (4 looks with 8 colour schemes each, light/dark/auto), globally or per listing; auto-generated logo from name; customisable welcome screen.
- Location privacy: exact pin / area only (default) / hidden. Unit and owner details never shown unless allowed.
- Buyer pages must stay light: performance budget LCP < 2.5 s on slow 4G.

## Brand Commitments

- Product name PropPulse, a VectorScale product; renamable via config.
- Footer credit on buyer pages: "with ❤ from PropPulse", PropPulse linking to our website.
- The user has explicitly rejected generic, AI-looking design, mismatched font pairings and templated card layouts.

## Evidence on Hand

- Real listing content structure from seed data (Vadodara: Gotri, Alkapuri, Vasna Bhayli, Akota).
- No real agent photos, testimonials or customer numbers yet: do not fabricate them.

## Product Principles

1. The agent looks better than they could on their own.
2. The buyer's next step is always obvious and one tap away.
3. Nothing needs explaining.
4. Fast on a cheap phone beats any effect.
5. WhatsApp is home.

## Accessibility & Inclusion

WCAG AA contrast in every look, scheme and mode; tap targets ≥ 44 px; readable for older family members; Indian number and date formats.
