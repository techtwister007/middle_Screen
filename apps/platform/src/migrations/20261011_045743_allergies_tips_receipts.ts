import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_visits_payment_split_mode" AS ENUM('upi', 'cash', 'card', 'payment-link', 'wallet');
  ALTER TYPE "public"."enum_message_templates_key" ADD VALUE 'receipt' BEFORE 'running_late';
  CREATE TABLE "visits_payment_split" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"mode" "enum_visits_payment_split_mode" NOT NULL,
  	"amount" numeric DEFAULT 0
  );
  
  ALTER TABLE "customers" ADD COLUMN "allergies" varchar;
  ALTER TABLE "visits" ADD COLUMN "tip" numeric DEFAULT 0;
  ALTER TABLE "visits" ADD COLUMN "receipt_sent_at" timestamp(3) with time zone;
  ALTER TABLE "visits_payment_split" ADD CONSTRAINT "visits_payment_split_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."visits"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "visits_payment_split_order_idx" ON "visits_payment_split" USING btree ("_order");
  CREATE INDEX "visits_payment_split_parent_id_idx" ON "visits_payment_split" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "visits_payment_split" CASCADE;
  ALTER TABLE "message_templates" ALTER COLUMN "key" SET DATA TYPE text;
  DROP TYPE "public"."enum_message_templates_key";
  CREATE TYPE "public"."enum_message_templates_key" AS ENUM('otp', 'booking_received', 'booking_confirmed', 'booking_reminder', 'running_late', 'booking_cancelled', 'waitlist_offer', 'nails_ready', 'rating_request', 'thanks_review', 'aftercare', 'refill_heads_up', 'refill_due', 'nudge_new_designs', 'winback', 'last_chance_survey', 'reward_issued', 'referral_converted', 'gift_received', 'offer', 'owner_new_booking', 'owner_low_rating', 'owner_daily_summary', 'owner_monthly_report', 'owner_cancellation', 'owner_collage_ready', 'owner_photo_approval');
  ALTER TABLE "message_templates" ALTER COLUMN "key" SET DATA TYPE "public"."enum_message_templates_key" USING "key"::"public"."enum_message_templates_key";
  ALTER TABLE "customers" DROP COLUMN "allergies";
  ALTER TABLE "visits" DROP COLUMN "tip";
  ALTER TABLE "visits" DROP COLUMN "receipt_sent_at";
  DROP TYPE "public"."enum_visits_payment_split_mode";`)
}
