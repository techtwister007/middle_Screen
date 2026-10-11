import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_message_templates_key" ADD VALUE 'running_late' BEFORE 'booking_cancelled';
  ALTER TYPE "public"."enum_message_templates_key" ADD VALUE 'owner_monthly_report';
  ALTER TYPE "public"."enum_message_templates_key" ADD VALUE 'owner_cancellation';
  ALTER TYPE "public"."enum_message_templates_key" ADD VALUE 'owner_collage_ready';
  ALTER TYPE "public"."enum_message_templates_key" ADD VALUE 'owner_photo_approval';
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'content-weekly-collage' BEFORE 'messaging-owner-daily-summary';
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'reports-monthly-roi';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'content-weekly-collage' BEFORE 'messaging-owner-daily-summary';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'reports-monthly-roi';
  ALTER TABLE "salons" ADD COLUMN "settings_change_cutoff_hours" numeric DEFAULT 4;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "message_templates" ALTER COLUMN "key" SET DATA TYPE text;
  DROP TYPE "public"."enum_message_templates_key";
  CREATE TYPE "public"."enum_message_templates_key" AS ENUM('otp', 'booking_received', 'booking_confirmed', 'booking_reminder', 'booking_cancelled', 'waitlist_offer', 'nails_ready', 'rating_request', 'thanks_review', 'aftercare', 'refill_heads_up', 'refill_due', 'nudge_new_designs', 'winback', 'last_chance_survey', 'reward_issued', 'referral_converted', 'gift_received', 'offer', 'owner_new_booking', 'owner_low_rating', 'owner_daily_summary');
  ALTER TABLE "message_templates" ALTER COLUMN "key" SET DATA TYPE "public"."enum_message_templates_key" USING "key"::"public"."enum_message_templates_key";
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'dispatch-event', 'module-step', 'platform-expire-demos', 'customers-nightly-segments', 'loyalty-birthdays-and-expiry', 'campaigns-end-offers', 'contests-close-ended', 'messaging-owner-daily-summary');
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_log_task_slug" USING "task_slug"::"public"."enum_payload_jobs_log_task_slug";
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'dispatch-event', 'module-step', 'platform-expire-demos', 'customers-nightly-segments', 'loyalty-birthdays-and-expiry', 'campaigns-end-offers', 'contests-close-ended', 'messaging-owner-daily-summary');
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_task_slug" USING "task_slug"::"public"."enum_payload_jobs_task_slug";
  ALTER TABLE "salons" DROP COLUMN "settings_change_cutoff_hours";`)
}
