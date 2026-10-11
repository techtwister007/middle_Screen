import { defineModule, emit, forTenant, type ID, shortCode } from '@salon/core'
import type { CollectionConfig, Payload } from 'payload'
import { managersOnly, salonConfig, staffOnly } from '../_shared/access'

export const OFFER_KINDS = ['offer', 'slot-filler', 'festival', 'first-visit', 'package-promo'] as const

export const Offers: CollectionConfig = {
  slug: 'offers',
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'kind', 'status', 'endsAt'] },
  access: salonConfig,
  fields: [
    { name: 'title', type: 'text', required: true, admin: { description: 'e.g. 20% off gel this Tuesday 2–5 pm' } },
    { name: 'description', type: 'textarea' },
    { name: 'image', type: 'upload', relationTo: 'media' },
    { name: 'kind', type: 'select', defaultValue: 'offer', options: [...OFFER_KINDS] },
    { name: 'valueType', type: 'select', defaultValue: 'percent', options: ['amount', 'percent', 'freebie'] },
    { name: 'value', type: 'number', defaultValue: 10 },
    { name: 'freebie', type: 'text' },
    { name: 'services', type: 'relationship', relationTo: 'services', hasMany: true },
    { name: 'audience', type: 'select', hasMany: true, options: ['lead', 'new', 'regular', 'due', 'at-risk', 'lapsed'] },
    {
      name: 'slot',
      type: 'group',
      admin: { condition: (_, s) => s?.kind === 'slot-filler' },
      fields: [
        { name: 'date', type: 'text', admin: { description: 'yyyy-MM-dd' } },
        { name: 'from', type: 'text' },
        { name: 'to', type: 'text' },
      ],
    },
    { name: 'pack', type: 'relationship', relationTo: 'campaign-packs' },
    { name: 'code', type: 'text', index: true },
    { name: 'startsAt', type: 'date' },
    { name: 'endsAt', type: 'date' },
    { name: 'status', type: 'select', defaultValue: 'draft', index: true, options: ['draft', 'live', 'ended'] },
    { name: 'showOnHome', type: 'checkbox', defaultValue: true },
    { name: 'claims', type: 'number', defaultValue: 0 },
  ],
}

/** Platform-wide festival packs (Navratri, Diwali, wedding season...). Not salon-specific. */
export const CampaignPacks: CollectionConfig = {
  slug: 'campaign-packs',
  admin: { useAsTitle: 'title' },
  access: {
    read: staffOnly,
    create: ({ req }) => (req.user as { role?: string } | null)?.role === 'platform-admin',
    update: ({ req }) => (req.user as { role?: string } | null)?.role === 'platform-admin',
    delete: ({ req }) => (req.user as { role?: string } | null)?.role === 'platform-admin',
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'festival', type: 'text', required: true, index: true },
    { name: 'startsOn', type: 'date', required: true },
    { name: 'endsOn', type: 'date', required: true },
    { name: 'pitch', type: 'textarea', admin: { description: 'One line shown to owners' } },
    { name: 'offerTitle', type: 'text', required: true },
    { name: 'offerDescription', type: 'textarea' },
    { name: 'valueType', type: 'select', defaultValue: 'percent', options: ['amount', 'percent', 'freebie'] },
    { name: 'value', type: 'number', defaultValue: 10 },
    { name: 'galleryTag', type: 'text', admin: { description: 'Designs with this season tag are featured' } },
    { name: 'frame', type: 'text' },
    { name: 'image', type: 'upload', relationTo: 'media' },
    { name: 'depositRecommended', type: 'checkbox', defaultValue: true },
  ],
}

export const TrackingLinks: CollectionConfig = {
  slug: 'tracking-links',
  admin: { useAsTitle: 'label', defaultColumns: ['label', 'code', 'source', 'clicks'] },
  access: { read: staffOnly, create: managersOnly, update: managersOnly, delete: managersOnly },
  fields: [
    { name: 'label', type: 'text', required: true, admin: { description: 'e.g. Mirror QR, Instagram bio, Window poster' } },
    { name: 'code', type: 'text', required: true, unique: true, index: true },
    { name: 'source', type: 'select', defaultValue: 'qr', options: ['qr', 'instagram', 'whatsapp', 'google', 'poster', 'partner', 'influencer', 'other'] },
    { name: 'target', type: 'text', defaultValue: '/', admin: { description: 'Path inside the salon app, e.g. /designs' } },
    { name: 'clicks', type: 'number', defaultValue: 0 },
  ],
}

interface OfferDoc {
  id: ID
  title: string
  status: string
  endsAt?: string | null
  valueType: 'amount' | 'percent' | 'freebie'
  value: number
  freebie?: string | null
  claims?: number
}

export const launchOffer = async (payload: Payload, tenant: ID, offerId: ID) => {
  const repo = forTenant(payload, tenant)
  const offer = await repo.findByID<OfferDoc>('offers', offerId)
  if (!offer) throw new Error('Offer not found')
  if (offer.status === 'live') return offer
  const updated = await repo.update<OfferDoc>('offers', offerId, { status: 'live', startsAt: new Date().toISOString(), code: shortCode(6) })
  await emit(payload, { tenant, type: 'offer.launched', payload: { offerId }, actorType: 'staff' })
  return updated
}

/** Creates a draft offer for a salon from a platform festival pack. */
export const offerFromPack = async (payload: Payload, tenant: ID, packId: ID) => {
  const pack = (await payload.findByID({ collection: 'campaign-packs' as never, id: packId, depth: 0, overrideAccess: true })) as unknown as {
    id: ID
    offerTitle: string
    offerDescription?: string
    valueType: string
    value: number
    endsOn: string
  }
  return forTenant(payload, tenant).create<OfferDoc>('offers', {
    title: pack.offerTitle,
    description: pack.offerDescription,
    kind: 'festival',
    valueType: pack.valueType,
    value: pack.value,
    pack: pack.id,
    audience: ['new', 'regular', 'due', 'at-risk', 'lapsed'],
    endsAt: pack.endsOn,
    status: 'draft',
  })
}

/** A customer claims an offer; loyalty turns it into a reward on their account. */
export const claimOffer = async (payload: Payload, tenant: ID, offerId: ID, customerId: ID) => {
  const repo = forTenant(payload, tenant)
  const offer = await repo.findByID<OfferDoc>('offers', offerId)
  if (offer?.status !== 'live') throw new Error('This offer is no longer available')
  if (offer.endsAt && new Date(offer.endsAt) < new Date()) throw new Error('This offer has ended')
  const already = await repo.count('rewards', { and: [{ customer: { equals: customerId } }, { source: { equals: `offer:${offerId}` } }] })
  if (already) return offer
  await repo.update('offers', offerId, { claims: (offer.claims ?? 0) + 1 })
  await emit(payload, { tenant, type: 'offer.claimed', payload: { offerId, customerId }, actorType: 'customer', actorId: customerId })
  return offer
}

export const createTrackingLink = async (payload: Payload, tenant: ID, input: { label: string; source: string; target?: string }) =>
  forTenant(payload, tenant).create<{ id: ID; code: string }>('tracking-links', {
    label: input.label,
    source: input.source,
    target: input.target ?? '/',
    code: shortCode(5).toLowerCase(),
    clicks: 0,
  })

/** Resolves a short tracking code, counts the click and returns the salon path to open. */
export const trackClick = async (payload: Payload, tenant: ID, code: string) => {
  const repo = forTenant(payload, tenant)
  const link = await repo.findOne<{ id: ID; code: string; target?: string; clicks?: number; source: string }>('tracking-links', {
    code: { equals: code.toLowerCase() },
  })
  if (!link) return null
  await repo.update('tracking-links', link.id, { clicks: (link.clicks ?? 0) + 1 })
  await emit(payload, { tenant, type: 'link.clicked', payload: { linkId: link.id, code: link.code } })
  return { target: link.target ?? '/', source: link.source }
}

export const campaignsModule = defineModule({
  key: 'campaigns',
  feature: 'campaigns',
  collections: [Offers, CampaignPacks, TrackingLinks],
  tenantCollections: ['offers', 'tracking-links'],
  recurring: [
    {
      slug: 'campaigns-end-offers',
      cron: '15 * * * *',
      handler: async ({ payload }) => {
        const ended = await payload.find({
          collection: 'offers' as never,
          overrideAccess: true,
          depth: 0,
          limit: 1000,
          where: { and: [{ status: { equals: 'live' } }, { endsAt: { less_than: new Date().toISOString() } }] },
        })
        for (const o of ended.docs as { id: ID }[])
          await payload.update({ collection: 'offers' as never, id: o.id, overrideAccess: true, data: { status: 'ended' } as never })
      },
    },
  ],
})
