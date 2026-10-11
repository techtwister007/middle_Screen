import { forTenant } from '@salon/core'
import { NextResponse } from 'next/server'
import type { Where } from 'payload'
import { getPayloadClient } from '@/lib/payload'
import { getSalonBySlug } from '@/lib/salon'
import { getCustomerSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

/** "Download my data": everything this salon holds about the logged-in customer, as JSON. */
export async function GET(_: Request, { params }: { params: Promise<{ salon: string }> }) {
  const { salon: slug } = await params
  const salon = await getSalonBySlug(slug)
  if (!salon) return new NextResponse('Not found', { status: 404 })
  const session = await getCustomerSession(slug, salon.id)
  if (!session) return new NextResponse('Please log in', { status: 401 })
  const repo = forTenant(await getPayloadClient(), salon.id)
  const mine: Where = { customer: { equals: session.customerId } }
  const all = async (collection: string, where: Where = mine) => (await repo.find(collection, { where, sort: '-createdAt', limit: 1000, depth: 0 })).docs
  const [customer, visits, appointments, rewards, loyalty, wallet, packages, ratings, referrals, moodboard, payments] = await Promise.all([
    repo.findByID('customers', session.customerId, 0),
    all('visits'),
    all('appointments'),
    all('rewards'),
    all('loyalty-accounts'),
    all('wallet-entries'),
    all('customer-packages'),
    all('ratings'),
    all('referrals', { referrer: { equals: session.customerId } }),
    all('moodboards'),
    all('payments'),
  ])
  const body = {
    exportedAt: new Date().toISOString(),
    salon: { name: salon.name, slug: salon.slug },
    customer,
    visits,
    appointments,
    loyalty: loyalty[0] ?? null,
    rewards,
    wallet,
    packages,
    ratings,
    referrals,
    savedDesigns: moodboard[0] ?? null,
    payments,
  }
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="${slug}-my-data.json"`,
      'cache-control': 'no-store',
    },
  })
}
