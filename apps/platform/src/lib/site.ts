import 'server-only'
import { forTenant, type ID, idOf } from '@salon/core'
import { activeRewards, aiTryOnAllowance, currentContest, walletBalance } from '@salon/modules'
import { notFound, redirect } from 'next/navigation'
import { cache } from 'react'
import { getPayloadClient } from './payload'
import { getSalonAnyStatus, getSalonBySlug, type SalonRecord, salonFeatures } from './salon'
import { getCustomerSession } from './session'

export interface CustomerRecord {
  id: ID
  name?: string | null
  phone: string
  language?: string | null
  referralCode?: string | null
  segment?: string | null
  isVip?: boolean | null
  visitCount?: number | null
  lastVisitAt?: string | null
  nextDueDate?: string | null
  birthday?: string | null
  consents?: { marketing?: boolean | null; gallery?: boolean | null; contest?: boolean | null } | null
  handProfile?: { shape?: string | null; length?: string | null; skinTone?: string | null; sensitivities?: string | null } | null
  preferredArtist?: ID | { id: ID } | null
}

/** Loads the salon for a route or 404s. */
export const loadSalon = cache(async (slug: string) => {
  const salon = await getSalonBySlug(slug)
  if (!salon) {
    // A paused salon keeps its link alive with a friendly page instead of a 404.
    if ((await getSalonAnyStatus(slug))?.status === 'suspended') redirect(`/paused/${slug}`)
    notFound()
  }
  return salon
})

export const repoFor = async (salon: SalonRecord) => forTenant(await getPayloadClient(), salon.id)

export const currentCustomer = cache(async (salon: SalonRecord): Promise<CustomerRecord | null> => {
  const session = await getCustomerSession(salon.slug, salon.id)
  if (!session) return null
  const repo = await repoFor(salon)
  return repo.findByID<CustomerRecord>('customers', session.customerId)
})

export const requireCustomer = async (salon: SalonRecord, next: string) => {
  const customer = await currentCustomer(salon)
  if (!customer) redirect(`/s/${salon.slug}/login?next=${encodeURIComponent(next)}`)
  return customer
}

export const firstName = (name?: string | null) => (name ? name.trim().split(/\s+/)[0] : null)

export interface ServiceRecord {
  id: ID
  name: string
  category: string
  description?: string | null
  price: number
  durationMinutes: number
  isAddOn?: boolean | null
  cycleDays?: number | null
  images?: unknown[] | null
  lastsDays?: number | null
  aftercare?: string | null
  order?: number | null
}

export interface DesignRecord {
  id: ID
  title: string
  images: unknown[]
  description?: string | null
  category?: string | null
  shape?: string | null
  length?: string | null
  occasions?: string[] | null
  seasons?: string[] | null
  colors?: string[] | null
  service?: ServiceRecord | ID | null
  addOns?: (ServiceRecord | ID)[] | null
  priceFrom?: number | null
  durationMinutes?: number | null
  artist?: { id: ID; name: string; avatar?: unknown } | ID | null
  source?: string | null
  featured?: boolean | null
  likes?: number | null
  createdAt: string
}

export const services = cache(async (salon: SalonRecord) => {
  const repo = await repoFor(salon)
  return (await repo.find<ServiceRecord>('services', { where: { active: { equals: true } }, sort: 'order', limit: 200, depth: 1 })).docs
})

export const designs = cache(async (salon: SalonRecord, limit = 120) => {
  const repo = await repoFor(salon)
  // The owner's chosen order (Studio → Gallery), newest first within the same position.
  return (await repo.find<DesignRecord>('designs', { where: { published: { equals: true } }, sort: ['order', '-createdAt'], limit, depth: 1 })).docs
})

export const artists = cache(async (salon: SalonRecord) => {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'users',
    overrideAccess: true,
    depth: 1,
    limit: 50,
    where: { and: [{ 'tenants.tenant': { equals: salon.id } }, { bookable: { equals: true } }, { active: { equals: true } }] },
  })
  return res.docs as unknown as { id: ID; name: string; bio?: string | null; avatar?: unknown; specialties?: string[] | null }[]
})

export const liveOffers = cache(async (salon: SalonRecord) => {
  const repo = await repoFor(salon)
  const now = new Date().toISOString()
  const res = await repo.find<{
    id: ID
    title: string
    description?: string | null
    image?: unknown
    endsAt?: string | null
    kind: string
    showOnHome?: boolean | null
  }>('offers', {
    where: { and: [{ status: { equals: 'live' } }, { or: [{ endsAt: { exists: false } }, { endsAt: { greater_than: now } }] }] },
    depth: 1,
    sort: 'endsAt',
  })
  return res.docs
})

export const recentRatings = cache(async (salon: SalonRecord) => {
  const repo = await repoFor(salon)
  const res = await repo.find<{ id: ID; score: number; comment?: string | null; customer?: { name?: string | null } | ID; createdAt: string }>('ratings', {
    where: { and: [{ score: { greater_than_equal: 4 } }, { comment: { exists: true } }] },
    sort: '-createdAt',
    limit: 6,
    depth: 1,
  })
  return res.docs
})

export const customerHome = async (salon: SalonRecord, customer: CustomerRecord) => {
  const payload = await getPayloadClient()
  const repo = forTenant(payload, salon.id)
  const now = new Date().toISOString()
  const [upcoming, account, rewards, wallet, lastVisit] = await Promise.all([
    repo.find<{
      id: ID
      start: string
      status: string
      staff?: { name?: string } | ID
      services: ({ name: string } | ID)[]
      design?: DesignRecord | ID | null
    }>('appointments', {
      where: { and: [{ customer: { equals: customer.id } }, { start: { greater_than: now } }, { status: { in: ['requested', 'confirmed'] } }] },
      sort: 'start',
      limit: 3,
      depth: 1,
    }),
    repo.findOne<{ stamps: number; points: number; tier: string }>('loyalty-accounts', { customer: { equals: customer.id } }),
    activeRewards(payload, salon.id, customer.id),
    salonFeatures(salon).has('wallet') ? walletBalance(payload, salon.id, customer.id) : Promise.resolve(0),
    repo.find<{ id: ID; createdAt: string; designName?: string | null; photos?: unknown[] | null }>('visits', {
      where: { customer: { equals: customer.id } },
      sort: '-createdAt',
      limit: 1,
      depth: 1,
    }),
  ])
  return { upcoming: upcoming.docs, account, rewards, wallet, lastVisit: lastVisit.docs[0] ?? null }
}

export const contestNow = cache(async (salon: SalonRecord) => {
  const payload = await getPayloadClient()
  return currentContest(payload, salon.id)
})

export const tryOnAllowance = async (salon: SalonRecord, customerId: ID) => aiTryOnAllowance(await getPayloadClient(), salon.id, customerId)

export { idOf }
