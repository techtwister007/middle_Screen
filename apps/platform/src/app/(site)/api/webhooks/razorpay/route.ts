import { getPayments } from '@salon/integrations'
import { captureByProviderLink } from '@salon/modules'
import { NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'

/**
 * Razorpay webhook. Configure `payment_link.paid` in the Razorpay dashboard with RAZORPAY_WEBHOOK_SECRET.
 * Capturing is idempotent, so Razorpay's retries are safe.
 */
export async function POST(req: Request) {
  const raw = await req.text()
  if (!getPayments().verifyWebhook(raw, req.headers.get('x-razorpay-signature'))) return NextResponse.json({ ok: false }, { status: 401 })
  const body = JSON.parse(raw) as {
    event: string
    payload?: { payment_link?: { entity?: { id: string } }; payment?: { entity?: { id: string } } }
  }
  if (body.event === 'payment_link.paid') {
    const linkId = body.payload?.payment_link?.entity?.id
    if (linkId) await captureByProviderLink(await getPayloadClient(), linkId, body.payload?.payment?.entity?.id)
  }
  return NextResponse.json({ ok: true })
}
