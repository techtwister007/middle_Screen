import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "salons" ADD COLUMN "settings_demo_expires_at" timestamp(3) with time zone;
  ALTER TABLE "salons" ADD COLUMN "settings_demo_started_at" timestamp(3) with time zone;
  ALTER TABLE "salons" ADD COLUMN "settings_demo_original_theme" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "salons" DROP COLUMN "settings_demo_expires_at";
  ALTER TABLE "salons" DROP COLUMN "settings_demo_started_at";
  ALTER TABLE "salons" DROP COLUMN "settings_demo_original_theme";`)
}
