// Usage: pnpm migrate:create <name>
// Creates a Payload migration, then fixes its imports so Vitest (Node type stripping) can load it.
import { execFileSync } from 'node:child_process'

const name = process.argv[2]
if (!name) {
  console.error('Usage: pnpm migrate:create <short_name>')
  process.exit(1)
}
execFileSync('pnpm', ['exec', 'payload', 'migrate:create', name], { stdio: 'inherit', env: { ...process.env, NODE_OPTIONS: '--no-deprecation' } })
execFileSync('node', ['scripts/fix-migrations.mjs'], { stdio: 'inherit' })
