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
import { createRealSalon, deleteSalonCompletely } from '@/lib/onboarding'
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

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

/** Message the operator can act on; the raw error goes to the server log with a reference. */
const friendly = (err: unknown, what: string) => {
  const ref = Math.random().toString(36).slice(2, 8).toUpperCase()
  console.error(`[${ref}] ${what} failed`, err)
  const msg = err instanceof Error ? err.message : ''
  if (/duplicate|unique/i.test(msg) && /email/i.test(msg)) return 'That owner email already has a login. Use a different email.'
  if (/duplicate|unique/i.test(msg)) return 'Something with that name already exists. Try a different link.'
  return `Could not finish ${what}. Nothing was saved, so you can try again. (ref ${ref})`
}

/**
 * Onboards a salon from the console form. Demos get 90 days of clearly-labelled sample history; real salons get
 * only what was entered. Either way it is all-or-nothing: if any step fails, everything is rolled back.
 */
export async function createSalonFromForm(form: FormData): Promise<Result<{ slug: string; demo: boolean }>> {
  await requirePlatformAdmin()
  const name = String(form.get('name') ?? '').trim()
  const slug = slugify(String(form.get('slug') || name)).slice(0, 40)
  if (!name || !slug) return { ok: false, error: 'Salon name is required' }
  if (['www', 'app', 'api', 'admin', 'studio', 'console'].includes(slug)) return { ok: false, error: `"${slug}" is reserved. Pick another link.` }
  const isDemo = form.get('demo') === 'on'
  const ownerEmail = String(form.get('ownerEmail') || '').trim().toLowerCase()
  const ownerPassword = String(form.get('ownerPassword') || '')
  if (!isDemo && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(ownerEmail)) return { ok: false, error: 'Owner login email is required for a real salon' }
  if (ownerPassword.length < 8) return { ok: false, error: 'Temporary password must be at least 8 characters' }
  const payload = await getPayloadClient()
  const taken = await payload.find({ collection: 'salons', overrideAccess: true, depth: 0, limit: 1, where: { slug: { equals: slug } } })
  if (taken.docs.length) return { ok: false, error: `The link "${slug}" is already used by another salon. Choose a different one.` }
  if (ownerEmail) {
    const user = await payload.find({ collection: 'users', overrideAccess: true, depth: 0, limit: 1, where: { email: { equals: ownerEmail } } })
    if (user.docs.length) return { ok: false, error: 'That owner email already has a login. Use a different email.' }
  }
  const photos = form.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0 && f.type.startsWith('image/'))
  const files = await Promise.all(
    photos.slice(0, 24).map(async (f) => ({
      data: Buffer.from(await f.arrayBuffer()),
      mimetype: f.type,
      title:
        f.name
          .replace(/\.[^.]+$/, '')
          .replace(/^(img|dsc|pxl|whatsapp image)[-_ ]?[\d-_ ]*/i, '')
          .replace(/[-_]+/g, ' ')
          .trim() || 'Our work',
    })),
  )
  const { parsed } = parseMenuText(String(form.get('menu') ?? ''))
  const menu = parsed.map((m) => ({
    name: m.name,
    category: m.category,
    price: m.price,
    minutes: m.minutes,
    isAddOn: m.category === 'add-on',
    cycleDays: ['gel', 'extensions', 'refill', 'nail-art'].includes(m.category) ? 21 : undefined,
  }))
  const artists = String(form.get('artists') || '')
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean)
  const logoFile = form.get('logo')
  const logo = logoFile instanceof File && logoFile.size > 0 && logoFile.type.startsWith('image/')
    ? { data: Buffer.from(await logoFile.arrayBuffer()), mimetype: logoFile.type, name: logoFile.name || 'logo.png' }
    : null
  const theme = (['default', 'luxe', 'minimal'].includes(String(form.get('theme'))) ? String(form.get('theme')) : 'default') as 'default' | 'luxe' | 'minimal'
  const plan = (['starter', 'studio', 'growth'].includes(String(form.get('plan'))) ? String(form.get('plan')) : 'studio') as 'starter' | 'studio' | 'growth'
  const primary = String(form.get('primary') || '')

  let createdId: ID | null = null
  try {
    if (isDemo) {
      const def: SalonSeed = {
        name,
        slug,
        tagline: String(form.get('tagline') || 'Nail art that gets you noticed'),
        about: String(form.get('about') || `${name} in ${form.get('area') || 'Vadodara'}.`),
        theme,
        plan,
        colors: { cover: ['#F6D6DF', '#E8B4C8', '#C77D9E'], logoBg: primary || '#B4537A', logoFg: '#FFFFFF' },
        area: `${form.get('area') || 'Alkapuri'}, ${form.get('city') || 'Vadodara'}`,
        instagram: String(form.get('instagram') || '').replace(/^@/, ''),
        phone: String(form.get('phone') || '+919800000000'),
        artists: (artists.length ? artists : ['Artist One']).map((n, i) => ({ name: n, specialties: [], color: ['#B4537A', '#8E6BBF', '#D98C6C', '#5E8C7A'][i % 4] })),
        services: menu.length ? menu : NAIL_SERVICES,
        designCount: files.length || 12,
        customers: 120,
        ownerEmail: ownerEmail || `owner@${slug}.test`,
        ownerName: String(form.get('ownerName') || 'Owner'),
        seed: Math.floor(Math.random() * 1000) + 100,
        status: 'demo',
      }
      const salon = await seedSalon(payload, def, {
        ownerPassword,
        designImages: files.map((f) => ({ buffer: f.data, mimetype: f.mimetype, title: f.title })),
        onCreated: (id) => {
          createdId = id
        },
      })
      createdId = salon.id
      const current = (await payload.findByID({ collection: 'salons', id: salon.id, overrideAccess: true, depth: 0 })) as unknown as { brand?: Record<string, unknown> }
      const brand: Record<string, unknown> = { ...(current.brand ?? {}) }
      if (primary) brand.primaryColor = primary
      if (logo) {
        const m = (await payload.create({
          collection: 'media',
          overrideAccess: true,
          data: { alt: `${name} logo`, kind: 'brand', tenant: salon.id } as never,
          file: { ...logo, size: logo.data.length },
        })) as unknown as { id: ID }
        brand.logo = m.id
      }
      await payload.update({ collection: 'salons', id: salon.id, overrideAccess: true, data: { brand } as never, depth: 0 })
    } else {
      const hours = DAYS.map((day) => {
        const open = String(form.get(`open_${day}`) || '10:00')
        const close = String(form.get(`close_${day}`) || '20:00')
        return { day, open: TIME.test(open) ? open : '10:00', close: TIME.test(close) ? close : '20:00', closed: form.get(`closed_${day}`) === 'on' }
      })
      const salon = await createRealSalon(payload, {
        name,
        slug,
        plan,
        theme,
        primaryColor: primary || undefined,
        tagline: String(form.get('tagline') || ''),
        about: String(form.get('about') || ''),
        phone: String(form.get('phone') || ''),
        instagram: String(form.get('instagram') || ''),
        address: String(form.get('address') || ''),
        area: String(form.get('area') || ''),
        city: String(form.get('city') || ''),
        hours,
        owner: { name: String(form.get('ownerName') || 'Owner'), email: ownerEmail, password: ownerPassword },
        artists,
        services: menu.length ? menu : NAIL_SERVICES,
        logo,
        photos: files,
        libraryLooks: form.get('libraryLooks') === 'on' ? 8 : 0,
      })
      createdId = salon.id
    }
    await audit(isDemo ? 'demo.created' : 'salon.created', { slug })
    revalidatePath('/console')
    return { ok: true, data: { slug, demo: isDemo } }
  } catch (err) {
    const message = friendly(err, isDemo ? 'the demo' : 'onboarding')
    // All-or-nothing: remove whatever was created so the same link can be used again.
    const leftover =
      createdId ??
      ((await payload.find({ collection: 'salons', overrideAccess: true, depth: 0, limit: 1, where: { slug: { equals: slug } } })).docs[0] as { id: ID } | undefined)?.id
    if (leftover) await deleteSalonCompletely(payload, leftover).catch((e) => console.error('rollback failed', e))
    return { ok: false, error: message }
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
    // No placeholder name: the prospect types their own at the login code step, and every message uses it.
    const { customer } = await findOrCreateCustomer(payload, salon.id, { phone, marketingConsent: true, source: 'instagram' })
    await payload.update({
      collection: 'salons',
      id: salon.id,
      overrideAccess: true,
      data: {
        settings: {
          ...(salon.settings ?? {}),
          demoPhone: customer.phone,
          demoStartedAt: new Date().toISOString(),
          demoOriginalTheme: salon.settings?.demoOriginalTheme ?? salon.theme ?? 'default',
        },
      } as never,
    })
    revalidatePath(`/console/demo/${slug}`)
    return { ok: true, message: `Demo customer ready: ${customer.phone}` }
  } catch (err) {
    return fail(err)
  }
}

const latestVisit = async (repo: ReturnType<typeof forTenant>, customerId: ID) =>
  (
    await repo.find<{
      id: ID
      createdAt: string
      staff?: ID | { id: ID; name?: string } | null
      design?: ID | { id: ID; title?: string; images?: (ID | { id: ID })[] } | null
      designName?: string | null
      lines: { service?: ID | { id: ID } | null }[]
    }>('visits', {
      where: { customer: { equals: customerId } },
      sort: '-createdAt',
      limit: 1,
      depth: 1,
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
          designId: appt && typeof appt.design === 'object' && appt.design ? appt.design.id : null,
        })
        return { ok: true, message: 'Visit completed: scratch card, points and the refill journey are live. They can open chair mode from the QR.' }
      }
      case 'send-reveal': {
        const c = needCustomer()
        const visit = await latestVisit(repo, c.id)
        if (!visit) throw new Error('Complete a visit first')
        const task = await photoTaskForVisit(payload, salon.id, visit.id)
        // The look they actually booked (stand-in for the photo the artist takes), credited to their artist.
        const booked = typeof visit.design === 'object' ? visit.design : null
        const design = booked?.images?.length ? booked : await repo.findOne<{ images: ID[]; title: string }>('designs', { featured: { equals: true } })
        const photo = design?.images?.[0]
        if (!photo) throw new Error('No design photo available')
        const artist = typeof visit.staff === 'object' ? visit.staff?.name?.split(' ')[0] : undefined
        await completePhotoTask(payload, salon.id, task.id, {
          photoIds: [asId(idOf(photo) as ID)],
          designName: visit.designName ?? design?.title,
          artistName: artist,
        })
        return { ok: true, message: 'Reveal sent with the share kit.' }
      }
      case 'fast-forward': {
        const c = needCustomer()
        const visit = await latestVisit(repo, c.id)
        if (!visit) throw new Error('Complete a visit first')
        // Pretend three weeks have passed: cancel any future booking that would stop the journey, then fire the refill steps.
        // The heads-up goes a few days before the refill is due, exactly as it would in real life.
        const dueDate = new Date(Date.now() + 5 * 86_400_000).toISOString()
        const data = { visitId: visit.id, customerId: c.id, visitAt: visit.createdAt, dueDate, staffId: idOf(visit.staff) }
        await bus.runStep(payload, { tenant: salon.id, module: 'messaging', step: 'refill-heads-up', data })
        return { ok: true, message: 'Three weeks later: the refill reminder is on their phone, with a one-tap rebook.' }
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
          name: 'Ananya Patel',
          sourceDetail: 'demo-persona',
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
        const { customer: victim } = await findOrCreateCustomer(payload, salon.id, {
          phone: '+919000000002',
          name: 'Hetal Desai',
          source: 'import',
          sourceDetail: 'demo-persona',
        })
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
        const labels: Record<string, string> = { default: 'Blush', luxe: 'Noir & Gold', minimal: 'Studio White' }
        return { ok: true, message: `Look switched to ${labels[next]}. It updates on their phone within a few seconds.` }
      }
      case 'switch-language': {
        const c = needCustomer()
        const order = ['en', 'gu', 'hi']
        const next = order[(order.indexOf(c.language ?? 'en') + 1) % order.length]
        await repo.update('customers', c.id, { language: next })
        revalidatePath(`/s/${slug}`, 'layout')
        const names: Record<string, string> = { en: 'English', gu: 'Gujarati', hi: 'Hindi' }
        return { ok: true, message: `Their app is now in ${names[next]}. It updates on their phone within a few seconds.` }
      }
      case 'close-contest': {
        const contest = await repo.findOne<{ id: ID }>('contests', { status: { equals: 'open' } })
        if (!contest) throw new Error('No open contest')
        await closeContest(payload, salon.id, contest.id)
        return { ok: true, message: 'Contest closed and the winner rewarded.' }
      }
      case 'reset': {
        const started = String(salon.settings?.demoStartedAt ?? new Date(0).toISOString())
        // 1. The prospect and the sample personas lose everything they did in the meeting.
        const personas = (await repo.find<{ id: ID }>('customers', { where: { sourceDetail: { equals: 'demo-persona' } }, limit: 100 })).docs
        const people = [...(customer ? [customer.id] : []), ...personas.map((p) => p.id)]
        for (const id of people) {
          for (const col of ['photo-tasks', 'ratings', 'contest-votes', 'messages', 'rewards', 'wallet-entries', 'payments', 'visits', 'appointments', 'moodboards'])
            for (const d of (await repo.find<{ id: ID }>(col, { where: { customer: { equals: id } }, limit: 500 }).catch(() => ({ docs: [] as { id: ID }[] })))
              .docs)
              await repo.delete(col, d.id).catch(() => null)
          for (const d of (await repo.find<{ id: ID }>('referrals', { where: { or: [{ referrer: { equals: id } }, { invitee: { equals: id } }] }, limit: 100 })).docs)
            await repo.delete('referrals', d.id)
        }
        for (const p of personas) {
          for (const d of (await repo.find<{ id: ID }>('loyalty-accounts', { where: { customer: { equals: p.id } }, limit: 5 })).docs) await repo.delete('loyalty-accounts', d.id)
          await repo.delete('customers', p.id)
        }
        if (customer) {
          await repo.update('customers', customer.id, { visitCount: 0, lifetimeSpend: 0, lastVisitAt: null, nextDueDate: null, segment: 'lead', language: 'en' })
          for (const a of (await repo.find<{ id: ID }>('loyalty-accounts', { where: { customer: { equals: customer.id } }, limit: 5 })).docs)
            await repo.update('loyalty-accounts', a.id, { stamps: 0, points: 0, tier: 'member' })
        }
        // 2. Offers launched during the demo go; contests closed during the demo reopen.
        for (const o of (await repo.find<{ id: ID }>('offers', { where: { createdAt: { greater_than: started } }, limit: 100 })).docs) await repo.delete('offers', o.id)
        for (const k of (await repo.find<{ id: ID }>('contests', { where: { and: [{ status: { not_equals: 'open' } }, { updatedAt: { greater_than: started } }] }, limit: 10 })).docs)
          await repo.update('contests', k.id, { status: 'open', winner: null, endsAt: new Date(Date.now() + 20 * 86_400_000).toISOString() })
        // 3. The original look.
        await payload.update({
          collection: 'salons',
          id: salon.id,
          overrideAccess: true,
          data: { theme: salon.settings?.demoOriginalTheme ?? salon.theme ?? 'default', settings: { ...(salon.settings ?? {}), demoStartedAt: new Date().toISOString() } } as never,
        })
        revalidatePath(`/s/${slug}`, 'layout')
        return { ok: true, message: 'Demo reset: theme, language, contest, offers and sample people are back to the start.' }
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

// ---------------------------------------------------------------------------
// Design library (shared looks salons copy into their gallery)
// ---------------------------------------------------------------------------

const csvList = (v: FormDataEntryValue | null) =>
  String(v ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)

export async function saveLibraryDesign(_prev: FormState, f: FormData): Promise<FormState> {
  try {
    await requirePlatformAdmin()
    const payload = await getPayloadClient()
    const id = String(f.get('id') ?? '')
    const title = String(f.get('title') ?? '').trim()
    if (!title) return { ok: false, error: 'Give the look a name' }
    const images: ID[] = []
    for (const file of f
      .getAll('images')
      .filter((x): x is File => x instanceof File && x.size > 0)
      .slice(0, 6)) {
      if (!file.type.startsWith('image/')) return { ok: false, error: 'Photos must be images' }
      const media = (await payload.create({
        collection: 'library-media',
        overrideAccess: true,
        data: { alt: title } as never,
        file: { data: Buffer.from(await file.arrayBuffer()), mimetype: file.type, name: file.name || 'look.jpg', size: file.size },
      })) as unknown as { id: ID }
      images.push(media.id)
    }
    const data: Record<string, unknown> = {
      title,
      description: String(f.get('description') ?? '').trim() || null,
      styleNames: csvList(f.get('styleNames')),
      occasions: f.getAll('occasions').map(String),
      seasons: csvList(f.get('seasons')).map((s) => s.toLowerCase()),
      colors: csvList(f.get('colors')).map((s) => s.toLowerCase()),
      shape: String(f.get('shape') ?? '') || null,
      length: String(f.get('length') ?? '') || null,
      suggestedService: String(f.get('suggestedService') ?? '').trim() || null,
      credit: String(f.get('credit') ?? '').trim() || null,
      published: f.get('published') === 'on',
    }
    if (id) {
      const current = (await payload.findByID({ collection: 'library-designs', id: asId(id), overrideAccess: true, depth: 0 })) as unknown as { images?: ID[] }
      data.images = [...(current.images ?? []), ...images]
      await payload.update({ collection: 'library-designs', id: asId(id), overrideAccess: true, data: data as never })
    } else {
      if (!images.length) return { ok: false, error: 'Add at least one photo you have the rights to use' }
      if (!data.credit) return { ok: false, error: 'Say where the photo is from (your own, or its licence)' }
      await payload.create({ collection: 'library-designs', overrideAccess: true, data: { ...data, images } as never })
    }
    await audit(id ? 'library.updated' : 'library.created', { title })
    revalidatePath('/console/library')
    return { ok: true, message: id ? 'Saved' : 'Added to the library' }
  } catch (err) {
    return fail(err)
  }
}

export async function setLibraryDesign(id: ID, action: 'publish' | 'unpublish' | 'delete'): Promise<Result> {
  try {
    await requirePlatformAdmin()
    const payload = await getPayloadClient()
    // Salons keep their copies: deleting from the library never touches a salon's gallery.
    if (action === 'delete') await payload.delete({ collection: 'library-designs', id: asId(id), overrideAccess: true })
    else await payload.update({ collection: 'library-designs', id: asId(id), overrideAccess: true, data: { published: action === 'publish' } as never })
    await audit(`library.${action}`, { id })
    revalidatePath('/console/library')
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

// ---------------------------------------------------------------------------
// Content library: festival packs and care articles shared by every salon
// ---------------------------------------------------------------------------

const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim()

export async function savePack(_prev: FormState, f: FormData): Promise<FormState> {
  try {
    await requirePlatformAdmin()
    const payload = await getPayloadClient()
    const id = str(f, 'id')
    const startsOn = str(f, 'startsOn')
    const endsOn = str(f, 'endsOn')
    if (!str(f, 'title') || !str(f, 'festival') || !str(f, 'offerTitle')) return { ok: false, error: 'Title, festival and offer headline are required' }
    if (!startsOn || !endsOn || endsOn < startsOn) return { ok: false, error: 'Check the dates: the pack must end after it starts' }
    const valueType = ['amount', 'percent', 'freebie'].includes(str(f, 'valueType')) ? str(f, 'valueType') : 'percent'
    const value = Number(str(f, 'value') || 0)
    const data = {
      title: str(f, 'title'),
      festival: str(f, 'festival').toLowerCase(),
      startsOn: new Date(`${startsOn}T00:00:00+05:30`).toISOString(),
      endsOn: new Date(`${endsOn}T23:59:00+05:30`).toISOString(),
      pitch: str(f, 'pitch') || null,
      offerTitle: str(f, 'offerTitle'),
      offerDescription: str(f, 'offerDescription') || null,
      valueType,
      value: valueType === 'amount' ? rupees(value) : value,
      galleryTag: str(f, 'galleryTag').toLowerCase() || null,
    }
    if (id) await payload.update({ collection: 'campaign-packs', id: asId(id), overrideAccess: true, data: data as never })
    else await payload.create({ collection: 'campaign-packs', overrideAccess: true, data: data as never })
    await audit(id ? 'pack.updated' : 'pack.created', { title: data.title })
    revalidatePath('/console/content')
    return { ok: true, message: 'Saved. Salons see it on Today when it is within 30 days.' }
  } catch (err) {
    return fail(err)
  }
}

export async function saveArticle(_prev: FormState, f: FormData): Promise<FormState> {
  try {
    await requirePlatformAdmin()
    const payload = await getPayloadClient()
    const id = str(f, 'id')
    const title = str(f, 'title')
    const body = str(f, 'body')
    if (!title || !body) return { ok: false, error: 'Title and text are required' }
    const language = ['en', 'hi', 'gu'].includes(str(f, 'language')) ? str(f, 'language') : 'en'
    const data = {
      title,
      slug: slugify(str(f, 'slug') || `${title}-${language}`),
      kind: ['aftercare', 'trend', 'guide'].includes(str(f, 'kind')) ? str(f, 'kind') : 'aftercare',
      language,
      summary: str(f, 'summary') || null,
      body,
      serviceCategories: str(f, 'serviceCategories')
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean),
      published: f.get('published') === 'on',
    }
    if (id) await payload.update({ collection: 'articles', id: asId(id), overrideAccess: true, data: data as never })
    else await payload.create({ collection: 'articles', overrideAccess: true, data: data as never })
    await audit(id ? 'article.updated' : 'article.created', { title })
    revalidatePath('/console/content')
    return { ok: true, message: 'Saved' }
  } catch (err) {
    return fail(err)
  }
}

export async function deleteContent(collection: 'campaign-packs' | 'articles', id: ID): Promise<Result> {
  try {
    await requirePlatformAdmin()
    const payload = await getPayloadClient()
    await payload.delete({ collection, id: asId(id), overrideAccess: true })
    await audit(`${collection}.deleted`, { id })
    revalidatePath('/console/content')
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

// ---------------------------------------------------------------------------
// Support tools
// ---------------------------------------------------------------------------

export async function demoLifecycle(slug: string, action: 'extend' | 'keep' | 'go-live' | 'delete'): Promise<Result> {
  try {
    await requirePlatformAdmin()
    const payload = await getPayloadClient()
    const salon = (await payload.find({ collection: 'salons', overrideAccess: true, depth: 0, limit: 1, where: { slug: { equals: slug } } })).docs[0] as unknown as
      | { id: ID; status: string; settings?: Record<string, unknown> }
      | undefined
    if (!salon) return { ok: false, error: 'Salon not found' }
    if (action === 'delete') {
      if (salon.status !== 'demo' && salon.status !== 'suspended') return { ok: false, error: 'Only demos and paused salons can be deleted here' }
      await deleteSalonCompletely(payload, salon.id)
      await audit('salon.deleted', { slug })
      revalidatePath('/console')
      return { ok: true, message: 'Deleted' }
    }
    const settings = { ...(salon.settings ?? {}) }
    let status = salon.status
    if (action === 'extend') {
      const base = Math.max(Date.now(), new Date(String(settings.demoExpiresAt ?? 0)).getTime())
      settings.demoExpiresAt = new Date(base + 7 * 86_400_000).toISOString()
      if (status === 'suspended') status = 'demo'
    }
    if (action === 'keep') settings.keepDemo = true
    if (action === 'go-live') status = 'active'
    await payload.update({ collection: 'salons', id: salon.id, overrideAccess: true, data: { status, settings } as never })
    await audit(`demo.${action}`, { slug })
    revalidatePath(`/console/salons/${slug}`)
    return {
      ok: true,
      message: action === 'go-live' ? 'Live. Remove the sample customers before handing over (Export first if you want to keep them).' : 'Saved',
    }
  } catch (err) {
    return fail(err)
  }
}

/** New temporary password for a salon's owner or staff member; shown once to share over WhatsApp. */
export async function resetStaffPassword(slug: string, userId: ID): Promise<Result<{ secret: string }>> {
  try {
    await requirePlatformAdmin()
    const payload = await getPayloadClient()
    const user = (await payload.findByID({ collection: 'users', id: asId(userId), overrideAccess: true, depth: 0 })) as unknown as {
      email: string
      role: string
      tenants?: { tenant: ID }[]
    }
    const salon = (await payload.find({ collection: 'salons', overrideAccess: true, depth: 0, limit: 1, where: { slug: { equals: slug } } })).docs[0] as { id: ID } | undefined
    if (!salon || user.role === 'platform-admin' || !user.tenants?.some((t) => String(t.tenant) === String(salon.id))) return { ok: false, error: 'Not a member of this salon' }
    const password = Array.from(crypto.getRandomValues(new Uint8Array(9)), (b) => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join('')
    await payload.update({ collection: 'users', id: asId(userId), overrideAccess: true, data: { password, loginAttempts: 0, lockUntil: null } as never })
    await audit('staff.password_reset', { slug, user: userId })
    return { ok: true, data: { secret: `${user.email} / ${password}` } }
  } catch (err) {
    return fail(err)
  }
}
