ALTER TABLE "leads" ADD COLUMN "last_contacted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "closed_lead_id" text;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "closed_at" timestamp with time zone;