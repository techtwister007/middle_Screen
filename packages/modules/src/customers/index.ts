import { defineModule, emit, forTenant, type ID, normalizePhone, shortCode } from '@salon/core'
import type { CollectionConfig, Payload } from 'payload'
import { nobody, salonData } from '../_shared/access'
import { moneyField, phoneField } from '../_shared/fields'
import { nextDueFrom, segmentFor, vipThreshold } from './segments'

export const SEGMENTS = ['lead', 'new', 'regular', 'due', 'at-risk', 'lapsed'] as const

export const Customers: CollectionConfig = {
  slug: 'customers',
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'phone', 'segment', 'visitCount', 'lastVisitAt'] },
  access: salonData,
  indexes: [{ fields: ['tenant', 'phone'], unique: true }],
  fields: [
    { name: 'name', type: 'text' },
    phoneField('phone', { required: true }),
    { name: 'birthday', type: 'date', admin: { date: { pickerAppearance: 'dayOnly' } } },
    { name: 'language', type: 'select', defaultValue: 'en', options: ['en', 'gu', 'hi'] },
    {
      name: 'consents',
      type: 'group',
      fields: [
        { name: 'marketing', type: 'checkbox', defaultValue: false },
        { name: 'marketingAt', type: 'date' },
        { name: 'gallery', type: 'checkbox', defaultValue: false },
        { name: 'contest', type: 'checkbox', defaultValue: false },
        { name: 'source', type: 'text', admin: { description: 'Where consent was given' } },
      ],
    },
    {
      name: 'source',
      type: 'select',
      defaultValue: 'direct',
      options: ['instagram', 'google', 'qr', 'whatsapp', 'referral', 'walk-in', 'contest', 'gift', 'discovery', 'direct', 'import'],
    },
    { name: 'sourceDetail', type: 'text' },
    { name: 'referralCode', type: 'text', index: true, admin: { readOnly: true } },
    { name: 'referredBy', type: 'relationship', relationTo: 'customers' },
    {
      name: 'handProfile',
      type: 'group',
      fields: [
        { name: 'shape', type: 'text' },
        { name: 'length', type: 'text' },
        { name: 'skinTone', type: 'text' },
        { name: 'sensitivities', type: 'textarea' },
      ],
    },
    { name: 'preferredArtist', type: 'relationship', relationTo: 'users' },
    { name: 'notes', type: 'textarea', admin: { description: 'Staff notes, e.g. sensitive cuticles' } },
    { name: 'tags', type: 'text', hasMany: true },
    // Stats maintained by the system
    { name: 'segment', type: 'select', defaultValue: 'lead', index: true, options: [...SEGMENTS], admin: { readOnly: true } },
    { name: 'isVip', type: 'checkbox', defaultValue: false, admin: { readOnly: true } },
    { name: 'visitCount', type: 'number', defaultValue: 0, admin: { readOnly: true } },
    moneyField('lifetimeSpend', { admin: { readOnly: true } }),
    { name: 'lastVisitAt', type: 'date', admin: { readOnly: true } },
    { name: 'nextDueDate', type: 'date', index: true, admin: { readOnly: true } },
    { name: 'pushSubscriptions', type: 'json', admin: { hidden: true } },
  ],
  hooks: {
    beforeChange: [
      ({ data, operation }) => {
        if (operation === 'create' && !data.referralCode) data.referralCode = shortCode(6)
        if (data.consents?.marketing && !data.consents.marketingAt) data.consents.marketingAt = new Date().toISOString()
        return data
      },
    ],
  },
}

export const OtpCodes: CollectionConfig = {
  slug: 'otp-codes',
  admin: { hidden: true },
  access: { read: nobody, create: nobody, update: nobody, delete: nobody },
  fields: [
    { name: 'phone', type: 'text', required: true, index: true },
    { name: 'purpose', type: 'text', defaultValue: 'login' },
    { name: 'codeHash', type: 'text', required: true },
    { name: 'expiresAt', type: 'date', required: true },
    { name: 'attempts', type: 'number', defaultValue: 0 },
    { name: 'consumed', type: 'checkbox', defaultValue: false },
  ],
}

export interface CustomerDoc {
  id: ID
  name?: string | null
  phone: string
  language?: string | null
  segment?: string | null
  isVip?: boolean | null
  visitCount?: number | null
  lifetimeSpend?: number | null
  lastVisitAt?: string | null
  nextDueDate?: string | null
  referralCode?: string | null
  referredBy?: ID | { id: ID } | null
  consents?: { marketing?: boolean | null; gallery?: boolean | null; contest?: boolean | null } | null
  birthday?: string | null
  source?: string | null
}

export interface FindOrCreateInput {
  phone: string
  name?: string
  source?: string
  sourceDetail?: string
  referralCode?: string
  marketingConsent?: boolean
  contestConsent?: boolean
}

/** Finds a customer by phone within a salon, creating them (and emitting customer.registered) if new. */
export const findOrCreateCustomer = async (payload: Payload, tenant: ID, input: FindOrCreateInput): Promise<{ customer: CustomerDoc; created: boolean }> => {
  const phone = normalizePhone(input.phone)
  if (!phone) throw new Error('Invalid phone number')
  const repo = forTenant(payload, tenant)
  const existing = await repo.findOne<CustomerDoc>('customers', { phone: { equals: phone } })
  if (existing) {
    const patch: Record<string, unknown> = {}
    if (input.name && !existing.name) patch.name = input.name
    if (input.marketingConsent && !existing.consents?.marketing)
      patch.consents = { ...(existing.consents ?? {}), marketing: true, source: input.source ?? 'app' }
    if (Object.keys(patch).length) {
      const updated = await repo.update<CustomerDoc>('customers', existing.id, patch)
      return { customer: updated ?? existing, created: false }
    }
    return { customer: existing, created: false }
  }

  let referredBy: ID | undefined
  if (input.referralCode) {
    const referrer = await repo.findOne<CustomerDoc>('customers', { referralCode: { equals: input.referralCode.toUpperCase() } })
    if (referrer && referrer.phone !== phone) referredBy = referrer.id
  }
  const customer = await repo.create<CustomerDoc>('customers', {
    phone,
    name: input.name,
    source: referredBy ? 'referral' : (input.source ?? 'direct'),
    sourceDetail: input.sourceDetail,
    referredBy,
    consents: {
      marketing: Boolean(input.marketingConsent),
      contest: Boolean(input.contestConsent),
      gallery: false,
      source: input.source ?? 'app',
    },
  })
  await emit(payload, {
    tenant,
    type: 'customer.registered',
    payload: { customerId: customer.id, referralCode: referredBy ? input.referralCode : undefined },
    actorType: 'customer',
    actorId: customer.id,
  })
  return { customer, created: true }
}

/** Recomputes segments for one salon. Returns how many customers changed segment. */
export const recomputeSegments = async (payload: Payload, tenant: ID, now = new Date()) => {
  const repo = forTenant(payload, tenant)
  let page = 1
  const all: CustomerDoc[] = []
  for (;;) {
    const res = await repo.find<CustomerDoc>('customers', { limit: 500, page })
    all.push(...res.docs)
    if (!res.hasNextPage) break
    page++
  }
  const threshold = vipThreshold(all.map((c) => c.lifetimeSpend ?? 0))
  let changed = 0
  for (const c of all) {
    const segment = segmentFor({ visitCount: c.visitCount ?? 0, nextDueDate: c.nextDueDate, lastVisitAt: c.lastVisitAt }, now)
    const isVip = (c.lifetimeSpend ?? 0) >= threshold && (c.visitCount ?? 0) >= 2
    if (segment !== c.segment || isVip !== Boolean(c.isVip)) {
      await repo.update('customers', c.id, { segment, isVip })
      if (segment !== c.segment) {
        changed++
        await emit(payload, { tenant, type: 'segment.changed', payload: { customerId: c.id, from: c.segment ?? null, to: segment } })
      }
    }
  }
  return changed
}

export const customersModule = defineModule({
  key: 'customers',
  feature: 'customers',
  collections: [Customers, OtpCodes],
  tenantCollections: ['customers', 'otp-codes'],
  on: {
    'visit.completed': async ({ payload, event }) => {
      const repo = forTenant(payload, event.tenant)
      const customer = await repo.findByID<CustomerDoc>('customers', event.payload.customerId)
      if (!customer) return
      const services = await repo.find<{ id: ID; cycleDays?: number | null }>('services', {
        where: { id: { in: event.payload.serviceIds } },
      })
      const visitAt = new Date(event.occurredAt)
      const nextDue = nextDueFrom(
        visitAt,
        services.docs.map((s) => s.cycleDays ?? 0),
      )
      const visitCount = (customer.visitCount ?? 0) + 1
      const update = {
        visitCount,
        lifetimeSpend: (customer.lifetimeSpend ?? 0) + event.payload.total,
        lastVisitAt: visitAt.toISOString(),
        nextDueDate: nextDue ? nextDue.toISOString() : null,
      }
      const segment = segmentFor({ visitCount, nextDueDate: update.nextDueDate, lastVisitAt: update.lastVisitAt }, visitAt)
      await repo.update('customers', customer.id, { ...update, segment })
    },
  },
  recurring: [
    {
      slug: 'customers-nightly-segments',
      cron: '30 20 * * *', // 02:00 IST
      handler: async ({ payload }) => {
        const salons = await payload.find({ collection: 'salons' as never, limit: 1000, depth: 0, overrideAccess: true })
        for (const s of salons.docs as { id: ID }[]) await recomputeSegments(payload, s.id)
      },
    },
  ],
})

export * from './otp'
export * from './segments'
