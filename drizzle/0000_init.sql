CREATE TABLE "agents" (
	"id" text PRIMARY KEY NOT NULL,
	"phone" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"company" text,
	"handle" text NOT NULL,
	"photo_url" text,
	"logo_url" text,
	"tagline" text,
	"city" text,
	"areas" text,
	"brand_color" text DEFAULT '#0f766e' NOT NULL,
	"welcome_mode" text DEFAULT 'minimal' NOT NULL,
	"watermark" boolean DEFAULT true NOT NULL,
	"network_opt_in" boolean DEFAULT true NOT NULL,
	"promise_accepted_at" timestamp with time zone,
	"onboarded" boolean DEFAULT false NOT NULL,
	"bot_context" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_inbound_at" timestamp with time zone,
	"disabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "buyer_actions" (
	"session_id" text NOT NULL,
	"listing_id" text NOT NULL,
	"agent_id" text NOT NULL,
	"lead_id" text,
	"saved" boolean DEFAULT false NOT NULL,
	"reaction" text,
	"rank" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "buyer_actions_session_id_listing_id_pk" PRIMARY KEY("session_id","listing_id")
);
--> statement-breakpoint
CREATE TABLE "buyer_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"lead_id" text,
	"first_share_code" text,
	"device" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"lead_id" text,
	"title" text NOT NULL,
	"note" text,
	"listing_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"phone" text NOT NULL,
	"kind" text NOT NULL,
	"details" text,
	"resolved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drafts" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"state" text DEFAULT 'collecting' NOT NULL,
	"texts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"audio_keys" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"youtube_url" text,
	"location" jsonb,
	"listing_id" text,
	"error" text,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"type" text NOT NULL,
	"agent_id" text NOT NULL,
	"share_code" text,
	"listing_id" text,
	"collection_id" text,
	"lead_id" text,
	"session_id" text,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text,
	"text" text NOT NULL,
	"page" text,
	"resolved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"run_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp with time zone,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"phone" text,
	"phone_verified" boolean DEFAULT false NOT NULL,
	"stage" text DEFAULT 'new' NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"requirement" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"next_follow_up_at" timestamp with time zone,
	"follow_up_note" text,
	"last_activity_at" timestamp with time zone,
	"intent_score" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" text PRIMARY KEY NOT NULL,
	"ref" text NOT NULL,
	"agent_id" text NOT NULL,
	"property_id" text NOT NULL,
	"purpose" text DEFAULT 'sale' NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price_mode" text DEFAULT 'exact' NOT NULL,
	"price" bigint,
	"price_max" bigint,
	"negotiable" boolean DEFAULT false NOT NULL,
	"fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"location_privacy" text DEFAULT 'area' NOT NULL,
	"show_building" boolean DEFAULT false NOT NULL,
	"youtube_url" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"visibility" text DEFAULT 'network' NOT NULL,
	"missing" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ai_generated" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp with time zone DEFAULT now() NOT NULL,
	"verify_asked_at" timestamp with time zone,
	"disabled_by_admin" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_tokens" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"listing_id" text,
	"draft_id" text,
	"kind" text NOT NULL,
	"key" text NOT NULL,
	"url" text NOT NULL,
	"url_md" text,
	"url_sm" text,
	"mime" text,
	"bytes" integer,
	"width" integer,
	"height" integer,
	"hash" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"lead_id" text NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"href" text,
	"important" boolean DEFAULT false NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"method" text NOT NULL,
	"months" integer DEFAULT 1 NOT NULL,
	"amount_inr" integer NOT NULL,
	"reference" text,
	"order_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"note" text,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text DEFAULT 'flat' NOT NULL,
	"locality" text,
	"city" text,
	"lat" double precision,
	"lng" double precision,
	"building" text,
	"unit" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"endpoint" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"lead_id" text,
	"listing_id" text,
	"text" text NOT NULL,
	"answered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text,
	"reason" text NOT NULL,
	"details" text,
	"resolved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shares" (
	"code" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"listing_id" text,
	"collection_id" text,
	"lead_id" text,
	"channel" text DEFAULT 'whatsapp' NOT NULL,
	"opens" integer DEFAULT 0 NOT NULL,
	"first_opened_at" timestamp with time zone,
	"last_opened_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"agent_id" text PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'trial' NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"price_inr" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visits" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"lead_id" text,
	"listing_id" text,
	"requested_date" text,
	"requested_slot" text,
	"scheduled_at" timestamp with time zone,
	"status" text DEFAULT 'requested' NOT NULL,
	"outcome" text,
	"message" text,
	"feedback" text,
	"reminded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wa_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"direction" text NOT NULL,
	"phone" text NOT NULL,
	"agent_id" text,
	"type" text NOT NULL,
	"text" text,
	"media_url" text,
	"provider_id" text,
	"status" text NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wa_verifications" (
	"code" text PRIMARY KEY NOT NULL,
	"purpose" text NOT NULL,
	"session_id" text,
	"share_code" text,
	"phone" text,
	"verified_at" timestamp with time zone,
	"consumed_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drafts" ADD CONSTRAINT "drafts_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "login_tokens" ADD CONSTRAINT "login_tokens_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shares" ADD CONSTRAINT "shares_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shares" ADD CONSTRAINT "shares_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shares" ADD CONSTRAINT "shares_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shares" ADD CONSTRAINT "shares_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agents_phone_uq" ON "agents" USING btree ("phone");--> statement-breakpoint
CREATE UNIQUE INDEX "agents_handle_uq" ON "agents" USING btree ("handle");--> statement-breakpoint
CREATE INDEX "buyer_actions_lead_idx" ON "buyer_actions" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "buyer_sessions_lead_idx" ON "buyer_sessions" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "collections_agent_idx" ON "collections" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "drafts_agent_state_idx" ON "drafts" USING btree ("agent_id","state");--> statement-breakpoint
CREATE INDEX "events_agent_idx" ON "events" USING btree ("agent_id","created_at");--> statement-breakpoint
CREATE INDEX "events_lead_idx" ON "events" USING btree ("lead_id","created_at");--> statement-breakpoint
CREATE INDEX "events_listing_idx" ON "events" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "events_session_idx" ON "events" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "jobs_pending_idx" ON "jobs" USING btree ("status","run_at");--> statement-breakpoint
CREATE INDEX "leads_agent_idx" ON "leads" USING btree ("agent_id","last_activity_at");--> statement-breakpoint
CREATE INDEX "leads_agent_phone_idx" ON "leads" USING btree ("agent_id","phone");--> statement-breakpoint
CREATE UNIQUE INDEX "listings_ref_uq" ON "listings" USING btree ("ref");--> statement-breakpoint
CREATE INDEX "listings_agent_idx" ON "listings" USING btree ("agent_id","status");--> statement-breakpoint
CREATE INDEX "media_listing_idx" ON "media" USING btree ("listing_id","position");--> statement-breakpoint
CREATE INDEX "media_draft_idx" ON "media" USING btree ("draft_id");--> statement-breakpoint
CREATE INDEX "notes_lead_idx" ON "notes" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "notifications_agent_idx" ON "notifications" USING btree ("agent_id","created_at");--> statement-breakpoint
CREATE INDEX "payments_agent_idx" ON "payments" USING btree ("agent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_order_uq" ON "payments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "properties_locality_idx" ON "properties" USING btree ("city","locality");--> statement-breakpoint
CREATE INDEX "shares_listing_idx" ON "shares" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "shares_lead_idx" ON "shares" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "shares_agent_idx" ON "shares" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "visits_agent_idx" ON "visits" USING btree ("agent_id","status");--> statement-breakpoint
CREATE INDEX "wa_messages_phone_idx" ON "wa_messages" USING btree ("phone","created_at");--> statement-breakpoint
CREATE INDEX "wa_messages_status_idx" ON "wa_messages" USING btree ("direction","status");