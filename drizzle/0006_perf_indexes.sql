CREATE INDEX "buyer_actions_listing_idx" ON "buyer_actions" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "questions_agent_idx" ON "questions" USING btree ("agent_id","created_at");--> statement-breakpoint
CREATE INDEX "questions_lead_idx" ON "questions" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "shares_collection_idx" ON "shares" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "visits_lead_idx" ON "visits" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "visits_listing_idx" ON "visits" USING btree ("listing_id");