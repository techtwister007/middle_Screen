import { getPayloadClient } from '@/lib/payload'

export const dynamic = 'force-dynamic'

/** Uptime check: 200 when the app can reach the database. */
export async function GET() {
  const started = Date.now()
  try {
    const payload = await getPayloadClient()
    await payload.count({ collection: 'salons', overrideAccess: true })
    return Response.json({ ok: true, db: 'up', ms: Date.now() - started }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('[healthz]', err)
    return Response.json({ ok: false, db: 'down' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
