ALTER TABLE "agents" ADD COLUMN "page_look" text DEFAULT 'signature' NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "look" text;