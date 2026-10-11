import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'platform-expire-demos' BEFORE 'customers-nightly-segments';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'platform-expire-demos' BEFORE 'customers-nightly-segments';
  ALTER TABLE "salons" ADD COLUMN "settings_wifi_name" varchar;
  ALTER TABLE "salons" ADD COLUMN "settings_wifi_password" varchar;
  ALTER TABLE "salons" ADD COLUMN "settings_demo_phone" varchar;
  ALTER TABLE "salons" ADD COLUMN "settings_keep_demo" boolean DEFAULT false;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'dispatch-event', 'module-step', 'customers-nightly-segments', 'loyalty-birthdays-and-expiry', 'campaigns-end-offers', 'contests-close-ended', 'messaging-owner-daily-summary');
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_log_task_slug" USING "task_slug"::"public"."enum_payload_jobs_log_task_slug";
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'dispatch-event', 'module-step', 'customers-nightly-segments', 'loyalty-birthdays-and-expiry', 'campaigns-end-offers', 'contests-close-ended', 'messaging-owner-daily-summary');
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_task_slug" USING "task_slug"::"public"."enum_payload_jobs_task_slug";
  ALTER TABLE "salons" DROP COLUMN "settings_wifi_name";
  ALTER TABLE "salons" DROP COLUMN "settings_wifi_password";
  ALTER TABLE "salons" DROP COLUMN "settings_demo_phone";
  ALTER TABLE "salons" DROP COLUMN "settings_keep_demo";`)
}
