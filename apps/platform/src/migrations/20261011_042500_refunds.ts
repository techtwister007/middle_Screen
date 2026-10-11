import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "salons" ADD COLUMN "settings_deposit_refund_hours" numeric DEFAULT 24;
  ALTER TABLE "payments" ADD COLUMN "refund_id" varchar;
  ALTER TABLE "payments" ADD COLUMN "refunded_at" timestamp(3) with time zone;
  ALTER TABLE "payments" ADD COLUMN "refund_note" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "salons" DROP COLUMN "settings_deposit_refund_hours";
  ALTER TABLE "payments" DROP COLUMN "refund_id";
  ALTER TABLE "payments" DROP COLUMN "refunded_at";
  ALTER TABLE "payments" DROP COLUMN "refund_note";`)
}
