# 4. Supabase for Postgres and file storage

Date: 2026-10-11 · Status: accepted

**Decision.** Production uses Supabase Postgres (Mumbai) through Payload's Postgres adapter and Supabase Storage through Payload's S3 adapter (`S3_*` env vars). Supabase Auth and RLS are not used: Payload handles auth and tenant isolation.

**Locally** any Postgres works and uploads go to `apps/platform/media`.
