// Payload generates value imports for types in migrations; Node's type stripping (used by Vitest's
// migration loader) needs `import type`. Run after `payload migrate:create`.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const dir = path.resolve(import.meta.dirname, '../src/migrations')
for (const f of readdirSync(dir).filter((x) => x.endsWith('.ts') && x !== 'index.ts')) {
  const p = path.join(dir, f)
  const src = readFileSync(p, 'utf8')
  const fixed = src.replace(
    "import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'",
    "import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'",
  )
  if (fixed !== src) writeFileSync(p, fixed)
}
