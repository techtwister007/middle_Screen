import type { Nearby } from "../lib/geo";
import {
  pgTable,
  text,
  integer,
  bigint,
  boolean,
  timestamp,
  jsonb,
  doublePrecision,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true });
const created = () => ts("created_at").notNull().defaultNow();

/* ------------------------------------------------------------------ */
/* Agents & billing                                                    */
/* ------------------------------------------------------------------ */

export type WelcomeMode = "none" | "minimal" | "splash";
/** Buyer page layout: signature (photo-first, airy) or classic (compact, details-first). */
export type PageLook = "signature" | "classic";
export type BotContext = {
  /** Onboarding step when not finished. */
  onboarding?: "name" | "company" | "photo" | "promise";
  /** Listing waiting for a 1/2/3 reply (free text = corrections). */
  pendingListingId?: string;
  /** "share REF" sent without a buyer — next contact card / name+number completes it. */
  pendingShare?: { listingIds: string[] };
};

export const agents = pgTable(
  "agents",
  {
    id: text("id").primaryKey(),
    phone: text("phone").notNull(), // E.164 digits without +, e.g. 919812345678
    name: text("name").notNull().default(""),
    company: text("company"),
    handle: text("handle").notNull(),
    photoUrl: text("photo_url"),
    logoUrl: text("logo_url"),
    tagline: text("tagline"),
    city: text("city"),
    areas: text("areas"),
    brandColor: text("brand_color").notNull().default("#1f4d36"),
    welcomeMode: text("welcome_mode").$type<WelcomeMode>().notNull().default("minimal"),
    pageLook: text("page_look").$type<PageLook>().notNull().default("signature"),
    watermark: boolean("watermark").notNull().default(true),
    networkOptIn: boolean("network_opt_in").notNull().default(true),
    promiseAcceptedAt: ts("promise_accepted_at"),
    onboarded: boolean("onboarded").notNull().default(false),
    botContext: jsonb("bot_context").$type<BotContext>().notNull().default({}),
    lastInboundAt: ts("last_inbound_at"),
    disabled: boolean("disabled").notNull().default(false),
    createdAt: created(),
  },
  (t) => [uniqueIndex("agents_phone_uq").on(t.phone), uniqueIndex("agents_handle_uq").on(t.handle)],
);

export type SubStatus = "trial" | "active";
export const subscriptions = pgTable("subscriptions", {
  agentId: text("agent_id")
    .primaryKey()
    .references(() => agents.id, { onDelete: "cascade" }),
  status: text("status").$type<SubStatus>().notNull().default("trial"),
  /** Paid/trial access valid until this time. Grace & lock are derived from it. */
  periodEnd: ts("period_end").notNull(),
  priceInr: integer("price_inr").notNull(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export type PaymentMethod = "razorpay" | "upi" | "manual";
export type PaymentStatus = "pending" | "confirmed" | "rejected" | "failed";
export const payments = pgTable(
  "payments",
  {
    id: text("id").primaryKey(),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    method: text("method").$type<PaymentMethod>().notNull(),
    months: integer("months").notNull().default(1),
    amountInr: integer("amount_inr").notNull(),
    reference: text("reference"), // UTR for UPI, payment id for Razorpay
    orderId: text("order_id"), // Razorpay order id
    status: text("status").$type<PaymentStatus>().notNull().default("pending"),
    note: text("note"),
    confirmedAt: ts("confirmed_at"),
    createdAt: created(),
  },
  (t) => [index("payments_agent_idx").on(t.agentId), uniqueIndex("payments_order_uq").on(t.orderId)],
);

/* ------------------------------------------------------------------ */
/* Auth helpers                                                        */
/* ------------------------------------------------------------------ */

/** One-time codes verified by a WhatsApp message (agent login & buyer verification). */
export const waVerifications = pgTable(
  "wa_verifications",
  {
    code: text("code").primaryKey(),
    purpose: text("purpose").$type<"agent_login" | "buyer_verify">().notNull(),
    /** For buyer_verify: buyer session id + share code. */
    sessionId: text("session_id"),
    shareCode: text("share_code"),
    phone: text("phone"),
    verifiedAt: ts("verified_at"),
    consumedAt: ts("consumed_at"),
    expiresAt: ts("expires_at").notNull(),
    createdAt: created(),
  },
);

export const loginTokens = pgTable("login_tokens", {
  tokenHash: text("token_hash").primaryKey(),
  agentId: text("agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  expiresAt: ts("expires_at").notNull(),
  usedAt: ts("used_at"),
  createdAt: created(),
});

/* ------------------------------------------------------------------ */
/* Inventory                                                           */
/* ------------------------------------------------------------------ */

export type PropertyType = "flat" | "house" | "plot" | "commercial" | "pg";
export type Purpose = "sale" | "rent";
export type ListingStatus = "draft" | "available" | "on_hold" | "sold" | "rented" | "archived";
export type PriceMode = "exact" | "range" | "on_request";
export type LocationPrivacy = "exact" | "area" | "hidden";

/** The physical asset. Several agents' listings may point to one property in future. */
export const properties = pgTable(
  "properties",
  {
    id: text("id").primaryKey(),
    type: text("type").$type<PropertyType>().notNull().default("flat"),
    locality: text("locality"),
    city: text("city"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    building: text("building"), // private
    unit: text("unit"), // private
    /** Nearby schools, hospitals, shops, parks and transport, computed in the background (see modules/nearby). */
    nearby: jsonb("nearby").$type<Nearby | null>(),
    createdAt: created(),
  },
  (t) => [index("properties_locality_idx").on(t.city, t.locality)],
);

export type ListingFields = {
  bhk?: number;
  areaSqft?: number;
  carpetSqft?: number;
  plotSqyd?: number;
  floor?: string;
  totalFloors?: number;
  furnishing?: "unfurnished" | "semi" | "full";
  bathrooms?: number;
  balconies?: number;
  parking?: string;
  facing?: string;
  ageYears?: number;
  possession?: string;
  deposit?: number;
  maintenance?: number;
  amenities?: string[];
};

export const listings = pgTable(
  "listings",
  {
    id: text("id").primaryKey(),
    /** Short human code used in bot commands, e.g. K7Q2M */
    ref: text("ref").notNull(),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    propertyId: text("property_id")
      .notNull()
      .references(() => properties.id),
    purpose: text("purpose").$type<Purpose>().notNull().default("sale"),
    title: text("title").notNull().default(""),
    description: text("description").notNull().default(""),
    priceMode: text("price_mode").$type<PriceMode>().notNull().default("exact"),
    price: bigint("price", { mode: "number" }),
    priceMax: bigint("price_max", { mode: "number" }),
    negotiable: boolean("negotiable").notNull().default(false),
    fields: jsonb("fields").$type<ListingFields>().notNull().default({}),
    locationPrivacy: text("location_privacy").$type<LocationPrivacy>().notNull().default("area"),
    showBuilding: boolean("show_building").notNull().default(false),
    youtubeUrl: text("youtube_url"),
    status: text("status").$type<ListingStatus>().notNull().default("draft"),
    visibility: text("visibility").$type<"private" | "network">().notNull().default("network"),
    /** Fields the AI flagged as missing / to confirm. */
    missing: jsonb("missing").$type<string[]>().notNull().default([]),
    aiGenerated: boolean("ai_generated").notNull().default(false),
    verifiedAt: ts("verified_at").notNull().defaultNow(),
    verifyAskedAt: ts("verify_asked_at"),
    disabledByAdmin: boolean("disabled_by_admin").notNull().default(false),
    /** Deal attribution: the lead this property was sold/rented to (pilot proof-of-value). */
    closedLeadId: text("closed_lead_id"),
    /** Set when the agent lowers the price: shown to buyers as "Price reduced" and used for price-drop alerts. */
    /** Overrides the agent's page look for this listing; null = use the agent's. */
    look: text("look").$type<PageLook>(),
    prevPrice: bigint("prev_price", { mode: "number" }),
    priceDroppedAt: timestamp("price_dropped_at", { withTimezone: true }),
    closedAt: ts("closed_at"),
    publishedAt: ts("published_at"),
    createdAt: created(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("listings_ref_uq").on(t.ref), index("listings_agent_idx").on(t.agentId, t.status)],
);

export type MediaKind = "image" | "video" | "doc";
export const media = pgTable(
  "media",
  {
    id: text("id").primaryKey(),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    listingId: text("listing_id").references(() => listings.id, { onDelete: "cascade" }),
    draftId: text("draft_id"),
    kind: text("kind").$type<MediaKind>().notNull(),
    /** Storage keys; image variants: lg (1600), md (900), sm (400). */
    key: text("key").notNull(),
    url: text("url").notNull(),
    urlMd: text("url_md"),
    urlSm: text("url_sm"),
    mime: text("mime"),
    bytes: integer("bytes"),
    width: integer("width"),
    height: integer("height"),
    hash: text("hash"),
    position: integer("position").notNull().default(0),
    createdAt: created(),
  },
  (t) => [index("media_listing_idx").on(t.listingId, t.position), index("media_draft_idx").on(t.draftId)],
);

/** WhatsApp batch being collected before the AI creates a listing. */
export const drafts = pgTable(
  "drafts",
  {
    id: text("id").primaryKey(),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    state: text("state").$type<"collecting" | "processing" | "done" | "failed" | "discarded">().notNull().default("collecting"),
    texts: jsonb("texts").$type<string[]>().notNull().default([]),
    audioKeys: jsonb("audio_keys").$type<string[]>().notNull().default([]),
    youtubeUrl: text("youtube_url"),
    location: jsonb("location").$type<{ lat: number; lng: number; name?: string } | null>(),
    listingId: text("listing_id"),
    error: text("error"),
    lastActivityAt: ts("last_activity_at").notNull().defaultNow(),
    createdAt: created(),
  },
  (t) => [index("drafts_agent_state_idx").on(t.agentId, t.state)],
);

/* ------------------------------------------------------------------ */
/* Leads, shares, collections                                          */
/* ------------------------------------------------------------------ */

export type LeadStage = "new" | "exploring" | "interested" | "visit" | "negotiating" | "closed" | "lost";
export type Requirement = {
  purpose?: Purpose;
  type?: PropertyType;
  bhk?: number[];
  budgetMin?: number;
  budgetMax?: number;
  localities?: string[];
  timeline?: string;
  notes?: string;
};

export const leads = pgTable(
  "leads",
  {
    id: text("id").primaryKey(),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    name: text("name").notNull().default(""),
    phone: text("phone"),
    phoneVerified: boolean("phone_verified").notNull().default(false),
    stage: text("stage").$type<LeadStage>().notNull().default("new"),
    source: text("source").$type<"share" | "manual" | "page" | "bot" | "import">().notNull().default("manual"),
    requirement: jsonb("requirement").$type<Requirement>().notNull().default({}),
    nextFollowUpAt: ts("next_follow_up_at"),
    followUpNote: text("follow_up_note"),
    lastActivityAt: ts("last_activity_at"),
    intentScore: integer("intent_score").notNull().default(0),
    /** Last time the agent called / messaged (clears the lead from "Needs attention" until new activity). */
    lastContactedAt: ts("last_contacted_at"),
    createdAt: created(),
  },
  (t) => [index("leads_agent_idx").on(t.agentId, t.lastActivityAt), index("leads_agent_phone_idx").on(t.agentId, t.phone)],
);

export const collections = pgTable(
  "collections",
  {
    id: text("id").primaryKey(),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    leadId: text("lead_id").references(() => leads.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    note: text("note"),
    listingIds: jsonb("listing_ids").$type<string[]>().notNull().default([]),
    createdAt: created(),
  },
  (t) => [index("collections_agent_idx").on(t.agentId)],
);

/** A link: one listing or one collection, optionally addressed to one lead. */
export const shares = pgTable(
  "shares",
  {
    code: text("code").primaryKey(),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    listingId: text("listing_id").references(() => listings.id, { onDelete: "cascade" }),
    collectionId: text("collection_id").references(() => collections.id, { onDelete: "cascade" }),
    leadId: text("lead_id").references(() => leads.id, { onDelete: "set null" }),
    channel: text("channel").notNull().default("whatsapp"),
    opens: integer("opens").notNull().default(0),
    firstOpenedAt: ts("first_opened_at"),
    lastOpenedAt: ts("last_opened_at"),
    createdAt: created(),
  },
  (t) => [index("shares_listing_idx").on(t.listingId), index("shares_lead_idx").on(t.leadId), index("shares_agent_idx").on(t.agentId)],
);

/** Anonymous buyer browser session; linked to a lead once identified. */
export const buyerSessions = pgTable(
  "buyer_sessions",
  {
    id: text("id").primaryKey(),
    agentId: text("agent_id").notNull(),
    leadId: text("lead_id"),
    firstShareCode: text("first_share_code"),
    device: text("device"),
    createdAt: created(),
    lastSeenAt: ts("last_seen_at").notNull().defaultNow(),
  },
  (t) => [index("buyer_sessions_lead_idx").on(t.leadId)],
);

export type EventType =
  | "open"
  | "gallery"
  | "video"
  | "map"
  | "call"
  | "whatsapp"
  | "save"
  | "unsave"
  | "react"
  | "rank"
  | "compare"
  | "ask"
  | "visit_request"
  | "share"
  | "requirement"
  | "place"
  | "dwell";

export const events = pgTable(
  "events",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    type: text("type").$type<EventType>().notNull(),
    agentId: text("agent_id").notNull(),
    shareCode: text("share_code"),
    listingId: text("listing_id"),
    collectionId: text("collection_id"),
    leadId: text("lead_id"),
    sessionId: text("session_id"),
    meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: created(),
  },
  (t) => [
    index("events_agent_idx").on(t.agentId, t.createdAt),
    index("events_lead_idx").on(t.leadId, t.createdAt),
    index("events_listing_idx").on(t.listingId),
    index("events_session_idx").on(t.sessionId),
  ],
);

/** Buyer's per-listing state (save / reaction / rank). Keyed by session, attached to lead when known. */
export const buyerActions = pgTable(
  "buyer_actions",
  {
    sessionId: text("session_id").notNull(),
    listingId: text("listing_id").notNull(),
    agentId: text("agent_id").notNull(),
    leadId: text("lead_id"),
    saved: boolean("saved").notNull().default(false),
    reaction: text("reaction").$type<"like" | "dislike" | null>(),
    rank: integer("rank"),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.sessionId, t.listingId] }), index("buyer_actions_lead_idx").on(t.leadId)],
);

export const questions = pgTable("questions", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").notNull(),
  leadId: text("lead_id"),
  listingId: text("listing_id"),
  text: text("text").notNull(),
  answeredAt: ts("answered_at"),
  createdAt: created(),
});

export type VisitStatus = "requested" | "confirmed" | "rescheduled" | "declined" | "completed" | "cancelled" | "no_show";
export const visits = pgTable(
  "visits",
  {
    id: text("id").primaryKey(),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    leadId: text("lead_id").references(() => leads.id, { onDelete: "set null" }),
    listingId: text("listing_id").references(() => listings.id, { onDelete: "set null" }),
    requestedDate: text("requested_date"), // YYYY-MM-DD
    requestedSlot: text("requested_slot").$type<"morning" | "afternoon" | "evening" | null>(),
    scheduledAt: ts("scheduled_at"),
    status: text("status").$type<VisitStatus>().notNull().default("requested"),
    outcome: text("outcome").$type<"liked" | "not_liked" | "negotiating" | null>(),
    message: text("message"),
    feedback: text("feedback"),
    remindedAt: ts("reminded_at"),
    createdAt: created(),
  },
  (t) => [index("visits_agent_idx").on(t.agentId, t.status)],
);

export const notes = pgTable(
  "notes",
  {
    id: text("id").primaryKey(),
    agentId: text("agent_id").notNull(),
    leadId: text("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    createdAt: created(),
  },
  (t) => [index("notes_lead_idx").on(t.leadId)],
);

/* ------------------------------------------------------------------ */
/* Notifications, jobs, ops                                            */
/* ------------------------------------------------------------------ */

export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    href: text("href"),
    important: boolean("important").notNull().default(false),
    readAt: ts("read_at"),
    createdAt: created(),
  },
  (t) => [index("notifications_agent_idx").on(t.agentId, t.createdAt)],
);

export const pushSubscriptions = pgTable("push_subscriptions", {
  endpoint: text("endpoint").primaryKey(),
  agentId: text("agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: created(),
});

export const jobs = pgTable(
  "jobs",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    status: text("status").$type<"pending" | "running" | "done" | "failed">().notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    runAt: ts("run_at").notNull().defaultNow(),
    lockedAt: ts("locked_at"),
    error: text("error"),
    createdAt: created(),
  },
  (t) => [index("jobs_pending_idx").on(t.status, t.runAt)],
);

/** Log of WhatsApp messages in both directions. Also acts as the outbox for the Baileys bridge. */
export const waMessages = pgTable(
  "wa_messages",
  {
    id: text("id").primaryKey(),
    direction: text("direction").$type<"in" | "out">().notNull(),
    phone: text("phone").notNull(),
    agentId: text("agent_id"),
    type: text("type").notNull(),
    text: text("text"),
    mediaUrl: text("media_url"),
    providerId: text("provider_id"),
    /** For outbound: queued (bridge picks up) → sent | failed. */
    status: text("status").$type<"received" | "queued" | "sent" | "failed">().notNull(),
    error: text("error"),
    createdAt: created(),
  },
  (t) => [index("wa_messages_phone_idx").on(t.phone, t.createdAt), index("wa_messages_status_idx").on(t.direction, t.status)],
);

export const feedback = pgTable("feedback", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").references(() => agents.id, { onDelete: "set null" }),
  text: text("text").notNull(),
  page: text("page"),
  resolved: boolean("resolved").notNull().default(false),
  createdAt: created(),
});

export const reports = pgTable("reports", {
  id: text("id").primaryKey(),
  listingId: text("listing_id").references(() => listings.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  details: text("details"),
  resolved: boolean("resolved").notNull().default(false),
  createdAt: created(),
});

export const dataRequests = pgTable("data_requests", {
  id: text("id").primaryKey(),
  phone: text("phone").notNull(),
  kind: text("kind").$type<"delete" | "export">().notNull(),
  details: text("details"),
  resolved: boolean("resolved").notNull().default(false),
  createdAt: created(),
});

export const announcements = pgTable("announcements", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  createdAt: created(),
});
