/** All WhatsApp bot copy in one place (easy to edit / translate). */
import { brand } from "@/config/brand";
import { appUrl, env } from "@/config/env";

export const M = {
  welcomeNew: () =>
    `👋 Welcome to *${brand.name}* by ${brand.company}!\n\nTurn property photos into a beautiful link for your buyers — and see who's interested.\n\nLet's set you up in under a minute.\n*What's your name?*`,
  askCompany: (name: string) => `Nice to meet you, ${name}! 🙏\n\nWhat's your *company / brokerage name*?\n(Reply *skip* if you work independently)`,
  askPhoto: () => `Send your *photo or company logo* — it appears on every property page.\n(Reply *skip* to add it later)`,
  promise: () =>
    `🤝 *Our promise to you*\n\n*Your buyers are yours. Always.*\n1. We never contact your buyers for marketing, never sell or share their numbers, never show them other agents' properties.\n2. Your pages show only *your* name, phone and WhatsApp.\n3. Owner details, exact address and flat number are never shown unless you choose.\n4. Your leads and notes are visible only to you.\n5. Any future network enquiry for your listing always goes to you.\n\nReply *YES* to accept and start your *${env.TRIAL_DAYS}-day free trial*.\n(Full terms: ${appUrl}/terms)`,
  onboarded: (link: string) =>
    `🎉 You're all set! Your free trial is active.\n\n*How to add a property:*\n1️⃣ Forward the photos / videos here\n2️⃣ Add a line or voice note: _"3 BHK Gotri, 1450 sqft, furnished, 95 L"_\n3️⃣ Type *done*\n\nYou'll get a beautiful link in about a minute.\n\nYour dashboard (stays logged in):\n${link}\n\nType *help* anytime.`,
  firstMedia: () => `📥 Got it! Keep sending photos, videos and details (text or voice note).\nType *done* when finished.`,
  textDraftStarted: () => `📝 Got the details. Now send the photos / videos (optional).\nType *done* when finished.`,
  processing: (img: number, vid: number) => `⏳ Creating your listing from ${img} photo${img === 1 ? "" : "s"}${vid ? ` and ${vid} video${vid === 1 ? "" : "s"}` : ""}…`,
  draftReady: (title: string, price: string, ref: string, preview: string, missing: string[], unheardVoice: boolean, updated?: string[]) =>
    `${updated?.length ? `✏️ Updated: ${updated.join(", ")}` : "✅ *Draft ready*"} — ${title}\n${price} · Ref *${ref}*\n\nPreview: ${preview}${missing.length ? `\n\n⚠️ Missing: *${missing.join(", ")}* — just reply with them, e.g. _95 lakh, Gotri, 1450 sqft_` : ""}${unheardVoice ? `\n\n🎙️ Voice note saved but couldn't be transcribed — type the details if anything is missing.` : ""}\n\nReply:\n*1* Publish & get link\n*2* Edit (opens editor)\n*3* Discard`,
  shareWho: (publicUrl: string | null) =>
    `👤 Who is it for? Send the buyer's *contact card* or type *Name 98xxxxxxxx* — you'll get a personal link that tells you when they open it.${publicUrl ? `\n\nOr forward the public link (groups / status):\n${publicUrl}` : ""}`,
  nothingToFinish: () => `There's nothing to finish. Forward property photos or type the details to start a listing.`,
  published: (title: string, url: string, ref: string) =>
    `🚀 *Live!* ${title}\n\n🔗 ${url}\n\nTo share with a buyer and track them:\n*share ${ref} to Rahul 98xxxxxxxx*\n\nOr forward the link anywhere.`,
  editLink: (url: string) => `✏️ Edit here (you're logged in): ${url}`,
  discarded: () => `🗑️ Discarded. Send new photos anytime.`,
  notFound: (ref: string) => `I couldn't find a property with ref *${ref}*. Type *list* to see your properties.`,
  statusUpdated: (title: string, status: string) => `✔️ ${title} is now *${status}*.`,
  brandSaved: (what: string, site: string) => `✔️ ${what}. Every property page and your website now use it.\n\nSee it: ${site}`,
  colourHelp: (light: boolean, names: string[]) =>
    `${light ? "That colour is too light: white text on it would be hard to read.\n\n" : ""}🎨 Pick a colour: ${names.map((n) => `*${n}*`).join(", ")}.\n\nExample: *colour maroon*. You can also send a dark hex code like *colour #1e3a5f*.`,
  branding: (b: { name: string | null; company: string | null; tagline: string | null; colour: string; logo: boolean; photo: boolean; welcome: string; site: string }) =>
    `🎨 *Your branding*\n\nName: ${b.name || "–"}\nCompany: ${b.company || "–"}\nTagline: ${b.tagline || "–"}\nColour: ${b.colour}\nLogo: ${b.logo ? "added" : "not added"} · Photo: ${b.photo ? "added" : "not added"}\nWelcome screen: ${b.welcome === "none" ? "off" : b.welcome === "splash" ? "full" : "short"}\n\n*To change:*\n• *colour maroon*\n• *name: Rakesh Sharma*\n• *company: Sharma Realty*\n• *tagline: Homes in Vadodara since 2005*\n• Send an image with caption *logo* or *photo*\n• *welcome off* / *welcome on* / *welcome full*\n\nYour website: ${b.site}`,
  priceDropped: (title: string, was: string, now: string, n: number, link: string) =>
    `✔️ Price lowered: ${title} → *${now}* (was ${was}). Buyers now see a "Price reduced" tag.\n\n${n} buyer${n > 1 ? "s" : ""} showed interest. Tell them in one tap each:\n${link}`,
  priceUpdated: (title: string, price: string) => `✔️ Price updated: ${title} → *${price}*. Same link, buyers see the new price.`,
  shareReady: (name: string, url: string, waLink: string) =>
    `🔗 Personal link for *${name}*:\n${url}\n\nTap to send it from your WhatsApp:\n${waLink}\n\nYou'll be alerted when ${name} opens it.`,
  shareUsage: () => `Usage: *share K7Q2M to Rahul 9812345678*`,
  searchNone: () => `No matching properties in your inventory. Try fewer words, e.g. *find 2bhk gotri*.`,
  searchResults: (lines: string[], collectionUrl: string | null) =>
    `🔎 *${lines.length} match${lines.length === 1 ? "" : "es"}*\n\n${lines.join("\n")}${collectionUrl ? `\n\nAll in one link:\n${collectionUrl}` : ""}`,
  login: (link: string) => `🔐 Your dashboard login link (valid 30 min):\n${link}`,
  locked: (link: string) => `⏸️ Your ${brand.name} plan has ended, so new listings and alerts are paused.\nYour existing links still work for now.\n\nRenew in 1 minute: ${link}`,
  agentLoginOk: () => `✅ Logged in! Go back to your browser.\nIf this wasn't you, reply *STOP*.`,
  buyerVerifiedOk: (agentName: string) => `✅ Verified! Your shortlist is saved. ${agentName} will be in touch soon.\n\n(Your number is shared only with ${agentName}.)`,
  verifyExpired: () => `That code has expired. Please tap the button on the page again.`,
  stop: () => `Okay. If you didn't request a login, nothing has changed — your account is safe. Contact ${brand.supportEmail} if you need help.`,
  verifyAsk: (title: string, ref: string) => `🧐 Is *${title}* (${ref}) still available?\nReply *yes ${ref}* to keep it live, or *sold ${ref}* / *rented ${ref}*.`,
  verifiedOk: (title: string) => `👍 Thanks! ${title} marked as available (verified today).`,
  contactAdded: (name: string, url: string) => `👤 Added *${name}* to your leads.\n${url}`,
  help: () =>
    `*${brand.name} — commands*\n\n📸 *Add property:* send photos/videos + details, then *done*\n🔎 *find 2bhk gotri under 60L* — search your inventory\n🔗 *share K7Q2M* then send a contact card — personal tracked link (add more refs for a shortlist)\n💰 *price K7Q2M 92L* — change price\n📊 *report K7Q2M* — live report link for the owner\n🎨 *branding* — your colour, logo, name and tagline\n✅ *sold K7Q2M* / *rented* / *hold* / *available*\n📋 *list* — your active properties\n🔥 *leads* — hot & recent buyers\n📅 *today* — visits & follow-ups\n🔐 *login* — dashboard link\n🆕 *new* — finish current & start another`,
  unknown: () => `🤔 I didn't get that. Type *help* to see what I can do, or just forward property photos.`,
  buyerUnknown: () => `Hi! 👋 This number is used by property agents on ${brand.name}. If you're viewing a property, please contact the agent who shared it with you.`,
};
