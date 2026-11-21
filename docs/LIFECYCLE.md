# Lifecycle coverage — agent, buyer, platform

Audit of the whole journey from discovery to booking to deal close. ✅ = built & covered by E2E tests.

## 1. Agent discovers us → signs up
| Step | Agent | Us |
|---|---|---|
| Hears about us / lands on site | ✅ Landing page, "Start on WhatsApp" | — |
| Signs up | ✅ Send "hi" → 4 questions (name, company, photo, promise) **or** web "Continue with WhatsApp" | ✅ Trial starts, agent in /admin |
| City | ✅ Learned automatically from the first listing (no extra question) | |
| Buyer accidentally messages bot | ✅ Not turned into an agent; told to contact their agent (*JOIN* if they are one) | |

## 2. Listing creation
| Step | Friction removed |
|---|---|
| Forward photos / videos / voice / location / **PDF floor plans** | ✅ One reply per batch; duplicates dropped; GPS stripped; watermark |
| Finish | ✅ `done`, or automatic after 10 min of silence |
| Missing details | ✅ **Just reply** "88 lakh, Gotri, 1350 sqft" — no editor needed |
| Publish | ✅ Reply `1` |
| Web alternative | ✅ Paste/dictate → draft → photos & PDFs → publish; prices shown as "95L / 2.1cr" |

## 3. Sharing
| Step | Friction removed |
|---|---|
| Personal tracked link | ✅ `share REF` → send the buyer's **contact card** (no typing numbers) |
| Several properties | ✅ `share REF1 REF2 to Name 98…` → one shortlist link |
| Groups / status | ✅ Public link + QR |
| From dashboard | ✅ Share dialog: existing lead or new buyer → "Send on WhatsApp" |

## 4. Buyer discovery
| Step | Buyer gets |
|---|---|
| Opens link | ✅ Branded page, no login, WhatsApp preview, gallery, video, PDFs, specs, area-only map |
| Decides | ✅ Price per sq ft, indicative EMI, "Updated N days ago", sold/on-hold state |
| Compares | ✅ Collections: like / skip / rank / compare |
| Comes back | ✅ "Your saved properties" on the agent's website (no account) |
| Not the right one / sold | ✅ **"What are you looking for?"** → requirement to agent + instant match count |
| Identity | ✅ Asked only for ask / visit / requirement; save prompt **once per session**; 1-tap WhatsApp verify |

## 5. Site visit booking
| Step | Buyer | Agent |
|---|---|---|
| Request | ✅ 2 taps (day + time window) | ✅ Push alert, "Needs attention" |
| Status | ✅ **Shown on the property page** (requested → confirmed with time) | ✅ Confirm / reschedule / decline in one tap |
| Reminder | ✅ **Add to calendar** (.ics with 2-hour alarm) | ✅ Push 2 h before |
| Change | ✅ "Need to change?" → WhatsApp agent | ✅ Reschedule |
| After | — | ✅ Outcome (liked / negotiating / not) → lead stage |

## 6. Follow-up & close
| Step | Agent |
|---|---|
| Who's hot | ✅ Transparent intent score + reasons; leaves "Needs attention" once **contacted** (Call/WhatsApp tap), returns on new activity |
| Questions | ✅ Reply on WhatsApp / Mark answered |
| Matching | ✅ New listing → "N buyers match"; buyer requirement → "N properties match" |
| Close | ✅ Sold/Rented → **"to whom?"** → lead closed; Insights show **deals closed via the app** |

## 7. Pay & renew
✅ Trial reminders (7/3/1 days) · Razorpay or UPI QR + UTR · admin confirms · **printable receipt** · grace → locked → contact card · renew restores everything.

## 8. Platform (VectorScale)
✅ Pilot metrics (weekly active agents, open/engaged rates, visits, **deals closed via app**, revenue) · payments queue · feedback / reports / DPDP requests · broadcast · open-as-agent · structured listings + buyer requirements captured for the future aggregator.

## Deliberately not built (and why)
| Item | Why |
|---|---|
| Platform WhatsApp messages to buyers | Agent Promise (never contact buyers) + per-message cost. Buyer gets status on page + calendar file instead. |
| Edit an existing collection | Create a new one (takes seconds); add if pilot agents ask. |
| GST invoices | Receipt only for now; add GSTIN fields when VectorScale needs them. |
| Teams, builder projects, Hindi/Gujarati UI, duplicate detection, public aggregator | Phase 2 — after pilot feedback (see PRODUCT_PLAN.md). |
| Rate limiting on public APIs | Low risk at pilot scale; add Cloudflare rate rules before public launch. |
