'use server'

import { asId, forTenant, getEventBus, type ID, idOf, PLAN_PRICES, type Plan, rupees, slugify } from '@salon/core'
import {
  closeContest,
  completePhotoTask,
  completeVisit,
  findOrCreateCustomer,
  getAvailableSlots,
  launchOffer,
  offerFromPack,
  photoTaskForVisit,
  requestBooking,
  submitRating,
} from '@salon/modules'
import { revalidatePath } from 'next/cache'
import type { FormState } from '@/app/(site)/studio/[salon]/settings/actions'
import { parseMenuText } from '@/lib/menuText'
import { getPayloadClient } from '@/lib/payload'
import { requirePlatformAdmin } from '@/lib/staff'
import { NAIL_SERVICES } from '@/seed/content'
import { type SalonSeed, seedSalon } from '@/seed/demo'

type Result<T = unknown> = { ok: true; data?: T; message?: string } | { ok: false; error: string }

const fail = (err: unknown): { ok: false; error: string } => {
  console.error(err)
  return { ok: false, error: err instanceof Error ? err.message : 'Something went wrong' }
}

const audit = async (action: string, details: Record<string, unknown>) => {
  const user = await requirePlatformAdmin()
  const payload = await getPayloadClient()
  await payload.create({ collection: 'audit-log', overrideAccess: true, data: { action, actor: user.id, details } as never })
}

// ---------------------------------------------------------------------------
// Onboarding and demo builder
// ---------------------------------------------------------------------------

export async function createSalonFromForm(_: unknown, form: FormData): Promise<Result<{ slug: string }>> {
  try {
    await requirePlatformAdmin()
    const name = String(form.get('name') ?? '').trim()
    const slug = slugify(String(form.get('slug') || name)).slice(0, 40)
    if (!name || !slug) return { ok: false, error: 'Name is required' }
    const isDemo = form.get('demo') === 'on'
    const photos = form.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0 && f.type.startsWith('image/'))
    const designImages = await Promise.all(
      photos
        .slice(0, 24)
        .map(async (f) => ({ buffer: Buffer.from(await f.arrayBuffer()), mimetype: f.type, title: f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ') })),
    )
    // The prospect's own menu, pasted from their price list, makes the demo feel like theirs.
    const menuServices = parseMenuText(String(form.get('menu') ?? '')).parsed.map((m) => ({
      name: m.name,
      category: m.category,
      price: m.price,
      minutes: m.minutes,
      cycleDays: ['gel', 'extensions', 'refill', 'nail-art'].includes(m.category) ? 21 : undefined,
    }))
    const def: SalonSeed = {
      name,
      slug,
      tagline: String(form.get('tagline') || 'Nail art that gets you noticed'),
      about: String(form.get('about') || `${name} in ${form.get('area') || 'Vadodara'}.`),
      theme: String(form.get('theme') || 'default') as SalonSeed['theme'],
      plan: String(form.get('plan') || 'studio') as SalonSeed['plan'],
      colors: { cover: ['#F6D6DF', '#E8B4C8', '#C77D9E'], logoBg: String(form.get('primary') || '#B4537A'), logoFg: '#FFFFFF' },
      area: `${form.get('area') || 'Alkapuri'}, Vadodara`,
      instagram: String(form.get('instagram') || '').replace(/^@/, ''),
      phone: String(form.get('phone') || '+919800000000'),
      artists: String(form.get('artists') || 'Artist One')
        .split(',')
        .map((n) => n.trim())
        .filter(Boolean)
        .map((n, i) => ({ name: n, specialties: [], color: ['#B4537A', '#8E6BBF', '#D98C6C', '#5E8C7A'][i % 4] })),
      services: menuServices.length ? menuServices : NAIL_SERVICES,
      designCount: designImages.length || 12,
      customers: isDemo ? 120 : 0,
      ownerEmail: String(form.get('ownerEmail') || `owner@${slug}.test`),
      ownerName: String(form.get('ownerName') || 'Owner'),
      seed: Math.floor(Math.random() * 1000) + 100,
      status: isDemo ? 'demo' : 'active',
    }
    const payload = await getPayloadClient()
    const salon = await seedSalon(payload, def, { ownerPassword: String(form.get('ownerPassword') || 'change-me-now'), designImages })
    const logoFile = form.get('logo')
    const current = (await payload.findByID({ collection: 'salons', id: salon.id, overrideAccess: true, depth: 0 })) as unknown as {
      brand?: Record<string, unknown>
    }
    const brand: Record<string, unknown> = { ...(current.brand ?? {}) }
    if (form.get('primary')) brand.primaryColor = String(form.get('primary'))
    if (logoFile instanceof File && logoFile.size > 0 && logoFile.type.startsWith('image/')) {
      const media = (await payload.create({
        collection: 'media',
        overrideAccess: true,
        data: { alt: `${name} logo`, kind: 'brand', tenant: salon.id } as never,
        file: { data: Buffer.from(await logoFile.arrayBuffer()), mimetype: logoFile.type, name: logoFile.name || 'logo.png', size: logoFile.size },
      })) as unknown as { id: ID }
      brand.logo = media.id
    }
    await payload.update({ collection: 'salons', id: salon.id, overrideAccess: true, data: { brand } as never, depth: 0 })
    if (!isDemo) {
      // Real salons start clean: remove the sample offers/contest history the seeder adds.
      const repo = forTenant(payload, salon.id)
      for (const col of ['offers', 'contest-entries', 'contests', 'appointments'])
        for (const d of (await repo.find<{ id: ID }>(col, { limit: 500 })).docs) await repo.delete(col, d.id)
    }
    await audit(isDemo ? 'demo.created' : 'salon.created', { slug })
    revalidatePath('/console')
    return { ok: true, data: { slug } }
  } catch (err) {
    return fail(err)
  }
}

export async function setSalonField(slug: string, field: 'status' | 'plan' | 'theme', value: string): Promise<Result> {
  try {
    await requirePlatformAdmin()
    const payload = await getPayloadClient()
    const salon = (await payload.find({ collection: 'salons', overrideAccess: true, where: { slug: { equals: slug } }, limit: 1 })).docs[0] as
      | { id: ID }
      | undefined
    if (!salon) return { ok: false, error: 'Salon not found' }
    await payload.update({ collection: 'salons', id: salon.id, overrideAccess: true, data: { [field]: value } as never })
    await audit(`salon.${field}`, { slug, value })
    revalidatePath('/console')
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

export async function toggleFeature(slug: string, feature: string, enabled: boolean): Promise<Result> {
  try {
    await requirePlatformAdmin()
    const payload = await getPayloadClient()
    const salon = (await payload.find({ collection: 'salons', overrideAccess: true, where: { slug: { equals: slug } }, limit: 1 })).docs[0] as unknown as
      | { id: ID; featureOverrides?: { feature: string; enabled: boolean }[] }
      | undefined
    if (!salon) return { ok: false, error: 'Salon not found' }
    const overrides = (salon.featureOverrides ?? []).filter((o) => o.feature !== feature)
    overrides.push({ feature, enabled })
    await payload.update({ collection: 'salons', id: salon.id, overrideAccess: true, data: { featureOverrides: overrides } as never })
    await audit('salon.feature', { slug, feature, enabled })
    revalidatePath(`/console/salons/${slug}`)
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

// ---------------------------------------------------------------------------
// Presenter controls (DEMO.md section 4.2)
// ---------------------------------------------------------------------------

const demoContext = async (slug: string) => {
  await requirePlatformAdmin()
  const payload = await getPayloadClient()
  const salon = (await payload.find({ collection: 'salons', overrideAccess: true, where: { slug: { equals: slug } }, limit: 1 })).docs[0] as unknown as {
    id: ID
    slug: string
    theme?: string
    settings?: Record<string, unknown>
  }
  if (!salon) throw new Error('Salon not found')
  const repo = forTenant(payload, salon.id)
  const phone = String(salon.settings?.demoPhone ?? '')
  const customer = phone
    ? await repo.findOne<{ id: ID; phone: string; referralCode?: string; language?: string }>('customers', { phone: { equals: phone } })
    : null
  return { payload, salon, repo, customer }
}

export async function setDemoPhone(slug: string, phone: string): Promise<Result> {
  try {
    const { payload, salon } = await demoContext(slug)
    const { customer } = await findOrCreateCustomer(payload, salon.id, { phone, name: 'Demo Owner', marketingConsent: true, source: 'instagram' })
    await payload.update({
      collection: 'salons',
      id: salon.id,
      overrideAccess: true,
      data: { settings: { ...(salon.settings ?? {}), demoPhone: customer.phone } } as never,
    })
    revalidatePath(`/console/demo/${slug}`)
    return { ok: true, message: `Demo customer ready: ${customer.phone}` }
  } catch (err) {
    return fail(err)
  }
}

const latestVisit = async (repo: ReturnType<typeof forTenant>, customerId: ID) =>
  (
    await repo.find<{ id: ID; createdAt: string; staff?: ID | { id: ID } | null; lines: { service?: ID | { id: ID } | null }[] }>('visits', {
      where: { customer: { equals: customerId } },
      sort: '-createdAt',
      limit: 1,
    })
  ).docs[0] ?? null

export async function presenter(slug: string, action: string): Promise<Result> {
  try {
    const { payload, salon, repo, customer } = await demoContext(slug)
    const bus = getEventBus()
    const needCustomer = () => {
      if (!customer) throw new Error("Add the owner's phone first, then book from their phone")
      return customer
    }
    switch (action) {
      case 'complete-visit': {
        const c = needCustomer()
        const appt = (
          await repo.find<{ id: ID; services: ID[]; design?: ID | { id: ID; title?: string } | null; staff?: ID | null }>('appointments', {
            where: { and: [{ customer: { equals: c.id } }, { status: { in: ['requested', 'confirmed'] } }] },
            sort: '-createdAt',
            limit: 1,
            depth: 1,
          })
        ).docs[0]
        let serviceIds: ID[] = []
        let designName: string | undefined
        if (appt) {
          serviceIds = (appt.services as unknown as ({ id: ID } | ID)[]).map((s) => idOf(s) as ID)
          designName = typeof appt.design === 'object' ? appt.design?.title : undefined
        } else {
          const svc = await repo.findOne<{ id: ID }>('services', { isAddOn: { equals: false } })
          if (svc) serviceIds = [svc.id]
        }
        const services = await repo.find<{ id: ID; name: string; price: number }>('services', { where: { id: { in: serviceIds } } })
        await completeVisit(payload, salon.id, {
          customerId: c.id,
          appointmentId: appt?.id ?? null,
          staffId: appt?.staff ? asId(idOf(appt.staff)) : null,
          lines: services.docs.map((s) => ({ serviceId: s.id, name: s.name, price: s.price })),
          paymentMode: 'upi',
          designName,
        })
        return { ok: true, message: 'Visit completed: scratch card, points and journey are live.' }
      }
      case 'send-reveal': {
        const c = needCustomer()
        const visit = await latestVisit(repo, c.id)
        if (!visit) throw new Error('Complete a visit first')
        const task = await photoTaskForVisit(payload, salon.id, visit.id)
        const design = await repo.findOne<{ images: ID[]; title: string }>('designs', { featured: { equals: true } })
        if (!design?.images?.[0]) throw new Error('No design photo available')
        await completePhotoTask(payload, salon.id, task.id, { photoIds: [design.images[0]], designName: design.title, artistName: 'Riya' })
        return { ok: true, message: 'Reveal sent with the share kit.' }
      }
      case 'fast-forward': {
        const c = needCustomer()
        const visit = await latestVisit(repo, c.id)
        if (!visit) throw new Error('Complete a visit first')
        // Pretend three weeks have passed: cancel any future booking that would stop the journey, then fire the refill steps.
        const data = { visitId: visit.id, customerId: c.id, visitAt: visit.createdAt, dueDate: new Date().toISOString(), staffId: idOf(visit.staff) }
        await bus.runStep(payload, { tenant: salon.id, module: 'messaging', step: 'refill-heads-up', data })
        await bus.runStep(payload, { tenant: salon.id, module: 'messaging', step: 'aftercare', data })
        return { ok: true, message: 'Three weeks later: the refill reminder is on their phone.' }
      }
      case 'rating-request': {
        const c = needCustomer()
        const visit = await latestVisit(repo, c.id)
        if (!visit) throw new Error('Complete a visit first')
        await bus.runStep(payload, { tenant: salon.id, module: 'messaging', step: 'rating-request', data: { visitId: visit.id, customerId: c.id } })
        return { ok: true, message: 'Rating request sent.' }
      }
      case 'friend-accepts': {
        const c = needCustomer()
        const friendPhone = `+91${7000000000 + Math.floor(Math.random() * 999999999)}`
        const { customer: friend } = await findOrCreateCustomer(payload, salon.id, {
          phone: friendPhone,
          name: 'Ananya (friend)',
          referralCode: c.referralCode ?? undefined,
          marketingConsent: true,
        })
        const svc = await repo.findOne<{ id: ID; name: string; price: number }>('services', { isAddOn: { equals: false } })
        if (!svc) throw new Error('No services')
        const date = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10)
        const { slots } = await getAvailableSlots(payload, salon.id, { date, serviceIds: [svc.id] })
        if (slots[0])
          await requestBooking(payload, salon.id, { customerId: friend.id, serviceIds: [svc.id], start: slots[0].start.toISOString(), source: 'referral' })
        const reward = await repo.findOne<{ id: ID; value: number }>('rewards', {
          and: [{ customer: { equals: friend.id } }, { kind: { equals: 'referral' } }],
        })
        await completeVisit(payload, salon.id, {
          customerId: friend.id,
          lines: [{ serviceId: svc.id, name: svc.name, price: svc.price }],
          rewardId: reward?.id,
          rewardDiscount: reward?.value,
          paymentMode: 'upi',
        })
        return { ok: true, message: 'Ananya opened the gift, booked and visited. Both rewards issued.' }
      }
      case 'low-rating': {
        // A dedicated sample persona, so no real or sample customer gets renamed.
        const { customer: victim } = await findOrCreateCustomer(payload, salon.id, { phone: '+919000000002', name: 'Hetal Desai', source: 'import' })
        const visit = await latestVisit(repo, victim.id)
        await submitRating(payload, salon.id, {
          customerId: victim.id,
          visitId: undefined,
          score: 2,
          comment: visit ? 'One nail lifted after two days.' : 'Waited 20 minutes.',
        })
        return { ok: true, message: "Owner alerted: 'Hetal rated 2 stars, call her'." }
      }
      case 'festival-pack': {
        const pack = (
          await payload.find({
            collection: 'campaign-packs',
            overrideAccess: true,
            sort: 'startsOn',
            limit: 1,
            where: { endsOn: { greater_than: new Date().toISOString() } },
          })
        ).docs[0] as { id: ID } | undefined
        if (!pack) throw new Error('No festival pack')
        const offer = await offerFromPack(payload, salon.id, pack.id)
        await launchOffer(payload, salon.id, offer.id)
        return { ok: true, message: 'Festival pack launched to customers with consent.' }
      }
      case 'switch-theme': {
        const order = ['default', 'luxe', 'minimal']
        const next = order[(order.indexOf(salon.theme ?? 'default') + 1) % order.length]
        await payload.update({ collection: 'salons', id: salon.id, overrideAccess: true, data: { theme: next } as never })
        revalidatePath(`/s/${slug}`, 'layout')
        return { ok: true, message: `Theme switched to ${next}.` }
      }
      case 'switch-language': {
        const c = needCustomer()
        const order = ['en', 'gu', 'hi']
        const next = order[(order.indexOf(c.language ?? 'en') + 1) % order.length]
        await repo.update('customers', c.id, { language: next })
        return { ok: true, message: `Customer language: ${next}. Ask them to refresh.` }
      }
      case 'close-contest': {
        const contest = await repo.findOne<{ id: ID }>('contests', { status: { equals: 'open' } })
        if (!contest) throw new Error('No open contest')
        await closeContest(payload, salon.id, contest.id)
        return { ok: true, message: 'Contest closed and the winner rewarded.' }
      }
      case 'reset': {
        const c = needCustomer()
        // Children first: photo tasks require their visit.
        for (const col of ['photo-tasks', 'ratings', 'messages', 'referrals', 'rewards', 'visits', 'appointments'])
          for (const d of (
            await repo.find<{ id: ID }>(col, { where: col === 'referrals' ? { referrer: { equals: c.id } } : { customer: { equals: c.id } }, limit: 500 })
          ).docs)
            await repo.delete(col, d.id)
        await repo.update('customers', c.id, { visitCount: 0, lifetimeSpend: 0, lastVisitAt: null, nextDueDate: null, segment: 'lead' })
        return { ok: true, message: 'Demo customer reset. Ready for the next demo.' }
      }
      default:
        return { ok: false, error: `Unknown action ${action}` }
    }
  } catch (err) {
    return fail(err)
  } finally {
    revalidatePath(`/console/demo/${slug}`)
  }
}

export async function demoRupees(n: number) {
  return rupees(n)
}

/** Messages the demo customer and the owner received, for the on-screen phone preview. */
export async function demoMessages(slug: string) {
  const { repo, customer } = await demoContext(slug)
  const res = await repo.find<{
    id: ID
    to: string
    body: string
    link?: string
    template: string
    audience?: string
    status: string
    createdAt: string
    customer?: ID | { id: ID } | null
  }>('messages', {
    where: customer ? { or: [{ customer: { equals: customer.id } }, { audience: { equals: 'owner' } }] } : { audience: { equals: 'owner' } },
    sort: '-createdAt',
    limit: 30,
  })
  return res.docs.map((m) => ({ id: m.id, audience: m.audience ?? 'customer', body: m.body, link: m.link, status: m.status, at: m.createdAt }))
}

// ---------------------------------------------------------------------------
// Billing record for a salon (our subscription with them)
// ---------------------------------------------------------------------------

export async function saveSubscription(slug: string, _prev: FormState, f: FormData): Promise<FormState> {
  try {
    await requirePlatformAdmin()
    const payload = await getPayloadClient()
    const salon = (await payload.find({ collection: 'salons', overrideAccess: true, where: { slug: { equals: slug } }, limit: 1, depth: 0 }))
      .docs[0] as unknown as { id: ID; plan: Plan } | undefined
    if (!salon) return { ok: false, error: 'Salon not found' }
    const money = (k: string) => {
      const v = String(f.get(k) ?? '').trim()
      return v === '' ? undefined : rupees(Number(v))
    }
    const status = String(f.get('status') ?? 'pending')
    const next = String(f.get('nextBillingDate') ?? '')
    const addMinutes = Number(f.get('addSupportMinutes') ?? 0) || 0
    const repo = forTenant(payload, salon.id)
    const existing = await repo.findOne<{ id: ID; supportMinutesThisMonth?: number }>('subscriptions', {})
    const data = {
      plan: salon.plan,
      monthlyPrice: money('monthlyPrice') ?? PLAN_PRICES[salon.plan],
      setupFee: money('setupFee') ?? 0,
      status,
      billingCycle: f.get('billingCycle') === 'annual' ? 'annual' : 'monthly',
      foundingCustomer: f.get('foundingCustomer') === 'on',
      nextBillingDate: next ? new Date(`${next}T00:00:00+05:30`).toISOString() : null,
      supportMinutesThisMonth: (existing?.supportMinutesThisMonth ?? 0) + addMinutes,
    }
    if (existing) await repo.update('subscriptions', existing.id, data)
    else await repo.create('subscriptions', data)
    await audit('subscription.saved', { slug, status, monthlyPrice: data.monthlyPrice })
    revalidatePath(`/console/salons/${slug}`)
    return { ok: true, message: 'Billing saved' }
  } catch (err) {
    return fail(err)
  }
}
