import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_library_designs_occasions" AS ENUM('everyday', 'office', 'party', 'wedding', 'garba', 'festive', 'vacation', 'date-night');
  CREATE TYPE "public"."enum_library_designs_shape" AS ENUM('almond', 'coffin', 'square', 'oval', 'stiletto', 'round', 'squoval');
  CREATE TYPE "public"."enum_library_designs_length" AS ENUM('short', 'medium', 'long', 'extra-long');
  ALTER TYPE "public"."enum_media_kind" ADD VALUE 'library';
  CREATE TABLE "styles" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"name" varchar NOT NULL,
  	"slug" varchar,
  	"order" numeric DEFAULT 0,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "library_media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar,
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
  	"sizes_card_filename" varchar
  );
  
  CREATE TABLE "library_designs_occasions" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_library_designs_occasions",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "library_designs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar,
  	"shape" "enum_library_designs_shape",
  	"length" "enum_library_designs_length",
  	"suggested_service" varchar,
  	"credit" varchar,
  	"published" boolean DEFAULT true,
  	"times_copied" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "library_designs_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "library_designs_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"library_media_id" integer
  );
  
  ALTER TABLE "designs" ADD COLUMN "order" numeric DEFAULT 0;
  ALTER TABLE "designs" ADD COLUMN "library_design_id" integer;
  ALTER TABLE "designs_rels" ADD COLUMN "styles_id" integer;
  ALTER TABLE "_designs_v" ADD COLUMN "version_order" numeric DEFAULT 0;
  ALTER TABLE "_designs_v" ADD COLUMN "version_library_design_id" integer;
  ALTER TABLE "_designs_v_rels" ADD COLUMN "styles_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "styles_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "library_media_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "library_designs_id" integer;
  ALTER TABLE "styles" ADD CONSTRAINT "styles_tenant_id_salons_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."salons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "library_designs_occasions" ADD CONSTRAINT "library_designs_occasions_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."library_designs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "library_designs_texts" ADD CONSTRAINT "library_designs_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."library_designs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "library_designs_rels" ADD CONSTRAINT "library_designs_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."library_designs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "library_designs_rels" ADD CONSTRAINT "library_designs_rels_library_media_fk" FOREIGN KEY ("library_media_id") REFERENCES "public"."library_media"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "styles_tenant_idx" ON "styles" USING btree ("tenant_id");
  CREATE INDEX "styles_slug_idx" ON "styles" USING btree ("slug");
  CREATE INDEX "styles_updated_at_idx" ON "styles" USING btree ("updated_at");
  CREATE INDEX "styles_created_at_idx" ON "styles" USING btree ("created_at");
  CREATE INDEX "library_media_updated_at_idx" ON "library_media" USING btree ("updated_at");
  CREATE INDEX "library_media_created_at_idx" ON "library_media" USING btree ("created_at");
  CREATE UNIQUE INDEX "library_media_filename_idx" ON "library_media" USING btree ("filename");
  CREATE INDEX "library_media_sizes_thumb_sizes_thumb_filename_idx" ON "library_media" USING btree ("sizes_thumb_filename");
  CREATE INDEX "library_media_sizes_card_sizes_card_filename_idx" ON "library_media" USING btree ("sizes_card_filename");
  CREATE INDEX "library_designs_occasions_order_idx" ON "library_designs_occasions" USING btree ("order");
  CREATE INDEX "library_designs_occasions_parent_idx" ON "library_designs_occasions" USING btree ("parent_id");
  CREATE INDEX "library_designs_published_idx" ON "library_designs" USING btree ("published");
  CREATE INDEX "library_designs_updated_at_idx" ON "library_designs" USING btree ("updated_at");
  CREATE INDEX "library_designs_created_at_idx" ON "library_designs" USING btree ("created_at");
  CREATE INDEX "library_designs_texts_order_parent" ON "library_designs_texts" USING btree ("order","parent_id");
  CREATE INDEX "library_designs_rels_order_idx" ON "library_designs_rels" USING btree ("order");
  CREATE INDEX "library_designs_rels_parent_idx" ON "library_designs_rels" USING btree ("parent_id");
  CREATE INDEX "library_designs_rels_path_idx" ON "library_designs_rels" USING btree ("path");
  CREATE INDEX "library_designs_rels_library_media_id_idx" ON "library_designs_rels" USING btree ("library_media_id");
  ALTER TABLE "designs" ADD CONSTRAINT "designs_library_design_id_library_designs_id_fk" FOREIGN KEY ("library_design_id") REFERENCES "public"."library_designs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "designs_rels" ADD CONSTRAINT "designs_rels_styles_fk" FOREIGN KEY ("styles_id") REFERENCES "public"."styles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_designs_v" ADD CONSTRAINT "_designs_v_version_library_design_id_library_designs_id_fk" FOREIGN KEY ("version_library_design_id") REFERENCES "public"."library_designs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_designs_v_rels" ADD CONSTRAINT "_designs_v_rels_styles_fk" FOREIGN KEY ("styles_id") REFERENCES "public"."styles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_styles_fk" FOREIGN KEY ("styles_id") REFERENCES "public"."styles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_library_media_fk" FOREIGN KEY ("library_media_id") REFERENCES "public"."library_media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_library_designs_fk" FOREIGN KEY ("library_designs_id") REFERENCES "public"."library_designs"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "designs_library_design_idx" ON "designs" USING btree ("library_design_id");
  CREATE INDEX "designs_rels_styles_id_idx" ON "designs_rels" USING btree ("styles_id");
  CREATE INDEX "_designs_v_version_version_library_design_idx" ON "_designs_v" USING btree ("version_library_design_id");
  CREATE INDEX "_designs_v_rels_styles_id_idx" ON "_designs_v_rels" USING btree ("styles_id");
  CREATE INDEX "payload_locked_documents_rels_styles_id_idx" ON "payload_locked_documents_rels" USING btree ("styles_id");
  CREATE INDEX "payload_locked_documents_rels_library_media_id_idx" ON "payload_locked_documents_rels" USING btree ("library_media_id");
  CREATE INDEX "payload_locked_documents_rels_library_designs_id_idx" ON "payload_locked_documents_rels" USING btree ("library_designs_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "styles" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "library_media" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "library_designs_occasions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "library_designs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "library_designs_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "library_designs_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "styles" CASCADE;
  DROP TABLE "library_media" CASCADE;
  DROP TABLE "library_designs_occasions" CASCADE;
  DROP TABLE "library_designs" CASCADE;
  DROP TABLE "library_designs_texts" CASCADE;
  DROP TABLE "library_designs_rels" CASCADE;
  ALTER TABLE "designs" DROP CONSTRAINT "designs_library_design_id_library_designs_id_fk";
  
  ALTER TABLE "designs_rels" DROP CONSTRAINT "designs_rels_styles_fk";
  
  ALTER TABLE "_designs_v" DROP CONSTRAINT "_designs_v_version_library_design_id_library_designs_id_fk";
  
  ALTER TABLE "_designs_v_rels" DROP CONSTRAINT "_designs_v_rels_styles_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_styles_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_library_media_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_library_designs_fk";
  
  ALTER TABLE "media" ALTER COLUMN "kind" SET DATA TYPE text;
  ALTER TABLE "media" ALTER COLUMN "kind" SET DEFAULT 'general'::text;
  DROP TYPE "public"."enum_media_kind";
  CREATE TYPE "public"."enum_media_kind" AS ENUM('general', 'design', 'visit', 'inspiration', 'share-kit', 'try-on', 'brand');
  ALTER TABLE "media" ALTER COLUMN "kind" SET DEFAULT 'general'::"public"."enum_media_kind";
  ALTER TABLE "media" ALTER COLUMN "kind" SET DATA TYPE "public"."enum_media_kind" USING "kind"::"public"."enum_media_kind";
  DROP INDEX "designs_library_design_idx";
  DROP INDEX "designs_rels_styles_id_idx";
  DROP INDEX "_designs_v_version_version_library_design_idx";
  DROP INDEX "_designs_v_rels_styles_id_idx";
  DROP INDEX "payload_locked_documents_rels_styles_id_idx";
  DROP INDEX "payload_locked_documents_rels_library_media_id_idx";
  DROP INDEX "payload_locked_documents_rels_library_designs_id_idx";
  ALTER TABLE "designs" DROP COLUMN "order";
  ALTER TABLE "designs" DROP COLUMN "library_design_id";
  ALTER TABLE "designs_rels" DROP COLUMN "styles_id";
  ALTER TABLE "_designs_v" DROP COLUMN "version_order";
  ALTER TABLE "_designs_v" DROP COLUMN "version_library_design_id";
  ALTER TABLE "_designs_v_rels" DROP COLUMN "styles_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "styles_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "library_media_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "library_designs_id";
  DROP TYPE "public"."enum_library_designs_occasions";
  DROP TYPE "public"."enum_library_designs_shape";
  DROP TYPE "public"."enum_library_designs_length";`)
}
