import { NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'

/**
 * Delivery receipts and opt-outs from the WhatsApp provider (via a small adapter on the provider side).
 * Expected body: { providerId, status: 'delivered' | 'read' | 'failed', optOut?: boolean, from?: string }
 * Protected by WHATSAPP_WEBHOOK_SECRET in the `x-webhook-secret` header.
 */
export async function POST(req: Request) {
  const secret = process.env.WHATSAPP_WEBHOOK_SECRET
  if (!secret || req.headers.get('x-webhook-secret') !== secret) return NextResponse.json({ ok: false }, { status: 401 })
  const body = (await req.json()) as { providerId?: string; status?: string; optOut?: boolean; from?: string }
  const payload = await getPayloadClient()
  if (body.optOut && body.from) {
    // STOP replies withdraw marketing consent at every salon that customer belongs to.
    const phone = body.from.startsWith('+') ? body.from : `+${body.from}`
    const customers = await payload.find({ collection: 'customers', overrideAccess: true, limit: 50, where: { phone: { equals: phone } } })
    for (const c of customers.docs as unknown as { id: string; consents?: Record<string, unknown> }[])
      await payload.update({
        collection: 'customers',
        id: c.id,
        overrideAccess: true,
        data: { consents: { ...(c.consents ?? {}), marketing: false } } as never,
      })
  }
  if (body.providerId && body.status === 'failed') {
    const msg = await payload.find({ collection: 'messages', overrideAccess: true, limit: 1, where: { providerId: { equals: body.providerId } } })
    const doc = msg.docs[0] as unknown as { id: string | number } | undefined
    if (doc) await payload.db.updateOne({ collection: 'messages', id: doc.id, data: { status: 'failed' } } as never)
  }
  return NextResponse.json({ ok: true })
}
