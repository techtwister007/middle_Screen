import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_photo_tasks_status" ADD VALUE 'skipped';
  ALTER TABLE "visits" ADD COLUMN "voided_at" timestamp(3) with time zone;
  CREATE INDEX "visits_voided_at_idx" ON "visits" USING btree ("voided_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "photo_tasks" ALTER COLUMN "status" SET DATA TYPE text;
  ALTER TABLE "photo_tasks" ALTER COLUMN "status" SET DEFAULT 'pending'::text;
  DROP TYPE "public"."enum_photo_tasks_status";
  CREATE TYPE "public"."enum_photo_tasks_status" AS ENUM('pending', 'sent', 'shared', 'verified');
  ALTER TABLE "photo_tasks" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."enum_photo_tasks_status";
  ALTER TABLE "photo_tasks" ALTER COLUMN "status" SET DATA TYPE "public"."enum_photo_tasks_status" USING "status"::"public"."enum_photo_tasks_status";
  DROP INDEX "visits_voided_at_idx";
  ALTER TABLE "visits" DROP COLUMN "voided_at";`)
}
