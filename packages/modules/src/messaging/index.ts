import {
  addDays,
  DAY_MS,
  defineModule,
  emit,
  formatINR,
  formatIST,
  forTenant,
  HOUR_MS,
  type ID,
  idOf,
  localDate,
  salonLink,
  schedule,
  studioLink,
  zonedDateTime,
} from '@salon/core'
import { clickToChat, getMessaging } from '@salon/integrations'
import type { CollectionConfig, Payload } from 'payload'
import { managersOnly, salonConfig, salonData } from '../_shared/access'
import { moneyField } from '../_shared/fields'
import { refillJourney, shouldSend } from './policy'
import { type Lang, render, TEMPLATES, type TemplateKey } from './templates'

export const MessageTemplates: CollectionConfig = {
  slug: 'message-templates',
  admin: { useAsTitle: 'key' },
  access: salonConfig,
  fields: [
    { name: 'key', type: 'select', required: true, options: Object.keys(TEMPLATES) },
    { name: 'language', type: 'select', required: true, defaultValue: 'en', options: ['en', 'hi', 'gu'] },
    { name: 'text', type: 'textarea', required: true },
    { name: 'providerTemplateId', type: 'text' },
    { name: 'approval', type: 'select', defaultValue: 'draft', options: ['draft', 'submitted', 'approved', 'rejected'] },
  ],
}

export const Messages: CollectionConfig = {
  slug: 'messages',
  admin: { defaultColumns: ['createdAt', 'template', 'to', 'status', 'cost'] },
  access: { read: salonData.read, create: managersOnly, update: () => false, delete: () => false },
  fields: [
    { name: 'customer', type: 'relationship', relationTo: 'customers', index: true },
    { name: 'to', type: 'text', required: true },
    { name: 'audience', type: 'select', options: ['customer', 'owner'], defaultValue: 'customer' },
    { name: 'template', type: 'text', required: true, index: true },
    { name: 'category', type: 'select', options: ['utility', 'marketing', 'authentication', 'service'], index: true },
    { name: 'language', type: 'text' },
    { name: 'body', type: 'textarea' },
    { name: 'link', type: 'text' },
    { name: 'status', type: 'select', options: ['sent', 'queued', 'failed', 'skipped'], index: true },
    { name: 'skipReason', type: 'text' },
    { name: 'provider', type: 'text' },
    { name: 'providerId', type: 'text' },
    moneyField('cost'),
    { name: 'relatedEvent', type: 'text' },
  ],
}

interface SalonDoc {
  id: ID
  name: string
  slug: string
  timezone?: string | null
  contact?: { phone?: string | null; whatsapp?: string | null } | null
  whatsappSender?: string | null
  settings?: Record<string, number | string | boolean | null | undefined> | null
}

interface CustomerDoc {
  id: ID
  name?: string | null
  phone: string
  language?: string | null
  consents?: { marketing?: boolean | null } | null
  lastVisitAt?: string | null
  preferredArtist?: ID | { id: ID } | null
}

const getSalon = async (payload: Payload, tenant: ID) =>
  (await payload.findByID({ collection: 'salons' as never, id: tenant, depth: 0, overrideAccess: true })) as unknown as SalonDoc

const setting = (salon: SalonDoc, key: string, fallback: number) => {
  const v = salon.settings?.[key]
  return typeof v === 'number' ? v : fallback
}

const firstName = (name?: string | null) => (name ? name.split(' ')[0] : 'there')

const templateText = async (payload: Payload, tenant: ID, key: TemplateKey, lang: Lang) => {
  const override = await forTenant(payload, tenant).findOne<{ text: string }>('message-templates', {
    and: [{ key: { equals: key } }, { language: { equals: lang } }],
  })
  if (override?.text) return override.text
  const def = TEMPLATES[key]
  return def.text[lang] ?? def.text.en
}

export interface SendInput {
  template: TemplateKey
  vars?: Record<string, string | number | undefined | null>
  link?: string
  relatedEvent?: string
  imageUrl?: string
}

const recordCost = async (payload: Payload, tenant: ID, category: string, cost: number, reference: string) => {
  if (!cost) return
  const kind = category === 'marketing' ? 'whatsapp-marketing' : category === 'authentication' ? 'whatsapp-auth' : 'whatsapp-utility'
  await forTenant(payload, tenant).create('cost-ledger', {
    kind,
    units: 1,
    unitCost: cost,
    total: cost,
    period: new Date().toISOString().slice(0, 7),
    reference,
  })
}

/** Sends a template to a customer, applying consent and frequency caps. Logs every attempt. */
export const sendToCustomer = async (payload: Payload, tenant: ID, customerId: ID, input: SendInput) => {
  const repo = forTenant(payload, tenant)
  const [salon, customer] = await Promise.all([getSalon(payload, tenant), repo.findByID<CustomerDoc>('customers', customerId)])
  if (!customer) return null
  const def = TEMPLATES[input.template]
  const lang = (['en', 'hi', 'gu'].includes(customer.language ?? '') ? customer.language : 'en') as Lang
  const promoHistory =
    def.category === 'marketing'
      ? (
          await repo.find<{ createdAt: string }>('messages', {
            where: {
              and: [
                { customer: { equals: customerId } },
                { category: { equals: 'marketing' } },
                { status: { equals: 'sent' } },
                { createdAt: { greater_than: new Date(Date.now() - 31 * DAY_MS).toISOString() } },
              ],
            },
          })
        ).docs.map((m) => new Date(m.createdAt))
      : []
  const skip = shouldSend({
    category: def.category,
    marketingConsent: Boolean(customer.consents?.marketing),
    promoHistory,
    now: new Date(),
    policy: { perWeek: setting(salon, 'promoPerWeek', 1), perMonth: setting(salon, 'promoPerMonth', 3) },
    phone: customer.phone,
  })
  const vars = { name: firstName(customer.name), salon: salon.name, link: input.link, ...input.vars }
  const body = render(await templateText(payload, tenant, input.template, lang), vars)
  if (skip) {
    return repo.create('messages', {
      customer: customerId,
      to: customer.phone,
      template: input.template,
      category: def.category,
      language: lang,
      body,
      link: input.link,
      status: 'skipped',
      skipReason: skip,
      relatedEvent: input.relatedEvent,
    })
  }
  const result = await getMessaging().send({
    to: customer.phone,
    template: input.template,
    category: def.category,
    language: lang,
    body,
    variables: Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, v == null ? '' : String(v)])),
    buttonUrl: input.link,
    imageUrl: input.imageUrl,
    from: salon.whatsappSender ?? undefined,
  })
  const message = await repo.create<{ id: ID }>('messages', {
    customer: customerId,
    to: customer.phone,
    template: input.template,
    category: def.category,
    language: lang,
    body,
    link: input.link,
    status: result.status === 'failed' ? 'failed' : 'sent',
    skipReason: result.error,
    provider: getMessaging().name,
    providerId: result.providerId,
    cost: result.cost,
    relatedEvent: input.relatedEvent,
  })
  if (result.status === 'failed') {
    await emit(payload, { tenant, type: 'message.failed', payload: { messageId: message.id, reason: result.error ?? 'unknown' } })
  } else {
    await recordCost(payload, tenant, def.category, result.cost, `message:${message.id}`)
    await emit(payload, { tenant, type: 'message.sent', payload: { messageId: message.id, category: def.category, cost: result.cost } })
  }
  return message
}

/** Sends a template to the salon owner's WhatsApp. */
export const sendToOwner = async (payload: Payload, tenant: ID, input: SendInput) => {
  const salon = await getSalon(payload, tenant)
  const to = salon.contact?.whatsapp ?? salon.contact?.phone
  if (!to) return null
  const body = render(TEMPLATES[input.template].text.en, { salon: salon.name, link: input.link, ...input.vars })
  const result = await getMessaging().send({
    to,
    template: input.template,
    category: 'utility',
    language: 'en',
    body,
    buttonUrl: input.link,
  })
  await recordCost(payload, tenant, 'utility', result.cost, `owner:${input.template}`)
  return forTenant(payload, tenant).create('messages', {
    to,
    audience: 'owner',
    template: input.template,
    category: 'utility',
    language: 'en',
    body,
    link: input.link,
    status: result.status === 'failed' ? 'failed' : 'sent',
    provider: getMessaging().name,
    providerId: result.providerId,
    cost: result.cost,
  })
}

/** Delivers a login code. Falls back to nothing in dev (code is also logged). */
export const sendOtp = async (payload: Payload, tenant: ID, phone: string, code: string) => {
  const salon = await getSalon(payload, tenant)
  const body = render(TEMPLATES.otp.text.en, { code, salon: salon.name })
  if (process.env.NODE_ENV !== 'production') console.info(`[otp] ${phone}: ${code}`)
  const result = await getMessaging().send({ to: phone, template: 'otp', category: 'authentication', language: 'en', body, variables: { code } })
  await recordCost(payload, tenant, 'authentication', result.cost, 'otp')
  return result
}

/** A one-tap prefilled WhatsApp link staff can use when the API is unavailable. */
export const manualMessageLink = async (payload: Payload, tenant: ID, customerId: ID, input: SendInput) => {
  const repo = forTenant(payload, tenant)
  const [salon, customer] = await Promise.all([getSalon(payload, tenant), repo.findByID<CustomerDoc>('customers', customerId)])
  if (!customer) return null
  const lang = (customer.language ?? 'en') as Lang
  const body = render(await templateText(payload, tenant, input.template, lang), {
    name: firstName(customer.name),
    salon: salon.name,
    link: input.link,
    ...input.vars,
  })
  return clickToChat(customer.phone, body)
}

// ---------------------------------------------------------------------------
// Journey helpers
// ---------------------------------------------------------------------------

const fmtDate = (salon: SalonDoc, iso: string) => formatIST(iso, 'EEE d MMM', salon.timezone ?? 'Asia/Kolkata')
const fmtTime = (salon: SalonDoc, iso: string) => formatIST(iso, 'h:mm a', salon.timezone ?? 'Asia/Kolkata')

const artistName = async (payload: Payload, staffId: ID | null | undefined) => {
  if (!staffId) return 'our team'
  try {
    const u = (await payload.findByID({ collection: 'users' as never, id: staffId, depth: 0, overrideAccess: true })) as { name?: string }
    return u.name?.split(' ')[0] ?? 'our team'
  } catch {
    return 'our team'
  }
}

interface ApptDoc {
  id: ID
  customer: ID | { id: ID }
  staff?: ID | { id: ID } | null
  start: string
  status: string
}

/** True when the customer has an upcoming booking or visited after `since`. Used to stop journeys. */
const hasMovedOn = async (payload: Payload, tenant: ID, customerId: ID, since: string) => {
  const repo = forTenant(payload, tenant)
  const upcoming = await repo.count('appointments', {
    and: [{ customer: { equals: customerId } }, { status: { in: ['requested', 'confirmed'] } }, { start: { greater_than: new Date().toISOString() } }],
  })
  if (upcoming > 0) return true
  const newer = await repo.count('visits', { and: [{ customer: { equals: customerId } }, { createdAt: { greater_than: since } }] })
  return newer > 0
}

const activeRewardText = async (payload: Payload, tenant: ID, customerId: ID) => {
  const reward = await forTenant(payload, tenant).findOne<{ title?: string; validTo?: string }>('rewards', {
    and: [{ customer: { equals: customerId } }, { status: { equals: 'active' } }],
  })
  return reward?.title ? `Your ${reward.title} is waiting.` : ''
}

export const messagingModule = defineModule({
  key: 'messaging',
  feature: 'messaging',
  collections: [MessageTemplates, Messages],
  tenantCollections: ['message-templates', 'messages'],
  on: {
    'booking.requested': async ({ payload, event }) => {
      const repo = forTenant(payload, event.tenant)
      const [salon, appt, customer] = await Promise.all([
        getSalon(payload, event.tenant),
        repo.findByID<ApptDoc>('appointments', event.payload.appointmentId),
        repo.findByID<CustomerDoc>('customers', event.payload.customerId),
      ])
      if (appt?.status !== 'requested') return
      const vars = { date: fmtDate(salon, appt.start), time: fmtTime(salon, appt.start) }
      await sendToCustomer(payload, event.tenant, event.payload.customerId, {
        template: 'booking_received',
        vars,
        link: salonLink(salon.slug, `/appointments/${appt.id}`),
        relatedEvent: String(event.id),
      })
      await sendToOwner(payload, event.tenant, {
        template: 'owner_new_booking',
        vars: { ...vars, name: customer?.name ?? customer?.phone },
        link: studioLink(salon.slug, `/today`),
      })
    },
    'booking.confirmed': async ({ payload, event }) => {
      const repo = forTenant(payload, event.tenant)
      const salon = await getSalon(payload, event.tenant)
      const appt = await repo.findByID<ApptDoc>('appointments', event.payload.appointmentId)
      if (!appt) return
      await sendToCustomer(payload, event.tenant, event.payload.customerId, {
        template: 'booking_confirmed',
        vars: { date: fmtDate(salon, appt.start), time: fmtTime(salon, appt.start), artist: await artistName(payload, idOf(appt.staff)) },
        link: salonLink(salon.slug, `/appointments/${appt.id}`),
        relatedEvent: String(event.id),
      })
      const start = new Date(appt.start).getTime()
      for (const hoursBefore of [24, 3]) {
        const runAt = new Date(start - hoursBefore * HOUR_MS)
        if (runAt.getTime() > Date.now())
          await schedule(payload, {
            tenant: event.tenant,
            module: 'messaging',
            step: 'appointment-reminder',
            runAt,
            data: { appointmentId: appt.id, start: appt.start },
          })
      }
    },
    'booking.rescheduled': async ({ payload, event }) => {
      const salon = await getSalon(payload, event.tenant)
      const appt = await forTenant(payload, event.tenant).findByID<ApptDoc>('appointments', event.payload.appointmentId)
      if (!appt) return
      await sendToCustomer(payload, event.tenant, event.payload.customerId, {
        template: 'booking_confirmed',
        vars: { date: fmtDate(salon, appt.start), time: fmtTime(salon, appt.start), artist: await artistName(payload, idOf(appt.staff)) },
        link: salonLink(salon.slug, `/appointments/${appt.id}`),
      })
      const runAt = new Date(new Date(appt.start).getTime() - 24 * HOUR_MS)
      if (runAt.getTime() > Date.now())
        await schedule(payload, {
          tenant: event.tenant,
          module: 'messaging',
          step: 'appointment-reminder',
          runAt,
          data: { appointmentId: appt.id, start: appt.start },
        })
    },
    'booking.cancelled': async ({ payload, event }) => {
      if (event.actorType === 'customer') return
      const salon = await getSalon(payload, event.tenant)
      await sendToCustomer(payload, event.tenant, event.payload.customerId, {
        template: 'booking_cancelled',
        vars: { date: fmtDate(salon, event.payload.start) },
        link: salonLink(salon.slug, '/book'),
      })
    },
    'waitlist.offered': async ({ payload, event }) => {
      const salon = await getSalon(payload, event.tenant)
      await sendToCustomer(payload, event.tenant, event.payload.customerId, {
        template: 'waitlist_offer',
        vars: { date: fmtDate(salon, event.payload.start), time: fmtTime(salon, event.payload.start) },
        link: salonLink(salon.slug, `/book?start=${encodeURIComponent(event.payload.start)}`),
      })
    },
    'visit.completed': async ({ payload, event }) => {
      const salon = await getSalon(payload, event.tenant)
      const visitAt = new Date(event.occurredAt)
      const base = { tenant: event.tenant, module: 'messaging' }
      const data = { visitId: event.payload.visitId, customerId: event.payload.customerId, visitAt: visitAt.toISOString() }
      await schedule(payload, {
        ...base,
        step: 'rating-request',
        runAt: new Date(visitAt.getTime() + setting(salon, 'reviewDelayHours', 2) * HOUR_MS),
        data,
      })
      await schedule(payload, { ...base, step: 'aftercare', runAt: addDays(visitAt, setting(salon, 'aftercareDays', 3)), data })
      const services = await forTenant(payload, event.tenant).find<{ cycleDays?: number | null }>('services', {
        where: { id: { in: event.payload.serviceIds } },
      })
      const cycles = services.docs.map((s) => s.cycleDays ?? 0).filter((d) => d > 0)
      if (cycles.length === 0) return
      const journey = refillJourney(Math.min(...cycles), {
        refillHeadsUpDays: setting(salon, 'refillHeadsUpDays', 5),
        nudgeDays: setting(salon, 'nudgeDays', 15),
        winbackDays: setting(salon, 'winbackDays', 30),
        lastChanceDays: setting(salon, 'lastChanceDays', 60),
      })
      for (const j of journey) {
        await schedule(payload, {
          ...base,
          step: j.step,
          runAt: addDays(visitAt, j.offsetDays),
          data: { ...data, dueDate: addDays(visitAt, Math.min(...cycles)).toISOString(), staffId: event.payload.staffId ?? null },
        })
      }
    },
    'photo.ready': async ({ payload, event }) => {
      const salon = await getSalon(payload, event.tenant)
      const task = await forTenant(payload, event.tenant).findByID<{ designName?: string }>('photo-tasks', event.payload.photoTaskId)
      await sendToCustomer(payload, event.tenant, event.payload.customerId, {
        template: 'nails_ready',
        vars: { design: task?.designName ?? 'nail' },
        link: salonLink(salon.slug, `/reveal/${event.payload.photoTaskId}`),
      })
    },
    'rating.submitted': async ({ payload, event }) => {
      const salon = (await getSalon(payload, event.tenant)) as SalonDoc & { contact?: { googlePlaceId?: string | null } }
      const reviewUrl =
        (salon.settings?.googleReviewUrl as string | undefined) ||
        (salon.contact?.googlePlaceId ? `https://search.google.com/local/writereview?placeid=${salon.contact.googlePlaceId}` : null)
      // Everyone gets the Google review link: no review gating, and never a reward for a review.
      if (reviewUrl) await sendToCustomer(payload, event.tenant, event.payload.customerId, { template: 'thanks_review', link: reviewUrl })
      if (event.payload.score <= 3) {
        const customer = await forTenant(payload, event.tenant).findByID<CustomerDoc>('customers', event.payload.customerId)
        await sendToOwner(payload, event.tenant, {
          template: 'owner_low_rating',
          vars: { name: customer?.name ?? customer?.phone, score: event.payload.score },
          link: studioLink(salon.slug, `/customers/${event.payload.customerId}`),
        })
      }
    },
    'reward.issued': async ({ payload, event }) => {
      const salon = await getSalon(payload, event.tenant)
      const reward = await forTenant(payload, event.tenant).findByID<{ title?: string; validTo?: string; scratch?: boolean }>('rewards', event.payload.rewardId)
      if (!reward || reward.scratch) return
      await sendToCustomer(payload, event.tenant, event.payload.customerId, {
        template: 'reward_issued',
        vars: { reward: reward.title, expiry: reward.validTo ? fmtDate(salon, reward.validTo) : 'soon' },
        link: salonLink(salon.slug, '/rewards'),
      })
    },
    'referral.converted': async ({ payload, event }) => {
      const salon = await getSalon(payload, event.tenant)
      await sendToCustomer(payload, event.tenant, event.payload.referrerId, {
        template: 'referral_converted',
        link: salonLink(salon.slug, '/invite'),
      })
    },
    'gift.sent': async ({ payload, event }) => {
      const repo = forTenant(payload, event.tenant)
      const salon = await getSalon(payload, event.tenant)
      const card = await repo.findByID<{ id: ID; code: string; value: number; recipientPhone: string; recipientName?: string }>(
        'gift-cards',
        event.payload.giftCardId,
      )
      if (!card) return
      // The recipient may not be a customer yet: create a lead so the message is logged against them.
      let recipient = await repo.findOne<CustomerDoc>('customers', { phone: { equals: card.recipientPhone } })
      if (!recipient)
        recipient = await repo.create<CustomerDoc>('customers', {
          phone: card.recipientPhone,
          name: card.recipientName,
          source: 'gift',
        })
      await sendToCustomer(payload, event.tenant, recipient.id, {
        template: 'gift_received',
        vars: { amount: formatINR(card.value) },
        link: salonLink(salon.slug, `/gift/${card.code}`),
      })
    },
    'offer.launched': async ({ payload, event }) => {
      const repo = forTenant(payload, event.tenant)
      const salon = await getSalon(payload, event.tenant)
      const offer = await repo.findByID<{ id: ID; title: string; audience?: string[]; status: string; code?: string }>('offers', event.payload.offerId)
      if (!offer) return
      const segments = offer.audience?.length ? offer.audience : ['due', 'at-risk', 'regular']
      const audience = await repo.find<CustomerDoc & { segment?: string }>('customers', {
        where: { and: [{ segment: { in: segments } }, { 'consents.marketing': { equals: true } }] },
        limit: 2000,
      })
      for (const c of audience.docs) {
        await sendToCustomer(payload, event.tenant, c.id, {
          template: 'offer',
          vars: { reward: offer.title },
          link: salonLink(salon.slug, `/offers/${offer.id}`),
          relatedEvent: `offer:${offer.id}`,
        })
      }
    },
  },
  steps: {
    'appointment-reminder': async ({ payload, tenant, data }) => {
      const repo = forTenant(payload, tenant)
      const appt = await repo.findByID<ApptDoc>('appointments', data.appointmentId as ID)
      // Skip when cancelled or rescheduled since this reminder was scheduled.
      if (appt?.status !== 'confirmed' || appt.start !== data.start) return
      const salon = await getSalon(payload, tenant)
      await sendToCustomer(payload, tenant, idOf(appt.customer) as ID, {
        template: 'booking_reminder',
        vars: { date: fmtDate(salon, appt.start), time: fmtTime(salon, appt.start) },
        link: salonLink(salon.slug, `/appointments/${appt.id}`),
      })
    },
    'rating-request': async ({ payload, tenant, data }) => {
      const salon = await getSalon(payload, tenant)
      const already = await forTenant(payload, tenant).count('ratings', { visit: { equals: data.visitId as ID } })
      if (already) return
      await sendToCustomer(payload, tenant, data.customerId as ID, {
        template: 'rating_request',
        link: salonLink(salon.slug, `/rate/${data.visitId}`),
      })
    },
    aftercare: async ({ payload, tenant, data }) => {
      const salon = await getSalon(payload, tenant)
      await sendToCustomer(payload, tenant, data.customerId as ID, { template: 'aftercare', link: salonLink(salon.slug, '/care') })
    },
    'refill-heads-up': async ({ payload, tenant, data }) => {
      if (await hasMovedOn(payload, tenant, data.customerId as ID, data.visitAt as string)) return
      const salon = await getSalon(payload, tenant)
      await sendToCustomer(payload, tenant, data.customerId as ID, {
        template: 'refill_heads_up',
        vars: { date: fmtDate(salon, data.dueDate as string), artist: await artistName(payload, data.staffId as ID) },
        link: salonLink(salon.slug, `/book?repeat=${data.visitId}`),
      })
    },
    'refill-due': async ({ payload, tenant, data }) => {
      if (await hasMovedOn(payload, tenant, data.customerId as ID, data.visitAt as string)) return
      const salon = await getSalon(payload, tenant)
      await sendToCustomer(payload, tenant, data.customerId as ID, {
        template: 'refill_due',
        vars: { reward: await activeRewardText(payload, tenant, data.customerId as ID) },
        link: salonLink(salon.slug, `/book?repeat=${data.visitId}`),
      })
    },
    nudge: async ({ payload, tenant, data }) => {
      if (await hasMovedOn(payload, tenant, data.customerId as ID, data.visitAt as string)) return
      const salon = await getSalon(payload, tenant)
      await sendToCustomer(payload, tenant, data.customerId as ID, { template: 'nudge_new_designs', link: salonLink(salon.slug, '/designs?new=1') })
    },
    winback: async ({ payload, tenant, data }) => {
      if (await hasMovedOn(payload, tenant, data.customerId as ID, data.visitAt as string)) return
      const salon = await getSalon(payload, tenant)
      await sendToCustomer(payload, tenant, data.customerId as ID, {
        template: 'winback',
        vars: { artist: await artistName(payload, data.staffId as ID), reward: await activeRewardText(payload, tenant, data.customerId as ID) },
        link: salonLink(salon.slug, `/book?repeat=${data.visitId}`),
      })
    },
    'last-chance': async ({ payload, tenant, data }) => {
      if (await hasMovedOn(payload, tenant, data.customerId as ID, data.visitAt as string)) return
      const salon = await getSalon(payload, tenant)
      await sendToCustomer(payload, tenant, data.customerId as ID, { template: 'last_chance_survey', link: salonLink(salon.slug, '/feedback') })
    },
  },
  recurring: [
    {
      slug: 'messaging-owner-daily-summary',
      cron: '0 * * * *',
      handler: async ({ payload }) => {
        const salons = await payload.find({ collection: 'salons' as never, limit: 1000, depth: 0, overrideAccess: true })
        for (const s of salons.docs as unknown as SalonDoc[]) {
          const tz = s.timezone ?? 'Asia/Kolkata'
          const hour = Number(formatIST(new Date(), 'H', tz))
          if (hour !== setting(s, 'dailySummaryHour', 9)) continue
          const summary = await ownerSummaryText(payload, s.id)
          await sendToOwner(payload, s.id, { template: 'owner_daily_summary', vars: { summary }, link: studioLink(s.slug, '/today') })
        }
      },
    },
  ],
})

/** "Yesterday: 9 visits, ₹14,200. 6 due for a refill today, 3 at risk." */
export const ownerSummaryText = async (payload: Payload, tenant: ID, now = new Date()) => {
  const repo = forTenant(payload, tenant)
  const salon = await getSalon(payload, tenant)
  const tz = salon.timezone ?? 'Asia/Kolkata'
  const todayStart = zonedDateTime(localDate(now, tz), '00:00', tz)
  const yStart = new Date(todayStart.getTime() - DAY_MS)
  const visits = await repo.find<{ total: number }>('visits', {
    where: { and: [{ createdAt: { greater_than_equal: yStart.toISOString() } }, { createdAt: { less_than: todayStart.toISOString() } }] },
    limit: 1000,
  })
  const revenue = visits.docs.reduce((n, v) => n + (v.total ?? 0), 0)
  const due = await repo.count('customers', { segment: { equals: 'due' } })
  const atRisk = await repo.count('customers', { segment: { equals: 'at-risk' } })
  const today = await repo.count('appointments', {
    and: [
      { start: { greater_than_equal: todayStart.toISOString() } },
      { start: { less_than: new Date(todayStart.getTime() + DAY_MS).toISOString() } },
      { status: { in: ['requested', 'confirmed'] } },
    ],
  })
  return `Yesterday: ${visits.docs.length} visits, ${formatINR(revenue)}. Today: ${today} appointments, ${due} customers due for a refill, ${atRisk} at risk.`
}

export * from './policy'
export * from './templates'
