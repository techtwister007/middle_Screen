/**
 * Seeds the platform admin, festival packs, articles and three demo salons.
 *   pnpm seed                 # all demo salons
 *   pnpm seed -- glamnails    # one salon
 *   pnpm seed -- --platform-only   # admin, festival packs, articles, design library; no demo salons (production)
 * Passwords come from SEED_ADMIN_PASSWORD / SEED_OWNER_PASSWORD (defaults are for local dev only).
 */
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { DEMO_SALONS, seedPlatform, seedSalon } from '../src/seed/demo'

const main = async () => {
  const payload = await getPayload({ config })
  const only = process.argv.slice(2).filter((a) => !a.startsWith('-'))
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'admin-demo-123'
  const ownerPassword = process.env.SEED_OWNER_PASSWORD ?? 'owner-demo-123'
  console.log('Seeding platform…')
  await seedPlatform(payload, adminPassword)
  const platformOnly = process.argv.includes('--platform-only')
  for (const def of platformOnly ? [] : DEMO_SALONS) {
    if (only.length && !only.includes(def.slug)) continue
    await seedSalon(payload, def, { ownerPassword, log: console.log })
  }
  console.log('Done.')
  console.log(`Platform admin: admin@platform.test / ${adminPassword}`)
  if (!platformOnly) console.log(`Salon owners:   owner@glamnails.test, owner@aura.test, owner@riddhi.test / ${ownerPassword}`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
