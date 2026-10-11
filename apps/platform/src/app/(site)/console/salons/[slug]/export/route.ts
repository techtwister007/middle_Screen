import { forTenant } from '@salon/core'
import { tenantCollections } from '@salon/modules'
import { getPayloadClient } from '@/lib/payload'
import { getSalonAnyStatus } from '@/lib/salon'
import { requirePlatformAdmin } from '@/lib/staff'

// Secrets never leave the platform, even in an export.
const DROP = new Set(['hash', 'salt', 'codeHash', 'password', 'resetPasswordToken', 'apiKey'])
const clean = (v: unknown): unknown =>
  Array.isArray(v)
    ? v.map(clean)
    : v && typeof v === 'object'
      ? Object.fromEntries(
          Object.entries(v)
            .filter(([k]) => !DROP.has(k))
            .map(([k, x]) => [k, clean(x)]),
        )
      : v

/** Everything one salon owns, as JSON: for a salon leaving, a data request or a migration. Audit-logged. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const user = await requirePlatformAdmin()
  const salon = await getSalonAnyStatus(slug)
  if (!salon) return new Response('Not found', { status: 404 })
  const payload = await getPayloadClient()
  const repo = forTenant(payload, salon.id)
  const out: Record<string, unknown> = { exportedAt: new Date().toISOString(), salon: clean(salon) }
  for (const col of tenantCollections()) {
    if (col === 'otp-codes' || col === 'events') continue
    out[col] = clean((await repo.find(col, { limit: 100_000, depth: 0 })).docs)
  }
  await payload.create({ collection: 'audit-log', overrideAccess: true, data: { actor: user.id, action: 'salon.exported', details: { slug } } as never })
  return new Response(JSON.stringify(out, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${slug}-export-${new Date().toISOString().slice(0, 10)}.json"`,
      'Cache-Control': 'no-store',
    },
  })
}
