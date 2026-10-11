import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_salons_feature_overrides_feature" AS ENUM('catalog', 'gallery', 'booking', 'deposits', 'customers', 'visits', 'payments', 'wallet', 'giftCards', 'messaging', 'loyalty', 'tiers', 'walletPass', 'referrals', 'reviews', 'campaigns', 'festivalPacks', 'contests', 'contentEngine', 'reports', 'tryOn', 'aiTryOn', 'discovery', 'groupBooking', 'multiBranch', 'customTheme');
  CREATE TYPE "public"."enum_salons_home_sections_section" AS ENUM('hero', 'nextVisit', 'offers', 'newDesigns', 'services', 'gallery', 'loyalty', 'invite', 'contest', 'artists', 'reviews', 'visit');
  CREATE TYPE "public"."enum_salons_languages" AS ENUM('en', 'gu', 'hi');
  CREATE TYPE "public"."enum_salons_hours_day" AS ENUM('sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat');
  CREATE TYPE "public"."enum_salons_plan" AS ENUM('starter', 'studio', 'growth');
  CREATE TYPE "public"."enum_salons_status" AS ENUM('trial', 'active', 'suspended', 'demo');
  CREATE TYPE "public"."enum_salons_theme" AS ENUM('default', 'luxe', 'minimal', 'custom');
  CREATE TYPE "public"."enum_users_role" AS ENUM('platform-admin', 'owner', 'manager', 'artist');
  CREATE TYPE "public"."enum_media_kind" AS ENUM('general', 'design', 'visit', 'inspiration', 'share-kit', 'try-on', 'brand');
  CREATE TYPE "public"."enum_events_actor_type" AS ENUM('customer', 'staff', 'system', 'platform');
  CREATE TYPE "public"."enum_cost_ledger_kind" AS ENUM('whatsapp-utility', 'whatsapp-marketing', 'whatsapp-auth', 'sms', 'ai-image');
  CREATE TYPE "public"."enum_subscriptions_plan" AS ENUM('starter', 'studio', 'growth');
  CREATE TYPE "public"."enum_subscriptions_status" AS ENUM('pending', 'active', 'past-due', 'cancelled');
  CREATE TYPE "public"."enum_subscriptions_billing_cycle" AS ENUM('monthly', 'annual');
  CREATE TYPE "public"."enum_services_category" AS ENUM('gel', 'extensions', 'nail-art', 'manicure', 'pedicure', 'refill', 'removal', 'add-on', 'bridal', 'lashes', 'brows', 'other');
  CREATE TYPE "public"."enum_services_requires_deposit" AS ENUM('auto', 'always', 'never');
  CREATE TYPE "public"."enum_packages_kind" AS ENUM('bundle', 'prepaid-credit');
  CREATE TYPE "public"."enum_designs_occasions" AS ENUM('everyday', 'office', 'party', 'wedding', 'garba', 'festive', 'vacation', 'date-night');
  CREATE TYPE "public"."enum_designs_category" AS ENUM('nail-art', 'french', 'chrome', 'cat-eye', 'ombre', 'minimal', 'bridal', 'glitter', 'solid', '3d');
  CREATE TYPE "public"."enum_designs_shape" AS ENUM('almond', 'coffin', 'square', 'oval', 'stiletto', 'round', 'squoval');
  CREATE TYPE "public"."enum_designs_length" AS ENUM('short', 'medium', 'long', 'extra-long');
  CREATE TYPE "public"."enum_designs_source" AS ENUM('staff', 'customer');
  CREATE TYPE "public"."enum__designs_v_version_occasions" AS ENUM('everyday', 'office', 'party', 'wedding', 'garba', 'festive', 'vacation', 'date-night');
  CREATE TYPE "public"."enum__designs_v_version_category" AS ENUM('nail-art', 'french', 'chrome', 'cat-eye', 'ombre', 'minimal', 'bridal', 'glitter', 'solid', '3d');
  CREATE TYPE "public"."enum__designs_v_version_shape" AS ENUM('almond', 'coffin', 'square', 'oval', 'stiletto', 'round', 'squoval');
  CREATE TYPE "public"."enum__designs_v_version_length" AS ENUM('short', 'medium', 'long', 'extra-long');
  CREATE TYPE "public"."enum__designs_v_version_source" AS ENUM('staff', 'customer');
  CREATE TYPE "public"."enum_customers_language" AS ENUM('en', 'gu', 'hi');
  CREATE TYPE "public"."enum_customers_source" AS ENUM('instagram', 'google', 'qr', 'whatsapp', 'referral', 'walk-in', 'contest', 'gift', 'discovery', 'direct', 'import');
  CREATE TYPE "public"."enum_customers_segment" AS ENUM('lead', 'new', 'regular', 'due', 'at-risk', 'lapsed');
  CREATE TYPE "public"."enum_availability_weekly_day" AS ENUM('sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat');
  CREATE TYPE "public"."enum_appointments_status" AS ENUM('requested', 'confirmed', 'completed', 'cancelled', 'no-show');
  CREATE TYPE "public"."enum_waitlist_status" AS ENUM('waiting', 'offered', 'booked', 'expired');
  CREATE TYPE "public"."enum_group_bookings_status" AS ENUM('open', 'full', 'cancelled');
  CREATE TYPE "public"."enum_visits_payment_mode" AS ENUM('upi', 'cash', 'card', 'payment-link', 'wallet', 'package', 'mixed');
  CREATE TYPE "public"."enum_visits_paid_status" AS ENUM('paid', 'pending');
  CREATE TYPE "public"."enum_payments_kind" AS ENUM('deposit', 'visit', 'package', 'gift-card', 'wallet-topup');
  CREATE TYPE "public"."enum_payments_status" AS ENUM('created', 'captured', 'failed', 'refunded', 'expired');
  CREATE TYPE "public"."enum_wallet_entries_reason" AS ENUM('top-up', 'bonus', 'gift-card', 'visit', 'refund', 'adjustment', 'reward');
  CREATE TYPE "public"."enum_gift_cards_kind" AS ENUM('gift', 'referral-invite');
  CREATE TYPE "public"."enum_gift_cards_status" AS ENUM('pending', 'active', 'redeemed', 'expired');
  CREATE TYPE "public"."enum_customer_packages_status" AS ENUM('active', 'used', 'expired');
  CREATE TYPE "public"."enum_loyalty_accounts_tier" AS ENUM('member', 'silver', 'gold');
  CREATE TYPE "public"."enum_rewards_kind" AS ENUM('first-visit', 'next-visit', 'stamp-card', 'birthday', 'referral', 'winback', 'offer', 'contest', 'manual');
  CREATE TYPE "public"."enum_rewards_value_type" AS ENUM('amount', 'percent', 'freebie');
  CREATE TYPE "public"."enum_rewards_status" AS ENUM('active', 'redeemed', 'expired', 'cancelled');
  CREATE TYPE "public"."enum_referrals_channel" AS ENUM('whatsapp', 'status', 'instagram', 'link', 'qr');
  CREATE TYPE "public"."enum_referrals_status" AS ENUM('sent', 'joined', 'visited', 'rewarded', 'rejected');
  CREATE TYPE "public"."enum_ratings_follow_up" AS ENUM('none', 'needed', 'called', 'resolved');
  CREATE TYPE "public"."enum_feedback_reason" AS ENUM('price', 'quality', 'distance', 'time', 'moved', 'tried-elsewhere', 'other');
  CREATE TYPE "public"."enum_offers_audience" AS ENUM('lead', 'new', 'regular', 'due', 'at-risk', 'lapsed');
  CREATE TYPE "public"."enum_offers_kind" AS ENUM('offer', 'slot-filler', 'festival', 'first-visit', 'package-promo');
  CREATE TYPE "public"."enum_offers_value_type" AS ENUM('amount', 'percent', 'freebie');
  CREATE TYPE "public"."enum_offers_status" AS ENUM('draft', 'live', 'ended');
  CREATE TYPE "public"."enum_campaign_packs_value_type" AS ENUM('amount', 'percent', 'freebie');
  CREATE TYPE "public"."enum_tracking_links_source" AS ENUM('qr', 'instagram', 'whatsapp', 'google', 'poster', 'partner', 'influencer', 'other');
  CREATE TYPE "public"."enum_contests_status" AS ENUM('open', 'closed');
  CREATE TYPE "public"."enum_photo_tasks_shared_to" AS ENUM('instagram', 'whatsapp-status', 'whatsapp', 'other');
  CREATE TYPE "public"."enum_photo_tasks_status" AS ENUM('pending', 'sent', 'shared', 'verified');
  CREATE TYPE "public"."enum_articles_kind" AS ENUM('aftercare', 'trend', 'guide');
  CREATE TYPE "public"."enum_articles_language" AS ENUM('en', 'hi', 'gu');
  CREATE TYPE "public"."enum_message_templates_key" AS ENUM('otp', 'booking_received', 'booking_confirmed', 'booking_reminder', 'booking_cancelled', 'waitlist_offer', 'nails_ready', 'rating_request', 'thanks_review', 'aftercare', 'refill_heads_up', 'refill_due', 'nudge_new_designs', 'winback', 'last_chance_survey', 'reward_issued', 'referral_converted', 'gift_received', 'offer', 'owner_new_booking', 'owner_low_rating', 'owner_daily_summary');
  CREATE TYPE "public"."enum_message_templates_language" AS ENUM('en', 'hi', 'gu');
  CREATE TYPE "public"."enum_message_templates_approval" AS ENUM('draft', 'submitted', 'approved', 'rejected');
  CREATE TYPE "public"."enum_messages_audience" AS ENUM('customer', 'owner');
  CREATE TYPE "public"."enum_messages_category" AS ENUM('utility', 'marketing', 'authentication', 'service');
  CREATE TYPE "public"."enum_messages_status" AS ENUM('sent', 'queued', 'failed', 'skipped');
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'dispatch-event', 'module-step', 'customers-nightly-segments', 'loyalty-birthdays-and-expiry', 'campaigns-end-offers', 'contests-close-ended', 'messaging-owner-daily-summary');
  CREATE TYPE "public"."enum_payload_jobs_log_state" AS ENUM('failed', 'succeeded');
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'dispatch-event', 'module-step', 'customers-nightly-segments', 'loyalty-birthdays-and-expiry', 'campaigns-end-offers', 'contests-close-ended', 'messaging-owner-daily-summary');
  CREATE TABLE "salons_feature_overrides" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"feature" "enum_salons_feature_overrides_feature" NOT NULL,
  	"enabled" boolean DEFAULT true
  );
  
  CREATE TABLE "salons_home_sections" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"section" "enum_salons_home_sections_section" NOT NULL,
  	"visible" boolean DEFAULT true
  );
  
  CREATE TABLE "salons_languages" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_salons_languages",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "salons_hours" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"day" "enum_salons_hours_day" NOT NULL,
  	"open" varchar DEFAULT '10:00',
  	"close" varchar DEFAULT '20:00',
  	"closed" boolean DEFAULT false
  );
  
  CREATE TABLE "salons_domains" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"domain" varchar NOT NULL
  );
  
  CREATE TABLE "salons" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"plan" "enum_salons_plan" DEFAULT 'studio' NOT NULL,
  	"status" "enum_salons_status" DEFAULT 'active' NOT NULL,
  	"tagline" varchar,
  	"about" varchar,
  	"theme" "enum_salons_theme" DEFAULT 'default',
  	"brand_logo_id" integer,
  	"brand_cover_id" integer,
  	"brand_primary_color" varchar,
  	"brand_accent_color" varchar,
  	"brand_background_color" varchar,
  	"brand_heading_font" varchar,
  	"brand_body_font" varchar,
  	"seasonal_highlight" varchar,
  	"contact_phone" varchar,
  	"contact_whatsapp" varchar,
  	"contact_email" varchar,
  	"contact_instagram" varchar,
  	"contact_address" varchar,
  	"contact_area" varchar,
  	"contact_city" varchar DEFAULT 'Vadodara',
  	"contact_map_url" varchar,
  	"contact_google_place_id" varchar,
  	"contact_parking" varchar,
  	"timezone" varchar DEFAULT 'Asia/Kolkata',
  	"razorpay_account_id" varchar,
  	"upi_vpa" varchar,
  	"whatsapp_sender" varchar,
  	"settings_auto_confirm_bookings" boolean DEFAULT false,
  	"settings_slot_step_minutes" numeric DEFAULT 15,
  	"settings_booking_horizon_days" numeric DEFAULT 30,
  	"settings_deposit_min_minutes" numeric DEFAULT 90,
  	"settings_deposit_percent" numeric DEFAULT 20,
  	"settings_cancellation_policy" varchar DEFAULT 'Free cancellation up to 4 hours before. Deposits are refundable up to 24 hours before.',
  	"settings_stamps_for_reward" numeric DEFAULT 6,
  	"settings_points_per100" numeric DEFAULT 5,
  	"settings_silver_after_visits" numeric DEFAULT 4,
  	"settings_gold_after_visits" numeric DEFAULT 10,
  	"settings_discount_budget_percent" numeric DEFAULT 5,
  	"settings_promo_per_week" numeric DEFAULT 1,
  	"settings_promo_per_month" numeric DEFAULT 3,
  	"settings_first_visit_discount" numeric DEFAULT 20000,
  	"settings_referral_friend_reward" numeric DEFAULT 20000,
  	"settings_referral_referrer_reward" numeric DEFAULT 20000,
  	"settings_review_delay_hours" numeric DEFAULT 2,
  	"settings_aftercare_days" numeric DEFAULT 3,
  	"settings_refill_heads_up_days" numeric DEFAULT 5,
  	"settings_nudge_days" numeric DEFAULT 15,
  	"settings_winback_days" numeric DEFAULT 30,
  	"settings_last_chance_days" numeric DEFAULT 60,
  	"settings_google_review_url" varchar,
  	"settings_daily_summary_hour" numeric DEFAULT 9,
  	"settings_ai_try_on_credits" numeric DEFAULT 0,
  	"settings_ai_try_on_per_customer" numeric DEFAULT 3,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "users_tenants" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tenant_id" integer NOT NULL
  );
  
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"phone" varchar,
  	"role" "enum_users_role" DEFAULT 'artist' NOT NULL,
  	"avatar_id" integer,
  	"bio" varchar,
  	"bookable" boolean DEFAULT true,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "users_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"alt" varchar,
  	"kind" "enum_media_kind" DEFAULT 'general',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumb_url" varchar,
  	"sizes_thumb_width" numeric,
  	"sizes_thumb_height" numeric,
  	"sizes_thumb_mime_type" varchar,
  	"sizes_thumb_filesize" numeric,
  	"sizes_thumb_filename" varchar,
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar,
  	"sizes_large_url" varchar,
  	"sizes_large_width" numeric,
  	"sizes_large_height" numeric,
  	"sizes_large_mime_type" varchar,
  	"sizes_large_filesize" numeric,
  	"sizes_large_filename" varchar
  );
  
  CREATE TABLE "events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"type" varchar NOT NULL,
  	"actor_type" "enum_events_actor_type" DEFAULT 'system',
  	"actor_id" varchar,
  	"payload" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cost_ledger" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"kind" "enum_cost_ledger_kind" NOT NULL,
  	"units" numeric DEFAULT 1,
  	"unit_cost" numeric DEFAULT 0,
  	"total" numeric DEFAULT 0,
  	"period" varchar,
  	"reference" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "subscriptions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"plan" "enum_subscriptions_plan" NOT NULL,
  	"monthly_price" numeric DEFAULT 0,
  	"setup_fee" numeric DEFAULT 0,
  	"status" "enum_subscriptions_status" DEFAULT 'pending',
  	"billing_cycle" "enum_subscriptions_billing_cycle" DEFAULT 'monthly',
  	"founding_customer" boolean DEFAULT false,
  	"razorpay_subscription_id" varchar,
  	"next_billing_date" timestamp(3) with time zone,
  	"support_minutes_this_month" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "audit_log" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"action" varchar NOT NULL,
  	"actor_id" integer,
  	"details" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "services" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"name" varchar NOT NULL,
  	"category" "enum_services_category" DEFAULT 'gel' NOT NULL,
  	"description" varchar,
  	"price" numeric DEFAULT 0 NOT NULL,
  	"duration_minutes" numeric DEFAULT 60 NOT NULL,
  	"is_add_on" boolean DEFAULT false,
  	"cycle_days" numeric,
  	"requires_deposit" "enum_services_requires_deposit" DEFAULT 'auto',
  	"lasts_days" numeric,
  	"aftercare" varchar,
  	"order" numeric DEFAULT 0,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "services_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "packages_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"service_id" integer,
  	"quantity" numeric DEFAULT 1
  );
  
  CREATE TABLE "packages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"name" varchar NOT NULL,
  	"description" varchar,
  	"kind" "enum_packages_kind" DEFAULT 'bundle',
  	"price" numeric DEFAULT 0 NOT NULL,
  	"credit_value" numeric DEFAULT 0,
  	"validity_days" numeric DEFAULT 180,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "designs_occasions" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_designs_occasions",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "designs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"title" varchar NOT NULL,
  	"description" varchar,
  	"category" "enum_designs_category" DEFAULT 'nail-art',
  	"shape" "enum_designs_shape",
  	"length" "enum_designs_length",
  	"service_id" integer,
  	"price_from" numeric DEFAULT 0,
  	"duration_minutes" numeric,
  	"artist_id" integer,
  	"source" "enum_designs_source" DEFAULT 'staff',
  	"customer_id" integer,
  	"customer_consent" boolean DEFAULT false,
  	"featured" boolean DEFAULT false,
  	"published" boolean DEFAULT true,
  	"likes" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "designs_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "designs_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer,
  	"services_id" integer
  );
  
  CREATE TABLE "_designs_v_version_occasions" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__designs_v_version_occasions",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_designs_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_tenant_id" integer,
  	"version_title" varchar NOT NULL,
  	"version_description" varchar,
  	"version_category" "enum__designs_v_version_category" DEFAULT 'nail-art',
  	"version_shape" "enum__designs_v_version_shape",
  	"version_length" "enum__designs_v_version_length",
  	"version_service_id" integer,
  	"version_price_from" numeric DEFAULT 0,
  	"version_duration_minutes" numeric,
  	"version_artist_id" integer,
  	"version_source" "enum__designs_v_version_source" DEFAULT 'staff',
  	"version_customer_id" integer,
  	"version_customer_consent" boolean DEFAULT false,
  	"version_featured" boolean DEFAULT false,
  	"version_published" boolean DEFAULT true,
  	"version_likes" numeric DEFAULT 0,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_designs_v_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "_designs_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer,
  	"services_id" integer
  );
  
  CREATE TABLE "moodboards" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"customer_id" integer NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "moodboards_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"designs_id" integer
  );
  
  CREATE TABLE "customers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"name" varchar,
  	"phone" varchar NOT NULL,
  	"birthday" timestamp(3) with time zone,
  	"language" "enum_customers_language" DEFAULT 'en',
  	"consents_marketing" boolean DEFAULT false,
  	"consents_marketing_at" timestamp(3) with time zone,
  	"consents_gallery" boolean DEFAULT false,
  	"consents_contest" boolean DEFAULT false,
  	"consents_source" varchar,
  	"source" "enum_customers_source" DEFAULT 'direct',
  	"source_detail" varchar,
  	"referral_code" varchar,
  	"referred_by_id" integer,
  	"hand_profile_shape" varchar,
  	"hand_profile_length" varchar,
  	"hand_profile_skin_tone" varchar,
  	"hand_profile_sensitivities" varchar,
  	"preferred_artist_id" integer,
  	"notes" varchar,
  	"segment" "enum_customers_segment" DEFAULT 'lead',
  	"is_vip" boolean DEFAULT false,
  	"visit_count" numeric DEFAULT 0,
  	"lifetime_spend" numeric DEFAULT 0,
  	"last_visit_at" timestamp(3) with time zone,
  	"next_due_date" timestamp(3) with time zone,
  	"push_subscriptions" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "customers_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "otp_codes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"phone" varchar NOT NULL,
  	"purpose" varchar DEFAULT 'login',
  	"code_hash" varchar NOT NULL,
  	"expires_at" timestamp(3) with time zone NOT NULL,
  	"attempts" numeric DEFAULT 0,
  	"consumed" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "availability_weekly" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"day" "enum_availability_weekly_day" NOT NULL,
  	"start" varchar DEFAULT '10:00',
  	"end" varchar DEFAULT '20:00',
  	"off" boolean DEFAULT false
  );
  
  CREATE TABLE "availability_breaks" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"start" varchar NOT NULL,
  	"end" varchar NOT NULL
  );
  
  CREATE TABLE "availability_time_off" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"from" timestamp(3) with time zone NOT NULL,
  	"to" timestamp(3) with time zone NOT NULL,
  	"reason" varchar
  );
  
  CREATE TABLE "availability" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"staff_id" integer NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "appointments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"customer_id" integer NOT NULL,
  	"staff_id" integer,
  	"design_id" integer,
  	"start" timestamp(3) with time zone NOT NULL,
  	"end" timestamp(3) with time zone NOT NULL,
  	"status" "enum_appointments_status" DEFAULT 'requested' NOT NULL,
  	"quoted_total" numeric DEFAULT 0,
  	"deposit_required" numeric DEFAULT 0,
  	"deposit_paid" boolean DEFAULT false,
  	"deposit_payment_id" integer,
  	"source" varchar DEFAULT 'app',
  	"pre_booked" boolean DEFAULT false,
  	"group_id" integer,
  	"notes" varchar,
  	"cancel_reason" varchar,
  	"reminders_sent" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "appointments_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"services_id" integer,
  	"media_id" integer
  );
  
  CREATE TABLE "waitlist" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"customer_id" integer NOT NULL,
  	"date" varchar NOT NULL,
  	"from" varchar DEFAULT '10:00',
  	"to" varchar DEFAULT '20:00',
  	"status" "enum_waitlist_status" DEFAULT 'waiting',
  	"offered_start" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "waitlist_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"services_id" integer
  );
  
  CREATE TABLE "group_bookings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"organiser_id" integer NOT NULL,
  	"code" varchar NOT NULL,
  	"occasion" varchar,
  	"start" timestamp(3) with time zone NOT NULL,
  	"size" numeric DEFAULT 2,
  	"status" "enum_group_bookings_status" DEFAULT 'open',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "visits_lines" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"service_id" integer,
  	"name" varchar NOT NULL,
  	"price" numeric DEFAULT 0,
  	"quantity" numeric DEFAULT 1
  );
  
  CREATE TABLE "visits" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"customer_id" integer NOT NULL,
  	"appointment_id" integer,
  	"staff_id" integer,
  	"subtotal" numeric DEFAULT 0,
  	"manual_discount" numeric DEFAULT 0,
  	"reward_id" integer,
  	"reward_discount" numeric DEFAULT 0,
  	"wallet_applied" numeric DEFAULT 0,
  	"customer_package_id" integer,
  	"package_covered" numeric DEFAULT 0,
  	"total" numeric DEFAULT 0,
  	"payment_mode" "enum_visits_payment_mode" DEFAULT 'upi',
  	"payment_id" integer,
  	"paid_status" "enum_visits_paid_status" DEFAULT 'paid',
  	"design_id" integer,
  	"design_name" varchar,
  	"is_first_visit" boolean DEFAULT false,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "visits_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "payments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"kind" "enum_payments_kind" NOT NULL,
  	"amount" numeric DEFAULT 0 NOT NULL,
  	"status" "enum_payments_status" DEFAULT 'created',
  	"customer_id" integer,
  	"appointment_id" integer,
  	"visit_id" integer,
  	"package_id" integer,
  	"gift_card_id" integer,
  	"description" varchar,
  	"provider" varchar,
  	"provider_link_id" varchar,
  	"provider_payment_id" varchar,
  	"link_url" varchar,
  	"upi_uri" varchar,
  	"captured_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "wallet_entries" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"customer_id" integer NOT NULL,
  	"amount" numeric NOT NULL,
  	"reason" "enum_wallet_entries_reason" NOT NULL,
  	"reference" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "gift_cards" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"code" varchar NOT NULL,
  	"value" numeric DEFAULT 0 NOT NULL,
  	"kind" "enum_gift_cards_kind" DEFAULT 'gift',
  	"buyer_id" integer,
  	"recipient_phone" varchar,
  	"recipient_name" varchar,
  	"message" varchar,
  	"occasion" varchar,
  	"status" "enum_gift_cards_status" DEFAULT 'pending',
  	"redeemed_by_id" integer,
  	"expires_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "customer_packages_remaining" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"service_id" integer NOT NULL,
  	"quantity" numeric DEFAULT 0
  );
  
  CREATE TABLE "customer_packages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"customer_id" integer NOT NULL,
  	"package_id" integer NOT NULL,
  	"expires_at" timestamp(3) with time zone,
  	"status" "enum_customer_packages_status" DEFAULT 'active',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "loyalty_accounts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"customer_id" integer NOT NULL,
  	"stamps" numeric DEFAULT 0,
  	"points" numeric DEFAULT 0,
  	"tier" "enum_loyalty_accounts_tier" DEFAULT 'member',
  	"lifetime_stamps" numeric DEFAULT 0,
  	"wallet_pass_id" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "rewards" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"customer_id" integer NOT NULL,
  	"kind" "enum_rewards_kind" NOT NULL,
  	"title" varchar NOT NULL,
  	"value_type" "enum_rewards_value_type" DEFAULT 'amount' NOT NULL,
  	"value" numeric DEFAULT 0,
  	"freebie" varchar,
  	"min_spend" numeric DEFAULT 0,
  	"is_discount" boolean DEFAULT true,
  	"scratch" boolean DEFAULT false,
  	"revealed" boolean DEFAULT true,
  	"code" varchar,
  	"valid_from" timestamp(3) with time zone,
  	"valid_to" timestamp(3) with time zone,
  	"status" "enum_rewards_status" DEFAULT 'active',
  	"redeemed_visit_id" integer,
  	"source" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "referrals" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"referrer_id" integer NOT NULL,
  	"invitee_id" integer,
  	"invitee_phone" varchar,
  	"channel" "enum_referrals_channel" DEFAULT 'whatsapp',
  	"status" "enum_referrals_status" DEFAULT 'sent',
  	"converted_at" timestamp(3) with time zone,
  	"reject_reason" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "ratings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"visit_id" integer,
  	"customer_id" integer NOT NULL,
  	"staff_id" integer,
  	"score" numeric NOT NULL,
  	"comment" varchar,
  	"google_link_shown" boolean DEFAULT false,
  	"follow_up" "enum_ratings_follow_up" DEFAULT 'none',
  	"follow_up_note" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "feedback" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"customer_id" integer,
  	"reason" "enum_feedback_reason",
  	"comment" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "offers_audience" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_offers_audience",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "offers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"title" varchar NOT NULL,
  	"description" varchar,
  	"image_id" integer,
  	"kind" "enum_offers_kind" DEFAULT 'offer',
  	"value_type" "enum_offers_value_type" DEFAULT 'percent',
  	"value" numeric DEFAULT 10,
  	"freebie" varchar,
  	"slot_date" varchar,
  	"slot_from" varchar,
  	"slot_to" varchar,
  	"pack_id" integer,
  	"code" varchar,
  	"starts_at" timestamp(3) with time zone,
  	"ends_at" timestamp(3) with time zone,
  	"status" "enum_offers_status" DEFAULT 'draft',
  	"show_on_home" boolean DEFAULT true,
  	"claims" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "offers_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"services_id" integer
  );
  
  CREATE TABLE "campaign_packs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"festival" varchar NOT NULL,
  	"starts_on" timestamp(3) with time zone NOT NULL,
  	"ends_on" timestamp(3) with time zone NOT NULL,
  	"pitch" varchar,
  	"offer_title" varchar NOT NULL,
  	"offer_description" varchar,
  	"value_type" "enum_campaign_packs_value_type" DEFAULT 'percent',
  	"value" numeric DEFAULT 10,
  	"gallery_tag" varchar,
  	"frame" varchar,
  	"image_id" integer,
  	"deposit_recommended" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "tracking_links" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"label" varchar NOT NULL,
  	"code" varchar NOT NULL,
  	"source" "enum_tracking_links_source" DEFAULT 'qr',
  	"target" varchar DEFAULT '/',
  	"clicks" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "contests" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"title" varchar DEFAULT 'Nail of the Month' NOT NULL,
  	"theme" varchar,
  	"prize" varchar DEFAULT 'A free nail set',
  	"starts_at" timestamp(3) with time zone NOT NULL,
  	"ends_at" timestamp(3) with time zone NOT NULL,
  	"status" "enum_contests_status" DEFAULT 'open',
  	"terms" varchar DEFAULT 'One vote per phone number. Winner is the entry with the most votes when voting closes. This contest is run by the salon and is not sponsored, endorsed or administered by Instagram or Meta.',
  	"winner_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "contest_entries" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"contest_id" integer NOT NULL,
  	"customer_id" integer NOT NULL,
  	"photo_id" integer NOT NULL,
  	"design_name" varchar,
  	"visit_id" integer,
  	"votes" numeric DEFAULT 0,
  	"approved" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "contest_votes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"contest_id" integer NOT NULL,
  	"entry_id" integer NOT NULL,
  	"voter_phone" varchar NOT NULL,
  	"voter_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "photo_tasks_shared_to" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_photo_tasks_shared_to",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "photo_tasks" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"visit_id" integer NOT NULL,
  	"customer_id" integer NOT NULL,
  	"staff_id" integer,
  	"design_name" varchar,
  	"frame" varchar DEFAULT 'classic',
  	"story_id" integer,
  	"status_image_id" integer,
  	"square_id" integer,
  	"status" "enum_photo_tasks_status" DEFAULT 'pending',
  	"gallery_consent" boolean DEFAULT false,
  	"gallery_design_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "photo_tasks_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "articles" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"kind" "enum_articles_kind" DEFAULT 'aftercare',
  	"language" "enum_articles_language" DEFAULT 'en',
  	"summary" varchar,
  	"body" varchar NOT NULL,
  	"cover_id" integer,
  	"published" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "articles_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "message_templates" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"key" "enum_message_templates_key" NOT NULL,
  	"language" "enum_message_templates_language" DEFAULT 'en' NOT NULL,
  	"text" varchar NOT NULL,
  	"provider_template_id" varchar,
  	"approval" "enum_message_templates_approval" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "messages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"customer_id" integer,
  	"to" varchar NOT NULL,
  	"audience" "enum_messages_audience" DEFAULT 'customer',
  	"template" varchar NOT NULL,
  	"category" "enum_messages_category",
  	"language" varchar,
  	"body" varchar,
  	"link" varchar,
  	"status" "enum_messages_status",
  	"skip_reason" varchar,
  	"provider" varchar,
  	"provider_id" varchar,
  	"cost" numeric DEFAULT 0,
  	"related_event" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "try_ons" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"customer_id" integer,
  	"hand_id" integer,
  	"design_id" integer,
  	"result_url" varchar,
  	"ai" boolean DEFAULT false,
  	"provider" varchar,
  	"cost" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "city_listings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"salon_id" integer NOT NULL,
  	"city" varchar NOT NULL,
  	"area" varchar,
  	"blurb" varchar,
  	"opted_in" boolean DEFAULT false,
  	"featured" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "city_listings_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_jobs_log" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"executed_at" timestamp(3) with time zone NOT NULL,
  	"completed_at" timestamp(3) with time zone NOT NULL,
  	"task_slug" "enum_payload_jobs_log_task_slug" NOT NULL,
  	"task_i_d" varchar NOT NULL,
  	"input" jsonb,
  	"output" jsonb,
  	"state" "enum_payload_jobs_log_state" NOT NULL,
  	"error" jsonb
  );
  
  CREATE TABLE "payload_jobs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"input" jsonb,
  	"completed_at" timestamp(3) with time zone,
  	"total_tried" numeric DEFAULT 0,
  	"has_error" boolean DEFAULT false,
  	"error" jsonb,
  	"task_slug" "enum_payload_jobs_task_slug",
  	"queue" varchar DEFAULT 'default',
  	"wait_until" timestamp(3) with time zone,
  	"processing" boolean DEFAULT false,
  	"meta" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"salons_id" integer,
  	"users_id" integer,
  	"media_id" integer,
  	"events_id" integer,
  	"cost_ledger_id" integer,
  	"subscriptions_id" integer,
  	"audit_log_id" integer,
  	"services_id" integer,
  	"packages_id" integer,
  	"designs_id" integer,
  	"moodboards_id" integer,
  	"customers_id" integer,
  	"otp_codes_id" integer,
  	"availability_id" integer,
  	"appointments_id" integer,
  	"waitlist_id" integer,
  	"group_bookings_id" integer,
  	"visits_id" integer,
  	"payments_id" integer,
  	"wallet_entries_id" integer,
  	"gift_cards_id" integer,
  	"customer_packages_id" integer,
  	"loyalty_accounts_id" integer,
  	"rewards_id" integer,
  	"referrals_id" integer,
  	"ratings_id" integer,
  	"feedback_id" integer,
  	"offers_id" integer,
  	"campaign_packs_id" integer,
  	"tracking_links_id" integer,
  	"contests_id" integer,
  	"contest_entries_id" integer,
  	"contest_votes_id" integer,
  	"photo_tasks_id" integer,
  	"articles_id" integer,
  	"message_templates_id" integer,
  	"messages_id" integer,
  	"try_ons_id" integer,
  	"city_listings_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_jobs_stats" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"stats" jsonb,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "salons_feature_overrides" ADD CONSTRAINT "salons_feature_overrides_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."salons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "salons_home_sections" ADD CONSTRAINT "salons_home_sections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."salons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "salons_languages" ADD CONSTRAINT "salons_languages_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."salons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "salons_hours" ADD CONSTRAINT "salons_hours_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."salons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "salons_domains" ADD CONSTRAINT "salons_domains_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."salons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "salons" ADD CONSTRAINT "salons_brand_logo_id_media_id_fk" FOREIGN KEY ("brand_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "salons" ADD CONSTRAINT "salons_brand_cover_id_media_id_fk" FOREIGN KEY ("brand_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users_tenants" ADD CONSTRAINT "users_tenants_tenant_id_salons_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."salons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users_tenants" ADD CONSTRAINT "users_tenants_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users" ADD CONSTRAINT "users_avatar_id_media_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users_texts" ADD CONSTRAINT "users_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media" ADD CONSTRAINT "media_tenant_id_salons_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."salons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_tenant_id_salons_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."salons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cost_ledger" ADD CONSTRAINT "cost_ledger_tenant_id_salons_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."salons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenant_id_salons_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."salons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "services" ADD CONSTRAINT "services_tenant_id_salons_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."salons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "services_rels" ADD CONSTRAINT "services_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_rels" ADD CONSTRAINT "services_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "packages_items" ADD CONSTRAINT "packages_items_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "packages_items" ADD CONSTRAINT "packages_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."packages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "packages" ADD CONSTRAINT "packages_tenant_id_salons_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."salons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "designs_occasions" ADD CONSTRAINT "designs_occasions_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."designs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "designs" ADD CONSTRAINT "designs_tenant_id_salons_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."salons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "designs" ADD CONSTRAINT "designs_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "designs" ADD CONSTRAINT "designs_artist_id_users_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "designs" ADD CONSTRAINT "designs_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "designs_texts" ADD CONSTRAINT "designs_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."designs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "designs_rels" ADD CONSTRAINT "designs_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."designs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "designs_rels" ADD CONSTRAINT "designs_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "designs_rels" ADD CONSTRAINT "designs_rels_services_fk" FOREIGN KEY ("services_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_designs_v_version_occasions" ADD CONSTRAINT "_designs_v_version_occasions_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_designs_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_designs_v" ADD CONSTRAINT "_designs_v_parent_id_designs_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."designs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_designs_v" ADD CONSTRAINT "_designs_v_version_tenant_id_salons_id_fk" FOREIGN KEY ("version_tenant_id") REFERENCES "public"."salons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_designs_v" ADD CONSTRAINT "_designs_v_version_service_id_services_id_fk" FOREIGN KEY ("version_service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_designs_v" ADD CONSTRAINT "_designs_v_version_artist_id_users_id_fk" FOREIGN KEY ("version_artist_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_designs_v" ADD CONSTRAINT "_designs_v_version_customer_id_customers_id_fk" FOREIGN KEY ("version_customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_designs_v_texts" ADD CONSTRAINT "_designs_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_designs_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_designs_v_rels" ADD CONSTRAINT "_designs_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_designs_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_designs_v_rels" ADD CONSTRAINT "_designs_v_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_designs_v_rels" ADD CONSTRAINT "_designs_v_rels_services_fk" FOREIGN KEY ("services_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "moodboards" ADD CONSTRAINT "moodboards_tenant_id_salons_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."salons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "moodboards" ADD CONSTRAINT "moodboards_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "moodboards_rels" ADD CONSTRAINT "moodboards_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."moodboards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "moodboards_rels" ADD CONSTRAINT "moodboards_rels_designs_fk" FOREIGN KEY ("designs_id") REFERENCES "public"."designs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_salons_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."salons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "customers" ADD CONSTRAINT "customers_referred_by_id_customers_id_fk" FOREIGN KEY ("referred_by_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "customers" ADD CONSTRAINT "customers_preferred_artist_id_users_id_fk" FOREIGN KEY ("preferred_artist_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "customers_texts" ADD CONSTRAINT "customers_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "otp_codes" ADD CONSTRAINT "otp_codes_tenant_id_salons_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."salons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "availability_weekly" ADD CONSTRAINT "availability_weekly_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."availability"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "availability_breaks" ADD CONSTRAINT "availability_breaks_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."availability"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "availability_time_off" ADD CONSTRAINT "availability_time_off_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."availability"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "availability" ADD CONSTRAINT "availability_tenant_id_salons_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."salons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "availability" ADD CONSTRAINT "availability_staff_id_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "appointments" ADD CONSTRAINT "appointments_tenant_id_salons_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."salons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "appointments" ADD CONSTRAINT "appointments_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "appointments" ADD CONSTRAINT "appointments_staff_id_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "appointments" ADD CONSTRAINT "appointments_design_id_designs_id_fk" FOREIGN KEY ("design_id") REFERENCES "public"."designs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "appointments" ADD CONSTRAINT "appointments_deposit_payment_id_payments_id_fk" FOREIGN KEY ("deposit_payment_id") REFERENCES "public"."payments"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "appointments" ADD CONSTRAINT "appointments_group_id_group_bookings_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."group_bookings"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "appointments_rels" ADD CONSTRAINT "appointments_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "appointments_rels" ADD CONSTRAINT "appointments_rels_services_fk" FOREIGN KEY ("services_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "appointments_rels" ADD CONSTRAINT "appointments_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_tenant_id_salons_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."salons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "waitlist_rels" ADD CONSTRAINT "waitlist_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."waitlist"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "waitlist_rels" ADD CONSTRAINT "waitlist_rels_services_fk" FOREIGN KEY ("services_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "group_bookings" ADD CONSTRAINT "group_bookings_tenant_id_salons_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."salons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "group_bookings" ADD CONSTRAINT "group_bookings_organiser_id_customers_id_fk" FOREIGN KEY ("organiser_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "visits_lines" ADD CONSTRAINT "visits_lines_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "visits_lines" ADD CONSTRAINT "visits_lines_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."visits"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "visits" ADD CONSTRAINT "visits_tenant_id_salons_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."salons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "visits" ADD CONSTRAINT "visits_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "visits" ADD CONSTRAINT "visits_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "visits" ADD CONSTRAINT "visits_staff_id_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "visits" ADD CONSTRAINT "visits_reward_id_rewards_id_fk" FOREIGN KEY ("reward_id") REFERENCES "public"."rewards"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "visits" ADD CONSTRAINT "visits_customer_package_id_customer_packages_id_fk" FOREIGN KEY ("customer_package_id") REFERENCES "public"."customer_packages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "visits" ADD CONSTRAINT "visits_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "visits" ADD CONSTRAINT "visits_design_id_designs_id_fk" FOREIGN KEY ("design_id") REFERENCES "public"."designs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "visits_rels" ADD CONSTRAINT "visits_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."visits"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "visits_rels" ADD CONSTRAINT "visits_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_id_salons_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."salons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payments" ADD CONSTRAINT "payments_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payments" ADD CONSTRAINT "payments_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payments" ADD CONSTRAINT "payments_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payments" ADD CONSTRAINT "payments_gift_card_id_gift_cards_id_fk" FOREIGN KEY ("gift_card_id") REFERENCES "public"."gift_cards"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "wallet_entries" ADD CONSTRAINT "wallet_entries_tenant_id_salons_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."salons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "wallet_entries" ADD CONSTRAINT "wallet_entries_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gift_cards" ADD CONSTRAINT "gift_cards_tenant_id_salons_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."salons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gift_cards" ADD CONSTRAINT "gift_cards_buyer_id_customers_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gift_cards" ADD CONSTRAINT "gift_cards_redeemed_by_id_customers_id_fk" FOREIGN KEY ("redeemed_by_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "customer_packages_remaining" ADD CONSTRAINT "customer_packages_remaining_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "customer_packages_remaining" ADD CONSTRAINT "customer_packages_remaining_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."customer_packages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "customer_packages" ADD CONSTRAINT "customer_packages_tenant_id_salons_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."salons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "customer_packages" ADD CONSTRAINT "customer_packages_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "customer_packages" ADD CONSTRAINT "customer_packages_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "loyalty_accounts" ADD CONSTRAINT "loyalty_accounts_tenant_id_salons_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."salons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "loyalty_accounts" ADD CONSTRAINT "loyalty_accounts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "rewards" ADD CONSTRAINT "rewards_tenant_id_salons_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."salons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "rewards" ADD CONSTRAINT "rewards_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "rewards" ADD CONSTRAINT "rewards_redeemed_visit_id_visits_id_fk" FOREIGN KEY ("redeemed_visit_id") REFERENCES "public"."visits"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "referrals" ADD CONSTRAINT "referrals_tenant_id_salons_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."salons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_customers_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "referrals" ADD CONSTRAINT "referrals_invitee_id_customers_id_fk" FOREIGN KEY ("invitee_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ratings" ADD CONSTRAINT "ratings_tenant_id_salons_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."salons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ratings" ADD CONSTRAINT "ratings_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ratings" ADD CONSTRAINT "ratings_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ratings" ADD CONSTRAINT "ratings_staff_id_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "feedback" ADD CONSTRAINT "feedback_tenant_id_salons_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."salons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "feedback" ADD CONSTRAINT "feedback_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "offers_audience" ADD CONSTRAINT "offers_audience_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."offers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "offers" ADD CONSTRAINT "offers_tenant_id_salons_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."salons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "offers" ADD CONSTRAINT "offers_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "offers" ADD CONSTRAINT "offers_pack_id_campaign_packs_id_fk" FOREIGN KEY ("pack_id") REFERENCES "public"."campaign_packs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "offers_rels" ADD CONSTRAINT "offers_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."offers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "offers_rels" ADD CONSTRAINT "offers_rels_services_fk" FOREIGN KEY ("services_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "campaign_packs" ADD CONSTRAINT "campaign_packs_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tracking_links" ADD CONSTRAINT "tracking_links_tenant_id_salons_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."salons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "contests" ADD CONSTRAINT "contests_tenant_id_salons_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."salons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "contests" ADD CONSTRAINT "contests_winner_id_contest_entries_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."contest_entries"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "contest_entries" ADD CONSTRAINT "contest_entries_tenant_id_salons_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."salons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "contest_entries" ADD CONSTRAINT "contest_entries_contest_id_contests_id_fk" FOREIGN KEY ("contest_id") REFERENCES "public"."contests"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "contest_entries" ADD CONSTRAINT "contest_entries_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "contest_entries" ADD CONSTRAINT "contest_entries_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "contest_entries" ADD CONSTRAINT "contest_entries_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "contest_votes" ADD CONSTRAINT "contest_votes_tenant_id_salons_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."salons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "contest_votes" ADD CONSTRAINT "contest_votes_contest_id_contests_id_fk" FOREIGN KEY ("contest_id") REFERENCES "public"."contests"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "contest_votes" ADD CONSTRAINT "contest_votes_entry_id_contest_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."contest_entries"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "contest_votes" ADD CONSTRAINT "contest_votes_voter_id_customers_id_fk" FOREIGN KEY ("voter_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "photo_tasks_shared_to" ADD CONSTRAINT "photo_tasks_shared_to_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."photo_tasks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "photo_tasks" ADD CONSTRAINT "photo_tasks_tenant_id_salons_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."salons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "photo_tasks" ADD CONSTRAINT "photo_tasks_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "photo_tasks" ADD CONSTRAINT "photo_tasks_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "photo_tasks" ADD CONSTRAINT "photo_tasks_staff_id_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "photo_tasks" ADD CONSTRAINT "photo_tasks_story_id_media_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "photo_tasks" ADD CONSTRAINT "photo_tasks_status_image_id_media_id_fk" FOREIGN KEY ("status_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "photo_tasks" ADD CONSTRAINT "photo_tasks_square_id_media_id_fk" FOREIGN KEY ("square_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "photo_tasks" ADD CONSTRAINT "photo_tasks_gallery_design_id_designs_id_fk" FOREIGN KEY ("gallery_design_id") REFERENCES "public"."designs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "photo_tasks_rels" ADD CONSTRAINT "photo_tasks_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."photo_tasks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "photo_tasks_rels" ADD CONSTRAINT "photo_tasks_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles" ADD CONSTRAINT "articles_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles_texts" ADD CONSTRAINT "articles_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_tenant_id_salons_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."salons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "messages" ADD CONSTRAINT "messages_tenant_id_salons_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."salons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "messages" ADD CONSTRAINT "messages_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "try_ons" ADD CONSTRAINT "try_ons_tenant_id_salons_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."salons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "try_ons" ADD CONSTRAINT "try_ons_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "try_ons" ADD CONSTRAINT "try_ons_hand_id_media_id_fk" FOREIGN KEY ("hand_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "try_ons" ADD CONSTRAINT "try_ons_design_id_designs_id_fk" FOREIGN KEY ("design_id") REFERENCES "public"."designs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "city_listings" ADD CONSTRAINT "city_listings_salon_id_salons_id_fk" FOREIGN KEY ("salon_id") REFERENCES "public"."salons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "city_listings_texts" ADD CONSTRAINT "city_listings_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."city_listings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_jobs_log" ADD CONSTRAINT "payload_jobs_log_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."payload_jobs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_salons_fk" FOREIGN KEY ("salons_id") REFERENCES "public"."salons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_cost_ledger_fk" FOREIGN KEY ("cost_ledger_id") REFERENCES "public"."cost_ledger"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_subscriptions_fk" FOREIGN KEY ("subscriptions_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_audit_log_fk" FOREIGN KEY ("audit_log_id") REFERENCES "public"."audit_log"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_services_fk" FOREIGN KEY ("services_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_packages_fk" FOREIGN KEY ("packages_id") REFERENCES "public"."packages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_designs_fk" FOREIGN KEY ("designs_id") REFERENCES "public"."designs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_moodboards_fk" FOREIGN KEY ("moodboards_id") REFERENCES "public"."moodboards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_customers_fk" FOREIGN KEY ("customers_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_otp_codes_fk" FOREIGN KEY ("otp_codes_id") REFERENCES "public"."otp_codes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_availability_fk" FOREIGN KEY ("availability_id") REFERENCES "public"."availability"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_appointments_fk" FOREIGN KEY ("appointments_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_waitlist_fk" FOREIGN KEY ("waitlist_id") REFERENCES "public"."waitlist"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_group_bookings_fk" FOREIGN KEY ("group_bookings_id") REFERENCES "public"."group_bookings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_visits_fk" FOREIGN KEY ("visits_id") REFERENCES "public"."visits"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payments_fk" FOREIGN KEY ("payments_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_wallet_entries_fk" FOREIGN KEY ("wallet_entries_id") REFERENCES "public"."wallet_entries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_gift_cards_fk" FOREIGN KEY ("gift_cards_id") REFERENCES "public"."gift_cards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_customer_packages_fk" FOREIGN KEY ("customer_packages_id") REFERENCES "public"."customer_packages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_loyalty_accounts_fk" FOREIGN KEY ("loyalty_accounts_id") REFERENCES "public"."loyalty_accounts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_rewards_fk" FOREIGN KEY ("rewards_id") REFERENCES "public"."rewards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_referrals_fk" FOREIGN KEY ("referrals_id") REFERENCES "public"."referrals"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_ratings_fk" FOREIGN KEY ("ratings_id") REFERENCES "public"."ratings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_feedback_fk" FOREIGN KEY ("feedback_id") REFERENCES "public"."feedback"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_offers_fk" FOREIGN KEY ("offers_id") REFERENCES "public"."offers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_campaign_packs_fk" FOREIGN KEY ("campaign_packs_id") REFERENCES "public"."campaign_packs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tracking_links_fk" FOREIGN KEY ("tracking_links_id") REFERENCES "public"."tracking_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_contests_fk" FOREIGN KEY ("contests_id") REFERENCES "public"."contests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_contest_entries_fk" FOREIGN KEY ("contest_entries_id") REFERENCES "public"."contest_entries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_contest_votes_fk" FOREIGN KEY ("contest_votes_id") REFERENCES "public"."contest_votes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_photo_tasks_fk" FOREIGN KEY ("photo_tasks_id") REFERENCES "public"."photo_tasks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_message_templates_fk" FOREIGN KEY ("message_templates_id") REFERENCES "public"."message_templates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_messages_fk" FOREIGN KEY ("messages_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_try_ons_fk" FOREIGN KEY ("try_ons_id") REFERENCES "public"."try_ons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_city_listings_fk" FOREIGN KEY ("city_listings_id") REFERENCES "public"."city_listings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "salons_feature_overrides_order_idx" ON "salons_feature_overrides" USING btree ("_order");
  CREATE INDEX "salons_feature_overrides_parent_id_idx" ON "salons_feature_overrides" USING btree ("_parent_id");
  CREATE INDEX "salons_home_sections_order_idx" ON "salons_home_sections" USING btree ("_order");
  CREATE INDEX "salons_home_sections_parent_id_idx" ON "salons_home_sections" USING btree ("_parent_id");
  CREATE INDEX "salons_languages_order_idx" ON "salons_languages" USING btree ("order");
  CREATE INDEX "salons_languages_parent_idx" ON "salons_languages" USING btree ("parent_id");
  CREATE INDEX "salons_hours_order_idx" ON "salons_hours" USING btree ("_order");
  CREATE INDEX "salons_hours_parent_id_idx" ON "salons_hours" USING btree ("_parent_id");
  CREATE INDEX "salons_domains_order_idx" ON "salons_domains" USING btree ("_order");
  CREATE INDEX "salons_domains_parent_id_idx" ON "salons_domains" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "salons_slug_idx" ON "salons" USING btree ("slug");
  CREATE INDEX "salons_brand_brand_logo_idx" ON "salons" USING btree ("brand_logo_id");
  CREATE INDEX "salons_brand_brand_cover_idx" ON "salons" USING btree ("brand_cover_id");
  CREATE INDEX "salons_contact_contact_phone_idx" ON "salons" USING btree ("contact_phone");
  CREATE INDEX "salons_contact_contact_whatsapp_idx" ON "salons" USING btree ("contact_whatsapp");
  CREATE INDEX "salons_updated_at_idx" ON "salons" USING btree ("updated_at");
  CREATE INDEX "salons_created_at_idx" ON "salons" USING btree ("created_at");
  CREATE INDEX "users_tenants_order_idx" ON "users_tenants" USING btree ("_order");
  CREATE INDEX "users_tenants_parent_id_idx" ON "users_tenants" USING btree ("_parent_id");
  CREATE INDEX "users_tenants_tenant_idx" ON "users_tenants" USING btree ("tenant_id");
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_phone_idx" ON "users" USING btree ("phone");
  CREATE INDEX "users_avatar_idx" ON "users" USING btree ("avatar_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "users_texts_order_parent" ON "users_texts" USING btree ("order","parent_id");
  CREATE INDEX "media_tenant_idx" ON "media" USING btree ("tenant_id");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumb_sizes_thumb_filename_idx" ON "media" USING btree ("sizes_thumb_filename");
  CREATE INDEX "media_sizes_card_sizes_card_filename_idx" ON "media" USING btree ("sizes_card_filename");
  CREATE INDEX "media_sizes_large_sizes_large_filename_idx" ON "media" USING btree ("sizes_large_filename");
  CREATE INDEX "events_tenant_idx" ON "events" USING btree ("tenant_id");
  CREATE INDEX "events_type_idx" ON "events" USING btree ("type");
  CREATE INDEX "events_updated_at_idx" ON "events" USING btree ("updated_at");
  CREATE INDEX "events_created_at_idx" ON "events" USING btree ("created_at");
  CREATE INDEX "tenant_type_createdAt_idx" ON "events" USING btree ("tenant_id","type","created_at");
  CREATE INDEX "cost_ledger_tenant_idx" ON "cost_ledger" USING btree ("tenant_id");
  CREATE INDEX "cost_ledger_period_idx" ON "cost_ledger" USING btree ("period");
  CREATE INDEX "cost_ledger_updated_at_idx" ON "cost_ledger" USING btree ("updated_at");
  CREATE INDEX "cost_ledger_created_at_idx" ON "cost_ledger" USING btree ("created_at");
  CREATE INDEX "subscriptions_tenant_idx" ON "subscriptions" USING btree ("tenant_id");
  CREATE INDEX "subscriptions_updated_at_idx" ON "subscriptions" USING btree ("updated_at");
  CREATE INDEX "subscriptions_created_at_idx" ON "subscriptions" USING btree ("created_at");
  CREATE INDEX "audit_log_actor_idx" ON "audit_log" USING btree ("actor_id");
  CREATE INDEX "audit_log_updated_at_idx" ON "audit_log" USING btree ("updated_at");
  CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at");
  CREATE INDEX "services_tenant_idx" ON "services" USING btree ("tenant_id");
  CREATE INDEX "services_active_idx" ON "services" USING btree ("active");
  CREATE INDEX "services_updated_at_idx" ON "services" USING btree ("updated_at");
  CREATE INDEX "services_created_at_idx" ON "services" USING btree ("created_at");
  CREATE INDEX "services_rels_order_idx" ON "services_rels" USING btree ("order");
  CREATE INDEX "services_rels_parent_idx" ON "services_rels" USING btree ("parent_id");
  CREATE INDEX "services_rels_path_idx" ON "services_rels" USING btree ("path");
  CREATE INDEX "services_rels_media_id_idx" ON "services_rels" USING btree ("media_id");
  CREATE INDEX "packages_items_order_idx" ON "packages_items" USING btree ("_order");
  CREATE INDEX "packages_items_parent_id_idx" ON "packages_items" USING btree ("_parent_id");
  CREATE INDEX "packages_items_service_idx" ON "packages_items" USING btree ("service_id");
  CREATE INDEX "packages_tenant_idx" ON "packages" USING btree ("tenant_id");
  CREATE INDEX "packages_updated_at_idx" ON "packages" USING btree ("updated_at");
  CREATE INDEX "packages_created_at_idx" ON "packages" USING btree ("created_at");
  CREATE INDEX "designs_occasions_order_idx" ON "designs_occasions" USING btree ("order");
  CREATE INDEX "designs_occasions_parent_idx" ON "designs_occasions" USING btree ("parent_id");
  CREATE INDEX "designs_tenant_idx" ON "designs" USING btree ("tenant_id");
  CREATE INDEX "designs_service_idx" ON "designs" USING btree ("service_id");
  CREATE INDEX "designs_artist_idx" ON "designs" USING btree ("artist_id");
  CREATE INDEX "designs_customer_idx" ON "designs" USING btree ("customer_id");
  CREATE INDEX "designs_published_idx" ON "designs" USING btree ("published");
  CREATE INDEX "designs_updated_at_idx" ON "designs" USING btree ("updated_at");
  CREATE INDEX "designs_created_at_idx" ON "designs" USING btree ("created_at");
  CREATE INDEX "designs_texts_order_parent" ON "designs_texts" USING btree ("order","parent_id");
  CREATE INDEX "designs_rels_order_idx" ON "designs_rels" USING btree ("order");
  CREATE INDEX "designs_rels_parent_idx" ON "designs_rels" USING btree ("parent_id");
  CREATE INDEX "designs_rels_path_idx" ON "designs_rels" USING btree ("path");
  CREATE INDEX "designs_rels_media_id_idx" ON "designs_rels" USING btree ("media_id");
  CREATE INDEX "designs_rels_services_id_idx" ON "designs_rels" USING btree ("services_id");
  CREATE INDEX "_designs_v_version_occasions_order_idx" ON "_designs_v_version_occasions" USING btree ("order");
  CREATE INDEX "_designs_v_version_occasions_parent_idx" ON "_designs_v_version_occasions" USING btree ("parent_id");
  CREATE INDEX "_designs_v_parent_idx" ON "_designs_v" USING btree ("parent_id");
  CREATE INDEX "_designs_v_version_version_tenant_idx" ON "_designs_v" USING btree ("version_tenant_id");
  CREATE INDEX "_designs_v_version_version_service_idx" ON "_designs_v" USING btree ("version_service_id");
  CREATE INDEX "_designs_v_version_version_artist_idx" ON "_designs_v" USING btree ("version_artist_id");
  CREATE INDEX "_designs_v_version_version_customer_idx" ON "_designs_v" USING btree ("version_customer_id");
  CREATE INDEX "_designs_v_version_version_published_idx" ON "_designs_v" USING btree ("version_published");
  CREATE INDEX "_designs_v_version_version_updated_at_idx" ON "_designs_v" USING btree ("version_updated_at");
  CREATE INDEX "_designs_v_version_version_created_at_idx" ON "_designs_v" USING btree ("version_created_at");
  CREATE INDEX "_designs_v_created_at_idx" ON "_designs_v" USING btree ("created_at");
  CREATE INDEX "_designs_v_updated_at_idx" ON "_designs_v" USING btree ("updated_at");
  CREATE INDEX "_designs_v_texts_order_parent" ON "_designs_v_texts" USING btree ("order","parent_id");
  CREATE INDEX "_designs_v_rels_order_idx" ON "_designs_v_rels" USING btree ("order");
  CREATE INDEX "_designs_v_rels_parent_idx" ON "_designs_v_rels" USING btree ("parent_id");
  CREATE INDEX "_designs_v_rels_path_idx" ON "_designs_v_rels" USING btree ("path");
  CREATE INDEX "_designs_v_rels_media_id_idx" ON "_designs_v_rels" USING btree ("media_id");
  CREATE INDEX "_designs_v_rels_services_id_idx" ON "_designs_v_rels" USING btree ("services_id");
  CREATE INDEX "moodboards_tenant_idx" ON "moodboards" USING btree ("tenant_id");
  CREATE INDEX "moodboards_customer_idx" ON "moodboards" USING btree ("customer_id");
  CREATE INDEX "moodboards_updated_at_idx" ON "moodboards" USING btree ("updated_at");
  CREATE INDEX "moodboards_created_at_idx" ON "moodboards" USING btree ("created_at");
  CREATE INDEX "moodboards_rels_order_idx" ON "moodboards_rels" USING btree ("order");
  CREATE INDEX "moodboards_rels_parent_idx" ON "moodboards_rels" USING btree ("parent_id");
  CREATE INDEX "moodboards_rels_path_idx" ON "moodboards_rels" USING btree ("path");
  CREATE INDEX "moodboards_rels_designs_id_idx" ON "moodboards_rels" USING btree ("designs_id");
  CREATE INDEX "customers_tenant_idx" ON "customers" USING btree ("tenant_id");
  CREATE INDEX "customers_phone_idx" ON "customers" USING btree ("phone");
  CREATE INDEX "customers_referral_code_idx" ON "customers" USING btree ("referral_code");
  CREATE INDEX "customers_referred_by_idx" ON "customers" USING btree ("referred_by_id");
  CREATE INDEX "customers_preferred_artist_idx" ON "customers" USING btree ("preferred_artist_id");
  CREATE INDEX "customers_segment_idx" ON "customers" USING btree ("segment");
  CREATE INDEX "customers_next_due_date_idx" ON "customers" USING btree ("next_due_date");
  CREATE INDEX "customers_updated_at_idx" ON "customers" USING btree ("updated_at");
  CREATE INDEX "customers_created_at_idx" ON "customers" USING btree ("created_at");
  CREATE UNIQUE INDEX "tenant_phone_idx" ON "customers" USING btree ("tenant_id","phone");
  CREATE INDEX "customers_texts_order_parent" ON "customers_texts" USING btree ("order","parent_id");
  CREATE INDEX "otp_codes_tenant_idx" ON "otp_codes" USING btree ("tenant_id");
  CREATE INDEX "otp_codes_phone_idx" ON "otp_codes" USING btree ("phone");
  CREATE INDEX "otp_codes_updated_at_idx" ON "otp_codes" USING btree ("updated_at");
  CREATE INDEX "otp_codes_created_at_idx" ON "otp_codes" USING btree ("created_at");
  CREATE INDEX "availability_weekly_order_idx" ON "availability_weekly" USING btree ("_order");
  CREATE INDEX "availability_weekly_parent_id_idx" ON "availability_weekly" USING btree ("_parent_id");
  CREATE INDEX "availability_breaks_order_idx" ON "availability_breaks" USING btree ("_order");
  CREATE INDEX "availability_breaks_parent_id_idx" ON "availability_breaks" USING btree ("_parent_id");
  CREATE INDEX "availability_time_off_order_idx" ON "availability_time_off" USING btree ("_order");
  CREATE INDEX "availability_time_off_parent_id_idx" ON "availability_time_off" USING btree ("_parent_id");
  CREATE INDEX "availability_tenant_idx" ON "availability" USING btree ("tenant_id");
  CREATE INDEX "availability_staff_idx" ON "availability" USING btree ("staff_id");
  CREATE INDEX "availability_updated_at_idx" ON "availability" USING btree ("updated_at");
  CREATE INDEX "availability_created_at_idx" ON "availability" USING btree ("created_at");
  CREATE INDEX "appointments_tenant_idx" ON "appointments" USING btree ("tenant_id");
  CREATE INDEX "appointments_customer_idx" ON "appointments" USING btree ("customer_id");
  CREATE INDEX "appointments_staff_idx" ON "appointments" USING btree ("staff_id");
  CREATE INDEX "appointments_design_idx" ON "appointments" USING btree ("design_id");
  CREATE INDEX "appointments_start_idx" ON "appointments" USING btree ("start");
  CREATE INDEX "appointments_status_idx" ON "appointments" USING btree ("status");
  CREATE INDEX "appointments_deposit_payment_idx" ON "appointments" USING btree ("deposit_payment_id");
  CREATE INDEX "appointments_group_idx" ON "appointments" USING btree ("group_id");
  CREATE INDEX "appointments_updated_at_idx" ON "appointments" USING btree ("updated_at");
  CREATE INDEX "appointments_created_at_idx" ON "appointments" USING btree ("created_at");
  CREATE INDEX "tenant_staff_start_idx" ON "appointments" USING btree ("tenant_id","staff_id","start");
  CREATE INDEX "appointments_rels_order_idx" ON "appointments_rels" USING btree ("order");
  CREATE INDEX "appointments_rels_parent_idx" ON "appointments_rels" USING btree ("parent_id");
  CREATE INDEX "appointments_rels_path_idx" ON "appointments_rels" USING btree ("path");
  CREATE INDEX "appointments_rels_services_id_idx" ON "appointments_rels" USING btree ("services_id");
  CREATE INDEX "appointments_rels_media_id_idx" ON "appointments_rels" USING btree ("media_id");
  CREATE INDEX "waitlist_tenant_idx" ON "waitlist" USING btree ("tenant_id");
  CREATE INDEX "waitlist_customer_idx" ON "waitlist" USING btree ("customer_id");
  CREATE INDEX "waitlist_date_idx" ON "waitlist" USING btree ("date");
  CREATE INDEX "waitlist_updated_at_idx" ON "waitlist" USING btree ("updated_at");
  CREATE INDEX "waitlist_created_at_idx" ON "waitlist" USING btree ("created_at");
  CREATE INDEX "waitlist_rels_order_idx" ON "waitlist_rels" USING btree ("order");
  CREATE INDEX "waitlist_rels_parent_idx" ON "waitlist_rels" USING btree ("parent_id");
  CREATE INDEX "waitlist_rels_path_idx" ON "waitlist_rels" USING btree ("path");
  CREATE INDEX "waitlist_rels_services_id_idx" ON "waitlist_rels" USING btree ("services_id");
  CREATE INDEX "group_bookings_tenant_idx" ON "group_bookings" USING btree ("tenant_id");
  CREATE INDEX "group_bookings_organiser_idx" ON "group_bookings" USING btree ("organiser_id");
  CREATE INDEX "group_bookings_code_idx" ON "group_bookings" USING btree ("code");
  CREATE INDEX "group_bookings_updated_at_idx" ON "group_bookings" USING btree ("updated_at");
  CREATE INDEX "group_bookings_created_at_idx" ON "group_bookings" USING btree ("created_at");
  CREATE INDEX "visits_lines_order_idx" ON "visits_lines" USING btree ("_order");
  CREATE INDEX "visits_lines_parent_id_idx" ON "visits_lines" USING btree ("_parent_id");
  CREATE INDEX "visits_lines_service_idx" ON "visits_lines" USING btree ("service_id");
  CREATE INDEX "visits_tenant_idx" ON "visits" USING btree ("tenant_id");
  CREATE INDEX "visits_customer_idx" ON "visits" USING btree ("customer_id");
  CREATE INDEX "visits_appointment_idx" ON "visits" USING btree ("appointment_id");
  CREATE INDEX "visits_staff_idx" ON "visits" USING btree ("staff_id");
  CREATE INDEX "visits_reward_idx" ON "visits" USING btree ("reward_id");
  CREATE INDEX "visits_customer_package_idx" ON "visits" USING btree ("customer_package_id");
  CREATE INDEX "visits_payment_idx" ON "visits" USING btree ("payment_id");
  CREATE INDEX "visits_paid_status_idx" ON "visits" USING btree ("paid_status");
  CREATE INDEX "visits_design_idx" ON "visits" USING btree ("design_id");
  CREATE INDEX "visits_updated_at_idx" ON "visits" USING btree ("updated_at");
  CREATE INDEX "visits_created_at_idx" ON "visits" USING btree ("created_at");
  CREATE INDEX "visits_rels_order_idx" ON "visits_rels" USING btree ("order");
  CREATE INDEX "visits_rels_parent_idx" ON "visits_rels" USING btree ("parent_id");
  CREATE INDEX "visits_rels_path_idx" ON "visits_rels" USING btree ("path");
  CREATE INDEX "visits_rels_media_id_idx" ON "visits_rels" USING btree ("media_id");
  CREATE INDEX "payments_tenant_idx" ON "payments" USING btree ("tenant_id");
  CREATE INDEX "payments_kind_idx" ON "payments" USING btree ("kind");
  CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");
  CREATE INDEX "payments_customer_idx" ON "payments" USING btree ("customer_id");
  CREATE INDEX "payments_appointment_idx" ON "payments" USING btree ("appointment_id");
  CREATE INDEX "payments_visit_idx" ON "payments" USING btree ("visit_id");
  CREATE INDEX "payments_package_idx" ON "payments" USING btree ("package_id");
  CREATE INDEX "payments_gift_card_idx" ON "payments" USING btree ("gift_card_id");
  CREATE INDEX "payments_provider_link_id_idx" ON "payments" USING btree ("provider_link_id");
  CREATE INDEX "payments_provider_payment_id_idx" ON "payments" USING btree ("provider_payment_id");
  CREATE INDEX "payments_updated_at_idx" ON "payments" USING btree ("updated_at");
  CREATE INDEX "payments_created_at_idx" ON "payments" USING btree ("created_at");
  CREATE INDEX "wallet_entries_tenant_idx" ON "wallet_entries" USING btree ("tenant_id");
  CREATE INDEX "wallet_entries_customer_idx" ON "wallet_entries" USING btree ("customer_id");
  CREATE INDEX "wallet_entries_updated_at_idx" ON "wallet_entries" USING btree ("updated_at");
  CREATE INDEX "wallet_entries_created_at_idx" ON "wallet_entries" USING btree ("created_at");
  CREATE INDEX "gift_cards_tenant_idx" ON "gift_cards" USING btree ("tenant_id");
  CREATE INDEX "gift_cards_code_idx" ON "gift_cards" USING btree ("code");
  CREATE INDEX "gift_cards_buyer_idx" ON "gift_cards" USING btree ("buyer_id");
  CREATE INDEX "gift_cards_recipient_phone_idx" ON "gift_cards" USING btree ("recipient_phone");
  CREATE INDEX "gift_cards_redeemed_by_idx" ON "gift_cards" USING btree ("redeemed_by_id");
  CREATE INDEX "gift_cards_updated_at_idx" ON "gift_cards" USING btree ("updated_at");
  CREATE INDEX "gift_cards_created_at_idx" ON "gift_cards" USING btree ("created_at");
  CREATE INDEX "customer_packages_remaining_order_idx" ON "customer_packages_remaining" USING btree ("_order");
  CREATE INDEX "customer_packages_remaining_parent_id_idx" ON "customer_packages_remaining" USING btree ("_parent_id");
  CREATE INDEX "customer_packages_remaining_service_idx" ON "customer_packages_remaining" USING btree ("service_id");
  CREATE INDEX "customer_packages_tenant_idx" ON "customer_packages" USING btree ("tenant_id");
  CREATE INDEX "customer_packages_customer_idx" ON "customer_packages" USING btree ("customer_id");
  CREATE INDEX "customer_packages_package_idx" ON "customer_packages" USING btree ("package_id");
  CREATE INDEX "customer_packages_updated_at_idx" ON "customer_packages" USING btree ("updated_at");
  CREATE INDEX "customer_packages_created_at_idx" ON "customer_packages" USING btree ("created_at");
  CREATE INDEX "loyalty_accounts_tenant_idx" ON "loyalty_accounts" USING btree ("tenant_id");
  CREATE INDEX "loyalty_accounts_customer_idx" ON "loyalty_accounts" USING btree ("customer_id");
  CREATE INDEX "loyalty_accounts_updated_at_idx" ON "loyalty_accounts" USING btree ("updated_at");
  CREATE INDEX "loyalty_accounts_created_at_idx" ON "loyalty_accounts" USING btree ("created_at");
  CREATE INDEX "rewards_tenant_idx" ON "rewards" USING btree ("tenant_id");
  CREATE INDEX "rewards_customer_idx" ON "rewards" USING btree ("customer_id");
  CREATE INDEX "rewards_kind_idx" ON "rewards" USING btree ("kind");
  CREATE INDEX "rewards_code_idx" ON "rewards" USING btree ("code");
  CREATE INDEX "rewards_valid_to_idx" ON "rewards" USING btree ("valid_to");
  CREATE INDEX "rewards_status_idx" ON "rewards" USING btree ("status");
  CREATE INDEX "rewards_redeemed_visit_idx" ON "rewards" USING btree ("redeemed_visit_id");
  CREATE INDEX "rewards_updated_at_idx" ON "rewards" USING btree ("updated_at");
  CREATE INDEX "rewards_created_at_idx" ON "rewards" USING btree ("created_at");
  CREATE INDEX "referrals_tenant_idx" ON "referrals" USING btree ("tenant_id");
  CREATE INDEX "referrals_referrer_idx" ON "referrals" USING btree ("referrer_id");
  CREATE INDEX "referrals_invitee_idx" ON "referrals" USING btree ("invitee_id");
  CREATE INDEX "referrals_invitee_phone_idx" ON "referrals" USING btree ("invitee_phone");
  CREATE INDEX "referrals_status_idx" ON "referrals" USING btree ("status");
  CREATE INDEX "referrals_updated_at_idx" ON "referrals" USING btree ("updated_at");
  CREATE INDEX "referrals_created_at_idx" ON "referrals" USING btree ("created_at");
  CREATE INDEX "ratings_tenant_idx" ON "ratings" USING btree ("tenant_id");
  CREATE INDEX "ratings_visit_idx" ON "ratings" USING btree ("visit_id");
  CREATE INDEX "ratings_customer_idx" ON "ratings" USING btree ("customer_id");
  CREATE INDEX "ratings_staff_idx" ON "ratings" USING btree ("staff_id");
  CREATE INDEX "ratings_updated_at_idx" ON "ratings" USING btree ("updated_at");
  CREATE INDEX "ratings_created_at_idx" ON "ratings" USING btree ("created_at");
  CREATE INDEX "feedback_tenant_idx" ON "feedback" USING btree ("tenant_id");
  CREATE INDEX "feedback_customer_idx" ON "feedback" USING btree ("customer_id");
  CREATE INDEX "feedback_updated_at_idx" ON "feedback" USING btree ("updated_at");
  CREATE INDEX "feedback_created_at_idx" ON "feedback" USING btree ("created_at");
  CREATE INDEX "offers_audience_order_idx" ON "offers_audience" USING btree ("order");
  CREATE INDEX "offers_audience_parent_idx" ON "offers_audience" USING btree ("parent_id");
  CREATE INDEX "offers_tenant_idx" ON "offers" USING btree ("tenant_id");
  CREATE INDEX "offers_image_idx" ON "offers" USING btree ("image_id");
  CREATE INDEX "offers_pack_idx" ON "offers" USING btree ("pack_id");
  CREATE INDEX "offers_code_idx" ON "offers" USING btree ("code");
  CREATE INDEX "offers_status_idx" ON "offers" USING btree ("status");
  CREATE INDEX "offers_updated_at_idx" ON "offers" USING btree ("updated_at");
  CREATE INDEX "offers_created_at_idx" ON "offers" USING btree ("created_at");
  CREATE INDEX "offers_rels_order_idx" ON "offers_rels" USING btree ("order");
  CREATE INDEX "offers_rels_parent_idx" ON "offers_rels" USING btree ("parent_id");
  CREATE INDEX "offers_rels_path_idx" ON "offers_rels" USING btree ("path");
  CREATE INDEX "offers_rels_services_id_idx" ON "offers_rels" USING btree ("services_id");
  CREATE INDEX "campaign_packs_festival_idx" ON "campaign_packs" USING btree ("festival");
  CREATE INDEX "campaign_packs_image_idx" ON "campaign_packs" USING btree ("image_id");
  CREATE INDEX "campaign_packs_updated_at_idx" ON "campaign_packs" USING btree ("updated_at");
  CREATE INDEX "campaign_packs_created_at_idx" ON "campaign_packs" USING btree ("created_at");
  CREATE INDEX "tracking_links_tenant_idx" ON "tracking_links" USING btree ("tenant_id");
  CREATE UNIQUE INDEX "tracking_links_code_idx" ON "tracking_links" USING btree ("code");
  CREATE INDEX "tracking_links_updated_at_idx" ON "tracking_links" USING btree ("updated_at");
  CREATE INDEX "tracking_links_created_at_idx" ON "tracking_links" USING btree ("created_at");
  CREATE INDEX "contests_tenant_idx" ON "contests" USING btree ("tenant_id");
  CREATE INDEX "contests_winner_idx" ON "contests" USING btree ("winner_id");
  CREATE INDEX "contests_updated_at_idx" ON "contests" USING btree ("updated_at");
  CREATE INDEX "contests_created_at_idx" ON "contests" USING btree ("created_at");
  CREATE INDEX "contest_entries_tenant_idx" ON "contest_entries" USING btree ("tenant_id");
  CREATE INDEX "contest_entries_contest_idx" ON "contest_entries" USING btree ("contest_id");
  CREATE INDEX "contest_entries_customer_idx" ON "contest_entries" USING btree ("customer_id");
  CREATE INDEX "contest_entries_photo_idx" ON "contest_entries" USING btree ("photo_id");
  CREATE INDEX "contest_entries_visit_idx" ON "contest_entries" USING btree ("visit_id");
  CREATE INDEX "contest_entries_votes_idx" ON "contest_entries" USING btree ("votes");
  CREATE INDEX "contest_entries_updated_at_idx" ON "contest_entries" USING btree ("updated_at");
  CREATE INDEX "contest_entries_created_at_idx" ON "contest_entries" USING btree ("created_at");
  CREATE INDEX "contest_votes_tenant_idx" ON "contest_votes" USING btree ("tenant_id");
  CREATE INDEX "contest_votes_contest_idx" ON "contest_votes" USING btree ("contest_id");
  CREATE INDEX "contest_votes_entry_idx" ON "contest_votes" USING btree ("entry_id");
  CREATE INDEX "contest_votes_voter_idx" ON "contest_votes" USING btree ("voter_id");
  CREATE INDEX "contest_votes_updated_at_idx" ON "contest_votes" USING btree ("updated_at");
  CREATE INDEX "contest_votes_created_at_idx" ON "contest_votes" USING btree ("created_at");
  CREATE UNIQUE INDEX "tenant_contest_voterPhone_idx" ON "contest_votes" USING btree ("tenant_id","contest_id","voter_phone");
  CREATE INDEX "photo_tasks_shared_to_order_idx" ON "photo_tasks_shared_to" USING btree ("order");
  CREATE INDEX "photo_tasks_shared_to_parent_idx" ON "photo_tasks_shared_to" USING btree ("parent_id");
  CREATE INDEX "photo_tasks_tenant_idx" ON "photo_tasks" USING btree ("tenant_id");
  CREATE INDEX "photo_tasks_visit_idx" ON "photo_tasks" USING btree ("visit_id");
  CREATE INDEX "photo_tasks_customer_idx" ON "photo_tasks" USING btree ("customer_id");
  CREATE INDEX "photo_tasks_staff_idx" ON "photo_tasks" USING btree ("staff_id");
  CREATE INDEX "photo_tasks_story_idx" ON "photo_tasks" USING btree ("story_id");
  CREATE INDEX "photo_tasks_status_image_idx" ON "photo_tasks" USING btree ("status_image_id");
  CREATE INDEX "photo_tasks_square_idx" ON "photo_tasks" USING btree ("square_id");
  CREATE INDEX "photo_tasks_status_idx" ON "photo_tasks" USING btree ("status");
  CREATE INDEX "photo_tasks_gallery_design_idx" ON "photo_tasks" USING btree ("gallery_design_id");
  CREATE INDEX "photo_tasks_updated_at_idx" ON "photo_tasks" USING btree ("updated_at");
  CREATE INDEX "photo_tasks_created_at_idx" ON "photo_tasks" USING btree ("created_at");
  CREATE INDEX "photo_tasks_rels_order_idx" ON "photo_tasks_rels" USING btree ("order");
  CREATE INDEX "photo_tasks_rels_parent_idx" ON "photo_tasks_rels" USING btree ("parent_id");
  CREATE INDEX "photo_tasks_rels_path_idx" ON "photo_tasks_rels" USING btree ("path");
  CREATE INDEX "photo_tasks_rels_media_id_idx" ON "photo_tasks_rels" USING btree ("media_id");
  CREATE UNIQUE INDEX "articles_slug_idx" ON "articles" USING btree ("slug");
  CREATE INDEX "articles_cover_idx" ON "articles" USING btree ("cover_id");
  CREATE INDEX "articles_updated_at_idx" ON "articles" USING btree ("updated_at");
  CREATE INDEX "articles_created_at_idx" ON "articles" USING btree ("created_at");
  CREATE INDEX "articles_texts_order_parent" ON "articles_texts" USING btree ("order","parent_id");
  CREATE INDEX "message_templates_tenant_idx" ON "message_templates" USING btree ("tenant_id");
  CREATE INDEX "message_templates_updated_at_idx" ON "message_templates" USING btree ("updated_at");
  CREATE INDEX "message_templates_created_at_idx" ON "message_templates" USING btree ("created_at");
  CREATE INDEX "messages_tenant_idx" ON "messages" USING btree ("tenant_id");
  CREATE INDEX "messages_customer_idx" ON "messages" USING btree ("customer_id");
  CREATE INDEX "messages_template_idx" ON "messages" USING btree ("template");
  CREATE INDEX "messages_category_idx" ON "messages" USING btree ("category");
  CREATE INDEX "messages_status_idx" ON "messages" USING btree ("status");
  CREATE INDEX "messages_updated_at_idx" ON "messages" USING btree ("updated_at");
  CREATE INDEX "messages_created_at_idx" ON "messages" USING btree ("created_at");
  CREATE INDEX "try_ons_tenant_idx" ON "try_ons" USING btree ("tenant_id");
  CREATE INDEX "try_ons_customer_idx" ON "try_ons" USING btree ("customer_id");
  CREATE INDEX "try_ons_hand_idx" ON "try_ons" USING btree ("hand_id");
  CREATE INDEX "try_ons_design_idx" ON "try_ons" USING btree ("design_id");
  CREATE INDEX "try_ons_updated_at_idx" ON "try_ons" USING btree ("updated_at");
  CREATE INDEX "try_ons_created_at_idx" ON "try_ons" USING btree ("created_at");
  CREATE UNIQUE INDEX "city_listings_salon_idx" ON "city_listings" USING btree ("salon_id");
  CREATE INDEX "city_listings_city_idx" ON "city_listings" USING btree ("city");
  CREATE INDEX "city_listings_updated_at_idx" ON "city_listings" USING btree ("updated_at");
  CREATE INDEX "city_listings_created_at_idx" ON "city_listings" USING btree ("created_at");
  CREATE INDEX "city_listings_texts_order_parent" ON "city_listings_texts" USING btree ("order","parent_id");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_jobs_log_order_idx" ON "payload_jobs_log" USING btree ("_order");
  CREATE INDEX "payload_jobs_log_parent_id_idx" ON "payload_jobs_log" USING btree ("_parent_id");
  CREATE INDEX "payload_jobs_completed_at_idx" ON "payload_jobs" USING btree ("completed_at");
  CREATE INDEX "payload_jobs_total_tried_idx" ON "payload_jobs" USING btree ("total_tried");
  CREATE INDEX "payload_jobs_has_error_idx" ON "payload_jobs" USING btree ("has_error");
  CREATE INDEX "payload_jobs_task_slug_idx" ON "payload_jobs" USING btree ("task_slug");
  CREATE INDEX "payload_jobs_queue_idx" ON "payload_jobs" USING btree ("queue");
  CREATE INDEX "payload_jobs_wait_until_idx" ON "payload_jobs" USING btree ("wait_until");
  CREATE INDEX "payload_jobs_processing_idx" ON "payload_jobs" USING btree ("processing");
  CREATE INDEX "payload_jobs_updated_at_idx" ON "payload_jobs" USING btree ("updated_at");
  CREATE INDEX "payload_jobs_created_at_idx" ON "payload_jobs" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_salons_id_idx" ON "payload_locked_documents_rels" USING btree ("salons_id");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_events_id_idx" ON "payload_locked_documents_rels" USING btree ("events_id");
  CREATE INDEX "payload_locked_documents_rels_cost_ledger_id_idx" ON "payload_locked_documents_rels" USING btree ("cost_ledger_id");
  CREATE INDEX "payload_locked_documents_rels_subscriptions_id_idx" ON "payload_locked_documents_rels" USING btree ("subscriptions_id");
  CREATE INDEX "payload_locked_documents_rels_audit_log_id_idx" ON "payload_locked_documents_rels" USING btree ("audit_log_id");
  CREATE INDEX "payload_locked_documents_rels_services_id_idx" ON "payload_locked_documents_rels" USING btree ("services_id");
  CREATE INDEX "payload_locked_documents_rels_packages_id_idx" ON "payload_locked_documents_rels" USING btree ("packages_id");
  CREATE INDEX "payload_locked_documents_rels_designs_id_idx" ON "payload_locked_documents_rels" USING btree ("designs_id");
  CREATE INDEX "payload_locked_documents_rels_moodboards_id_idx" ON "payload_locked_documents_rels" USING btree ("moodboards_id");
  CREATE INDEX "payload_locked_documents_rels_customers_id_idx" ON "payload_locked_documents_rels" USING btree ("customers_id");
  CREATE INDEX "payload_locked_documents_rels_otp_codes_id_idx" ON "payload_locked_documents_rels" USING btree ("otp_codes_id");
  CREATE INDEX "payload_locked_documents_rels_availability_id_idx" ON "payload_locked_documents_rels" USING btree ("availability_id");
  CREATE INDEX "payload_locked_documents_rels_appointments_id_idx" ON "payload_locked_documents_rels" USING btree ("appointments_id");
  CREATE INDEX "payload_locked_documents_rels_waitlist_id_idx" ON "payload_locked_documents_rels" USING btree ("waitlist_id");
  CREATE INDEX "payload_locked_documents_rels_group_bookings_id_idx" ON "payload_locked_documents_rels" USING btree ("group_bookings_id");
  CREATE INDEX "payload_locked_documents_rels_visits_id_idx" ON "payload_locked_documents_rels" USING btree ("visits_id");
  CREATE INDEX "payload_locked_documents_rels_payments_id_idx" ON "payload_locked_documents_rels" USING btree ("payments_id");
  CREATE INDEX "payload_locked_documents_rels_wallet_entries_id_idx" ON "payload_locked_documents_rels" USING btree ("wallet_entries_id");
  CREATE INDEX "payload_locked_documents_rels_gift_cards_id_idx" ON "payload_locked_documents_rels" USING btree ("gift_cards_id");
  CREATE INDEX "payload_locked_documents_rels_customer_packages_id_idx" ON "payload_locked_documents_rels" USING btree ("customer_packages_id");
  CREATE INDEX "payload_locked_documents_rels_loyalty_accounts_id_idx" ON "payload_locked_documents_rels" USING btree ("loyalty_accounts_id");
  CREATE INDEX "payload_locked_documents_rels_rewards_id_idx" ON "payload_locked_documents_rels" USING btree ("rewards_id");
  CREATE INDEX "payload_locked_documents_rels_referrals_id_idx" ON "payload_locked_documents_rels" USING btree ("referrals_id");
  CREATE INDEX "payload_locked_documents_rels_ratings_id_idx" ON "payload_locked_documents_rels" USING btree ("ratings_id");
  CREATE INDEX "payload_locked_documents_rels_feedback_id_idx" ON "payload_locked_documents_rels" USING btree ("feedback_id");
  CREATE INDEX "payload_locked_documents_rels_offers_id_idx" ON "payload_locked_documents_rels" USING btree ("offers_id");
  CREATE INDEX "payload_locked_documents_rels_campaign_packs_id_idx" ON "payload_locked_documents_rels" USING btree ("campaign_packs_id");
  CREATE INDEX "payload_locked_documents_rels_tracking_links_id_idx" ON "payload_locked_documents_rels" USING btree ("tracking_links_id");
  CREATE INDEX "payload_locked_documents_rels_contests_id_idx" ON "payload_locked_documents_rels" USING btree ("contests_id");
  CREATE INDEX "payload_locked_documents_rels_contest_entries_id_idx" ON "payload_locked_documents_rels" USING btree ("contest_entries_id");
  CREATE INDEX "payload_locked_documents_rels_contest_votes_id_idx" ON "payload_locked_documents_rels" USING btree ("contest_votes_id");
  CREATE INDEX "payload_locked_documents_rels_photo_tasks_id_idx" ON "payload_locked_documents_rels" USING btree ("photo_tasks_id");
  CREATE INDEX "payload_locked_documents_rels_articles_id_idx" ON "payload_locked_documents_rels" USING btree ("articles_id");
  CREATE INDEX "payload_locked_documents_rels_message_templates_id_idx" ON "payload_locked_documents_rels" USING btree ("message_templates_id");
  CREATE INDEX "payload_locked_documents_rels_messages_id_idx" ON "payload_locked_documents_rels" USING btree ("messages_id");
  CREATE INDEX "payload_locked_documents_rels_try_ons_id_idx" ON "payload_locked_documents_rels" USING btree ("try_ons_id");
  CREATE INDEX "payload_locked_documents_rels_city_listings_id_idx" ON "payload_locked_documents_rels" USING btree ("city_listings_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "salons_feature_overrides" CASCADE;
  DROP TABLE "salons_home_sections" CASCADE;
  DROP TABLE "salons_languages" CASCADE;
  DROP TABLE "salons_hours" CASCADE;
  DROP TABLE "salons_domains" CASCADE;
  DROP TABLE "salons" CASCADE;
  DROP TABLE "users_tenants" CASCADE;
  DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "users_texts" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "events" CASCADE;
  DROP TABLE "cost_ledger" CASCADE;
  DROP TABLE "subscriptions" CASCADE;
  DROP TABLE "audit_log" CASCADE;
  DROP TABLE "services" CASCADE;
  DROP TABLE "services_rels" CASCADE;
  DROP TABLE "packages_items" CASCADE;
  DROP TABLE "packages" CASCADE;
  DROP TABLE "designs_occasions" CASCADE;
  DROP TABLE "designs" CASCADE;
  DROP TABLE "designs_texts" CASCADE;
  DROP TABLE "designs_rels" CASCADE;
  DROP TABLE "_designs_v_version_occasions" CASCADE;
  DROP TABLE "_designs_v" CASCADE;
  DROP TABLE "_designs_v_texts" CASCADE;
  DROP TABLE "_designs_v_rels" CASCADE;
  DROP TABLE "moodboards" CASCADE;
  DROP TABLE "moodboards_rels" CASCADE;
  DROP TABLE "customers" CASCADE;
  DROP TABLE "customers_texts" CASCADE;
  DROP TABLE "otp_codes" CASCADE;
  DROP TABLE "availability_weekly" CASCADE;
  DROP TABLE "availability_breaks" CASCADE;
  DROP TABLE "availability_time_off" CASCADE;
  DROP TABLE "availability" CASCADE;
  DROP TABLE "appointments" CASCADE;
  DROP TABLE "appointments_rels" CASCADE;
  DROP TABLE "waitlist" CASCADE;
  DROP TABLE "waitlist_rels" CASCADE;
  DROP TABLE "group_bookings" CASCADE;
  DROP TABLE "visits_lines" CASCADE;
  DROP TABLE "visits" CASCADE;
  DROP TABLE "visits_rels" CASCADE;
  DROP TABLE "payments" CASCADE;
  DROP TABLE "wallet_entries" CASCADE;
  DROP TABLE "gift_cards" CASCADE;
  DROP TABLE "customer_packages_remaining" CASCADE;
  DROP TABLE "customer_packages" CASCADE;
  DROP TABLE "loyalty_accounts" CASCADE;
  DROP TABLE "rewards" CASCADE;
  DROP TABLE "referrals" CASCADE;
  DROP TABLE "ratings" CASCADE;
  DROP TABLE "feedback" CASCADE;
  DROP TABLE "offers_audience" CASCADE;
  DROP TABLE "offers" CASCADE;
  DROP TABLE "offers_rels" CASCADE;
  DROP TABLE "campaign_packs" CASCADE;
  DROP TABLE "tracking_links" CASCADE;
  DROP TABLE "contests" CASCADE;
  DROP TABLE "contest_entries" CASCADE;
  DROP TABLE "contest_votes" CASCADE;
  DROP TABLE "photo_tasks_shared_to" CASCADE;
  DROP TABLE "photo_tasks" CASCADE;
  DROP TABLE "photo_tasks_rels" CASCADE;
  DROP TABLE "articles" CASCADE;
  DROP TABLE "articles_texts" CASCADE;
  DROP TABLE "message_templates" CASCADE;
  DROP TABLE "messages" CASCADE;
  DROP TABLE "try_ons" CASCADE;
  DROP TABLE "city_listings" CASCADE;
  DROP TABLE "city_listings_texts" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_jobs_log" CASCADE;
  DROP TABLE "payload_jobs" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "payload_jobs_stats" CASCADE;
  DROP TYPE "public"."enum_salons_feature_overrides_feature";
  DROP TYPE "public"."enum_salons_home_sections_section";
  DROP TYPE "public"."enum_salons_languages";
  DROP TYPE "public"."enum_salons_hours_day";
  DROP TYPE "public"."enum_salons_plan";
  DROP TYPE "public"."enum_salons_status";
  DROP TYPE "public"."enum_salons_theme";
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_media_kind";
  DROP TYPE "public"."enum_events_actor_type";
  DROP TYPE "public"."enum_cost_ledger_kind";
  DROP TYPE "public"."enum_subscriptions_plan";
  DROP TYPE "public"."enum_subscriptions_status";
  DROP TYPE "public"."enum_subscriptions_billing_cycle";
  DROP TYPE "public"."enum_services_category";
  DROP TYPE "public"."enum_services_requires_deposit";
  DROP TYPE "public"."enum_packages_kind";
  DROP TYPE "public"."enum_designs_occasions";
  DROP TYPE "public"."enum_designs_category";
  DROP TYPE "public"."enum_designs_shape";
  DROP TYPE "public"."enum_designs_length";
  DROP TYPE "public"."enum_designs_source";
  DROP TYPE "public"."enum__designs_v_version_occasions";
  DROP TYPE "public"."enum__designs_v_version_category";
  DROP TYPE "public"."enum__designs_v_version_shape";
  DROP TYPE "public"."enum__designs_v_version_length";
  DROP TYPE "public"."enum__designs_v_version_source";
  DROP TYPE "public"."enum_customers_language";
  DROP TYPE "public"."enum_customers_source";
  DROP TYPE "public"."enum_customers_segment";
  DROP TYPE "public"."enum_availability_weekly_day";
  DROP TYPE "public"."enum_appointments_status";
  DROP TYPE "public"."enum_waitlist_status";
  DROP TYPE "public"."enum_group_bookings_status";
  DROP TYPE "public"."enum_visits_payment_mode";
  DROP TYPE "public"."enum_visits_paid_status";
  DROP TYPE "public"."enum_payments_kind";
  DROP TYPE "public"."enum_payments_status";
  DROP TYPE "public"."enum_wallet_entries_reason";
  DROP TYPE "public"."enum_gift_cards_kind";
  DROP TYPE "public"."enum_gift_cards_status";
  DROP TYPE "public"."enum_customer_packages_status";
  DROP TYPE "public"."enum_loyalty_accounts_tier";
  DROP TYPE "public"."enum_rewards_kind";
  DROP TYPE "public"."enum_rewards_value_type";
  DROP TYPE "public"."enum_rewards_status";
  DROP TYPE "public"."enum_referrals_channel";
  DROP TYPE "public"."enum_referrals_status";
  DROP TYPE "public"."enum_ratings_follow_up";
  DROP TYPE "public"."enum_feedback_reason";
  DROP TYPE "public"."enum_offers_audience";
  DROP TYPE "public"."enum_offers_kind";
  DROP TYPE "public"."enum_offers_value_type";
  DROP TYPE "public"."enum_offers_status";
  DROP TYPE "public"."enum_campaign_packs_value_type";
  DROP TYPE "public"."enum_tracking_links_source";
  DROP TYPE "public"."enum_contests_status";
  DROP TYPE "public"."enum_photo_tasks_shared_to";
  DROP TYPE "public"."enum_photo_tasks_status";
  DROP TYPE "public"."enum_articles_kind";
  DROP TYPE "public"."enum_articles_language";
  DROP TYPE "public"."enum_message_templates_key";
  DROP TYPE "public"."enum_message_templates_language";
  DROP TYPE "public"."enum_message_templates_approval";
  DROP TYPE "public"."enum_messages_audience";
  DROP TYPE "public"."enum_messages_category";
  DROP TYPE "public"."enum_messages_status";
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  DROP TYPE "public"."enum_payload_jobs_log_state";
  DROP TYPE "public"."enum_payload_jobs_task_slug";`)
}
