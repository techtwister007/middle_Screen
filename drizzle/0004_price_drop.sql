ALTER TABLE "listings" ADD COLUMN "prev_price" bigint;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "price_dropped_at" timestamp with time zone;