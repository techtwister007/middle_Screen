#!/usr/bin/env bash
# One-command local setup: dependencies, env file, databases, schema and demo data.
#   ./scripts/setup-local.sh            # keeps existing data
#   ./scripts/setup-local.sh --fresh    # drops and recreates salon_dev first
set -euo pipefail
cd "$(dirname "$0")/.."

pnpm install --frozen-lockfile

APP=apps/platform
if [ ! -f "$APP/.env" ]; then
  cp "$APP/.env.example" "$APP/.env"
  secret() { node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"; }
  sed -i.bak "s/^PAYLOAD_SECRET=.*/PAYLOAD_SECRET=$(secret)/; s/^CUSTOMER_SESSION_SECRET=.*/CUSTOMER_SESSION_SECRET=$(secret)/" "$APP/.env" && rm -f "$APP/.env.bak"
  echo "Created $APP/.env"
fi

# Postgres connection without the database name, taken from DATABASE_URL.
DB_URL=$(grep '^DATABASE_URL=' "$APP/.env" | cut -d= -f2-)
SERVER_URL="${DB_URL%/*}/postgres"
for db in salon_dev salon_test; do
  if [ "$db" = salon_dev ] && [ "${1:-}" = "--fresh" ]; then psql "$SERVER_URL" -qc "drop database if exists $db with (force)"; fi
  psql "$SERVER_URL" -tAc "select 1 from pg_database where datname='$db'" | grep -q 1 || psql "$SERVER_URL" -qc "create database $db"
done

cd "$APP"
pnpm migrate
if [ "$(psql "$DB_URL" -tAc 'select count(*) from salons')" = "0" ]; then pnpm seed; else echo "Demo data already present (use --fresh to reseed)"; fi
echo "Ready: cd $APP && pnpm dev  →  http://localhost:3000"
