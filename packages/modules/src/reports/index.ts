import { DAY_MS, type ID, type Paise, defineModule, forTenant, idOf, localDate, zonedDateTime } from '@salon/core'
import type { Payload } from 'payload'

export interface Range {
  from: Date
  to: Date
}

const APP_SOURCES = ['app', 'instagram', 'qr', 'whatsapp', 'google', 'reminder', 'referral', 'gift', 'offer', 'waitlist', 'discovery', 'contest']
const REMINDER_TEMPLATES = ['refill_heads_up', 'refill_due', 'winback', 'nudge_new_designs', 'waitlist_offer', 'offer']

interface VisitRow {
  id: ID
  customer: ID | { id: ID }
  staff?: ID | { id: ID; name?: string } | null
  appointment?: ID | { id: ID } | null
  total: Paise
  subtotal: Paise
  manualDiscount?: Paise
  rewardDiscount?: Paise
  isFirstVisit?: boolean
  lines: { name: string; price: Paise; quantity?: number | null }[]
  createdAt: string
}

const all = async <T>(payload: Payload, tenant: ID, collection: string, where: Record<string, unknown>, depth = 0) => {
  const repo = forTenant(payload, tenant)
  const out: T[] = []
  let page = 1
  for (;;) {
    const res = await repo.find<T>(collection, { where: where as never, limit: 1000, page, depth })
    out.push(...res.docs)
    if (!res.hasNextPage) break
    page++
  }
  return out
}

const inRange = (r: Range) => ({ and: [{ createdAt: { greater_than_equal: r.from.toISOString() } }, { createdAt: { less_than: r.to.toISOString() } }] })

export const pct = (num: number, den: number) => (den ? Math.round((num / den) * 1000) / 10 : 0)

/** Business insights for a period. Every figure is computed from recorded rows. */
export const insights = async (payload: Payload, tenant: ID, range: Range) => {
  const visits = await all<VisitRow>(payload, tenant, 'visits', inRange(range), 1)
  const appointments = await all<{ id: ID; source?: string; status: string; start: string }>(payload, tenant, 'appointments', inRange(range))
  const revenue = visits.reduce((n, v) => n + (v.total ?? 0), 0)
  const byService = new Map<string, Paise>()
  const byStaff = new Map<string, { name: string; revenue: Paise; visits: number }>()
  for (const v of visits) {
    for (const l of v.lines ?? []) byService.set(l.name, (byService.get(l.name) ?? 0) + l.price * (l.quantity ?? 1))
    const s = v.staff as { id: ID; name?: string } | null | undefined
    if (s && typeof s === 'object') {
      const row = byStaff.get(String(s.id)) ?? { name: s.name ?? 'Artist', revenue: 0, visits: 0 }
      row.revenue += v.total ?? 0
      row.visits++
      byStaff.set(String(s.id), row)
    }
  }
  const bySource = new Map<string, number>()
  for (const a of appointments) bySource.set(a.source ?? 'app', (bySource.get(a.source ?? 'app') ?? 0) + 1)
  const completed = appointments.filter((a) => a.status === 'completed').length
  const noShows = appointments.filter((a) => a.status === 'no-show').length
  const cancelled = appointments.filter((a) => a.status === 'cancelled').length
  const firstVisits = visits.filter((v) => v.isFirstVisit).length

  // First-to-second-visit rate: customers whose first visit was 30–120 days before the end of the range.
  const cohortFrom = new Date(range.to.getTime() - 120 * DAY_MS).toISOString()
  const cohortTo = new Date(range.to.getTime() - 30 * DAY_MS).toISOString()
  const cohortFirst = await all<{ customer: ID | { id: ID } }>(payload, tenant, 'visits', {
    and: [{ isFirstVisit: { equals: true } }, { createdAt: { greater_than_equal: cohortFrom } }, { createdAt: { less_than: cohortTo } }],
  })
  const cohortIds = cohortFirst.map((v) => idOf(v.customer) as ID)
  const returned = cohortIds.length
    ? await forTenant(payload, tenant).count('customers', { and: [{ id: { in: cohortIds } }, { visitCount: { greater_than_equal: 2 } }] })
    : 0

  const ratings = await all<{ score: number }>(payload, tenant, 'ratings', inRange(range))
  const referrals = await forTenant(payload, tenant).count('referrals', {
    and: [{ status: { in: ['visited', 'rewarded'] } }, { convertedAt: { greater_than_equal: range.from.toISOString() } }, { convertedAt: { less_than: range.to.toISOString() } }],
  })
  const shares = await forTenant(payload, tenant).count('photo-tasks', { and: [inRange(range), { status: { in: ['shared', 'verified'] } }] })
  const messages = await all<{ cost: number; category: string; status: string }>(payload, tenant, 'messages', inRange(range))

  return {
    range: { from: range.from.toISOString(), to: range.to.toISOString() },
    visits: visits.length,
    revenue,
    averageBill: visits.length ? Math.round(revenue / visits.length) : 0,
    newCustomers: firstVisits,
    returningVisits: visits.length - firstVisits,
    repeatRate: pct(visits.length - firstVisits, visits.length),
    firstToSecondRate: pct(returned, cohortIds.length),
    firstToSecondCohort: cohortIds.length,
    bookings: appointments.length,
    bookingsBySource: Object.fromEntries(bySource),
    noShowRate: pct(noShows, completed + noShows),
    cancellationRate: pct(cancelled, appointments.length),
    revenueByService: [...byService.entries()].map(([name, value]) => ({ name, revenue: value })).sort((a, b) => b.revenue - a.revenue),
    revenueByStaff: [...byStaff.values()].sort((a, b) => b.revenue - a.revenue),
    discountSpend: visits.reduce((n, v) => n + (v.manualDiscount ?? 0) + (v.rewardDiscount ?? 0), 0),
    averageRating: ratings.length ? Math.round((ratings.reduce((n, r) => n + r.score, 0) / ratings.length) * 10) / 10 : null,
    ratings: ratings.length,
    referralsConverted: referrals,
    sharedPosts: shares,
    messagesSent: messages.filter((m) => m.status === 'sent').length,
    messageCost: messages.reduce((n, m) => n + (m.cost ?? 0), 0),
  }
}

export type Insights = Awaited<ReturnType<typeof insights>>

/** The monthly ROI story: what the platform brought in versus what it cost. */
export const roiStory = async (payload: Payload, tenant: ID, range: Range, planPrice: Paise) => {
  const repo = forTenant(payload, tenant)
  const visits = await all<VisitRow>(payload, tenant, 'visits', inRange(range))
  const apptIds = visits.map((v) => idOf(v.appointment)).filter((x): x is ID => x != null)
  const appts = apptIds.length
    ? (await repo.find<{ id: ID; source?: string }>('appointments', { where: { id: { in: apptIds } }, limit: 5000 })).docs
    : []
  const appBooked = new Set(appts.filter((a) => APP_SOURCES.includes(a.source ?? 'app')).map((a) => String(a.id)))
  const influenced = new Map<string, Paise>()
  let viaApp = 0
  let fromReminders = 0
  for (const v of visits) {
    const apptId = idOf(v.appointment)
    if (apptId && appBooked.has(String(apptId))) {
      viaApp++
      influenced.set(String(v.id), v.total)
    }
  }
  for (const v of visits) {
    if (v.isFirstVisit) continue
    const since = new Date(new Date(v.createdAt).getTime() - 21 * DAY_MS).toISOString()
    const reminded = await repo.count('messages', {
      and: [
        { customer: { equals: idOf(v.customer) } },
        { template: { in: REMINDER_TEMPLATES } },
        { status: { equals: 'sent' } },
        { createdAt: { greater_than_equal: since } },
        { createdAt: { less_than: v.createdAt } },
      ],
    })
    if (reminded) {
      fromReminders++
      influenced.set(String(v.id), v.total)
    }
  }
  const referralVisits = await all<{ invitee: ID | { id: ID } }>(payload, tenant, 'referrals', {
    and: [{ status: { in: ['visited', 'rewarded'] } }, { convertedAt: { greater_than_equal: range.from.toISOString() } }, { convertedAt: { less_than: range.to.toISOString() } }],
  })
  const inviteeIds = new Set(referralVisits.map((r) => String(idOf(r.invitee))))
  for (const v of visits) if (v.isFirstVisit && inviteeIds.has(String(idOf(v.customer)))) influenced.set(String(v.id), v.total)
  const shares = await repo.count('photo-tasks', { and: [inRange(range), { status: { in: ['shared', 'verified'] } }] })
  const messages = await all<{ cost: number }>(payload, tenant, 'messages', inRange(range))
  const revenueInfluenced = [...influenced.values()].reduce((n, x) => n + x, 0)
  const messageCost = messages.reduce((n, m) => n + (m.cost ?? 0), 0)
  return {
    bookingsViaApp: viaApp,
    repeatFromReminders: fromReminders,
    newFromReferrals: referralVisits.length,
    taggedPosts: shares,
    revenueInfluenced,
    planPrice,
    messageCost,
    multiple: planPrice ? Math.round((revenueInfluenced / (planPrice + messageCost)) * 10) / 10 : null,
  }
}

export type RoiStory = Awaited<ReturnType<typeof roiStory>>

export interface ActionCard {
  key: string
  priority: number
  title: string
  detail?: string
  count?: number
  action: { label: string; href: string }
}

/** The owner's "Today" feed: things to do, most valuable first. */
export const actionFeed = async (payload: Payload, tenant: ID, studioBase: string, now = new Date()): Promise<ActionCard[]> => {
  const repo = forTenant(payload, tenant)
  const salon = (await payload.findByID({ collection: 'salons' as never, id: tenant, depth: 0, overrideAccess: true })) as {
    timezone?: string
    createdAt: string
  }
  const tz = salon.timezone ?? 'Asia/Kolkata'
  const cards: ActionCard[] = []

  const requests = await repo.count('appointments', { and: [{ status: { equals: 'requested' } }, { start: { greater_than: now.toISOString() } }] })
  if (requests)
    cards.push({ key: 'requests', priority: 100, title: `${requests} booking request${requests > 1 ? 's' : ''} to confirm`, count: requests, action: { label: 'Review', href: `${studioBase}/today#requests` } })

  const lowRatings = await repo.count('ratings', { followUp: { equals: 'needed' } })
  if (lowRatings)
    cards.push({ key: 'low-ratings', priority: 95, title: `${lowRatings} unhappy customer${lowRatings > 1 ? 's' : ''} to call`, detail: 'A quick call today usually wins them back.', count: lowRatings, action: { label: 'See who', href: `${studioBase}/customers?filter=follow-up` } })

  const due = await repo.count('customers', { segment: { equals: 'due' } })
  if (due)
    cards.push({ key: 'due', priority: 90, title: `${due} customer${due > 1 ? 's are' : ' is'} due for a refill`, detail: 'Reminders go out automatically. Send a personal note to the ones you know well.', count: due, action: { label: 'Remind', href: `${studioBase}/customers?segment=due` } })

  const atRisk = await repo.count('customers', { segment: { equals: 'at-risk' } })
  if (atRisk)
    cards.push({ key: 'at-risk', priority: 70, title: `${atRisk} customer${atRisk > 1 ? 's' : ''} at risk of not coming back`, count: atRisk, action: { label: 'Win back', href: `${studioBase}/customers?segment=at-risk` } })

  const toVerify = await repo.count('photo-tasks', { status: { equals: 'shared' } })
  if (toVerify)
    cards.push({ key: 'verify', priority: 60, title: `${toVerify} share${toVerify > 1 ? 's' : ''} to verify`, detail: 'Customers earn points once you confirm their post.', count: toVerify, action: { label: 'Verify', href: `${studioBase}/photos?tab=verify` } })

  const pendingPhotos = await repo.count('photo-tasks', { status: { equals: 'pending' } })
  if (pendingPhotos)
    cards.push({ key: 'photos', priority: 65, title: `${pendingPhotos} finished set${pendingPhotos > 1 ? 's' : ''} waiting for photos`, count: pendingPhotos, action: { label: 'Photo corner', href: `${studioBase}/photos` } })

  // Quiet tomorrow? Suggest a slot-filler deal.
  const tomorrow = localDate(new Date(now.getTime() + DAY_MS), tz)
  const tStart = zonedDateTime(tomorrow, '00:00', tz)
  const tomorrowCount = await repo.count('appointments', {
    and: [{ start: { greater_than_equal: tStart.toISOString() } }, { start: { less_than: new Date(tStart.getTime() + DAY_MS).toISOString() } }, { status: { in: ['requested', 'confirmed'] } }],
  })
  const artists = await payload.count({ collection: 'users' as never, overrideAccess: true, where: { and: [{ 'tenants.tenant': { equals: tenant } }, { bookable: { equals: true } }] } })
  if (artists.totalDocs && tomorrowCount < artists.totalDocs * 3)
    cards.push({ key: 'slot-filler', priority: 55, title: 'Tomorrow has free slots', detail: `${tomorrowCount} bookings so far. Launch a slot-filler deal for customers who are due?`, action: { label: 'Fill slots', href: `${studioBase}/campaigns/new?kind=slot-filler&date=${tomorrow}` } })

  // Festival pack starting within 30 days that the salon has not launched.
  const packs = await payload.find({
    collection: 'campaign-packs' as never,
    overrideAccess: true,
    depth: 0,
    limit: 3,
    sort: 'startsOn',
    where: { and: [{ startsOn: { greater_than: new Date(now.getTime() - 3 * DAY_MS).toISOString() } }, { startsOn: { less_than: new Date(now.getTime() + 30 * DAY_MS).toISOString() } }] },
  })
  for (const p of packs.docs as unknown as { id: ID; title: string; festival: string; startsOn: string }[]) {
    const launched = await repo.count('offers', { pack: { equals: p.id } })
    if (!launched) {
      const days = Math.max(0, Math.ceil((new Date(p.startsOn).getTime() - now.getTime()) / DAY_MS))
      cards.push({ key: `pack-${p.id}`, priority: 80, title: `${p.title} starts in ${days} day${days === 1 ? '' : 's'}`, detail: 'The campaign pack is ready: offer, message and gallery section.', action: { label: 'Preview pack', href: `${studioBase}/campaigns/new?pack=${p.id}` } })
    }
  }

  return cards.sort((a, b) => b.priority - a.priority)
}

/** Platform console: health of every salon. */
export const salonHealth = async (payload: Payload, salon: { id: ID; createdAt: string }) => {
  const repo = forTenant(payload, salon.id)
  const monthStart = new Date()
  monthStart.setUTCDate(1)
  monthStart.setUTCHours(0, 0, 0, 0)
  const customers = await repo.count('customers')
  const activationDeadline = new Date(new Date(salon.createdAt).getTime() + 14 * DAY_MS)
  const customersBy14 = await repo.count('customers', { createdAt: { less_than: activationDeadline.toISOString() } })
  const bookingsThisMonth = await repo.count('appointments', { createdAt: { greater_than_equal: monthStart.toISOString() } })
  const visitsThisMonth = await repo.count('visits', { createdAt: { greater_than_equal: monthStart.toISOString() } })
  const costs = await all<{ total: number }>(payload, salon.id, 'cost-ledger', { period: { equals: monthStart.toISOString().slice(0, 7) } })
  const lastEvent = await repo.find<{ createdAt: string }>('events', { sort: '-createdAt', limit: 1 })
  const lastActivity = lastEvent.docs[0]?.createdAt ?? null
  const daysQuiet = lastActivity ? Math.floor((Date.now() - new Date(lastActivity).getTime()) / DAY_MS) : null
  const activated = customersBy14 >= 20 || customers >= 20
  return {
    customers,
    activated,
    bookingsThisMonth,
    visitsThisMonth,
    passThroughCost: costs.reduce((n, c) => n + (c.total ?? 0), 0),
    lastActivity,
    churnRisk: daysQuiet == null || daysQuiet > 7 ? 'high' : visitsThisMonth < 10 ? 'medium' : 'low',
  }
}

export const reportsModule = defineModule({
  key: 'reports',
  feature: 'reports',
})
