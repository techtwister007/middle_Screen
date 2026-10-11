import { forTenant, PLAN_LABELS, PLAN_PRICES, PLAN_SETUP_FEES, PLANS } from '@salon/core'
import { upiUri } from '@salon/integrations'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import QRCode from 'qrcode'
import { RoiCalculator } from '@/components/console/RoiCalculator'
import { PLATFORM_NAME } from '@/lib/brand'
import { getPayloadClient } from '@/lib/payload'
import { getSalonAnyStatus } from '@/lib/salon'

export const metadata = { title: 'What it could earn' }

const FOUNDING_PLACES = 10

export default async function RoiPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const salon = await getSalonAnyStatus(slug)
  if (!salon) notFound()
  const payload = await getPayloadClient()
  const services = (
    await forTenant(payload, salon.id).find<{ price: number; isAddOn?: boolean; category?: string }>('services', {
      where: { active: { equals: true } },
      limit: 200,
      depth: 0,
    })
  ).docs.filter((s) => !s.isAddOn && s.category !== 'removal')
  // Typical bill: the median main service on their own menu.
  const prices = services.map((s) => s.price).sort((a, b) => a - b)
  const typicalBill = prices.length ? Math.round(prices[Math.floor(prices.length / 2)] / 100) : 1200
  const founding = await payload.count({ collection: 'subscriptions', overrideAccess: true, where: { foundingCustomer: { equals: true } } })
  const placesLeft = Math.max(0, FOUNDING_PLACES - founding.totalDocs)
  const vpa = process.env.PLATFORM_UPI_VPA
  const plans = await Promise.all(
    PLANS.map(async (p) => ({
      key: p,
      label: PLAN_LABELS[p],
      monthly: PLAN_PRICES[p],
      setup: PLAN_SETUP_FEES[p],
      qr: vpa
        ? await QRCode.toDataURL(upiUri(vpa, PLATFORM_NAME, PLAN_SETUP_FEES[p], `Setup ${salon.name}`.slice(0, 40)), { margin: 1, width: 320 })
        : null,
    })),
  )
  return (
    <div>
      <Link className='text-sm text-brand' href={`/console/demo/${slug}`}>
        ← Presenter
      </Link>
      <h1 className='mt-2 mb-6 font-heading text-3xl'>What {salon.name} could earn</h1>
      <RoiCalculator
        defaultBill={typicalBill}
        defaultPlan={salon.plan === 'starter' || salon.plan === 'growth' ? salon.plan : 'studio'}
        placesLeft={placesLeft}
        plans={plans}
        salonName={salon.name}
        upiReady={Boolean(vpa)}
      />
    </div>
  )
}
