import { asId, defineModule, forTenant, type ID, idOf } from '@salon/core'
import type { CollectionConfig, Payload } from 'payload'
import { salonData } from '../_shared/access'
import { moneyField } from '../_shared/fields'

export const OCCASIONS = ['everyday', 'office', 'party', 'wedding', 'garba', 'festive', 'vacation', 'date-night'] as const
export const SHAPES = ['almond', 'coffin', 'square', 'oval', 'stiletto', 'round', 'squoval'] as const
export const LENGTHS = ['short', 'medium', 'long', 'extra-long'] as const

export const Designs: CollectionConfig = {
  slug: 'designs',
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'category', 'priceFrom', 'published', 'featured'] },
  access: salonData,
  versions: { maxPerDoc: 10 },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'images', type: 'upload', relationTo: 'media', hasMany: true, required: true, minRows: 1 },
    { name: 'description', type: 'textarea' },
    {
      type: 'row',
      fields: [
        {
          name: 'category',
          type: 'select',
          defaultValue: 'nail-art',
          options: ['nail-art', 'french', 'chrome', 'cat-eye', 'ombre', 'minimal', 'bridal', 'glitter', 'solid', '3d'],
        },
        { name: 'shape', type: 'select', options: [...SHAPES] },
        { name: 'length', type: 'select', options: [...LENGTHS] },
      ],
    },
    { name: 'occasions', type: 'select', hasMany: true, options: [...OCCASIONS] },
    { name: 'seasons', type: 'text', hasMany: true, admin: { description: 'e.g. navratri, diwali, wedding, summer' } },
    { name: 'colors', type: 'text', hasMany: true },
    { name: 'service', type: 'relationship', relationTo: 'services', admin: { description: 'Main service used for this design' } },
    { name: 'addOns', type: 'relationship', relationTo: 'services', hasMany: true },
    moneyField('priceFrom'),
    { name: 'durationMinutes', type: 'number' },
    { name: 'artist', type: 'relationship', relationTo: 'users' },
    { name: 'source', type: 'select', defaultValue: 'staff', options: ['staff', 'customer'] },
    { name: 'customer', type: 'relationship', relationTo: 'customers', admin: { condition: (_, s) => s?.source === 'customer' } },
    { name: 'customerConsent', type: 'checkbox', defaultValue: false },
    { name: 'featured', type: 'checkbox', defaultValue: false },
    { name: 'published', type: 'checkbox', defaultValue: true, index: true },
    { name: 'likes', type: 'number', defaultValue: 0 },
  ],
  hooks: {
    beforeChange: [
      ({ data }) => {
        // A customer's photo is never published without their consent.
        if (data?.source === 'customer' && !data.customerConsent) data.published = false
        return data
      },
    ],
  },
}

export const Moodboards: CollectionConfig = {
  slug: 'moodboards',
  access: salonData,
  fields: [
    { name: 'customer', type: 'relationship', relationTo: 'customers', required: true, index: true },
    { name: 'designs', type: 'relationship', relationTo: 'designs', hasMany: true },
  ],
}

// ---------------------------------------------------------------------------
// Moodboard: one board per customer holding the designs they saved.
// ---------------------------------------------------------------------------

interface MoodboardDoc {
  id: ID
  designs?: (ID | { id: ID })[] | null
}

const boardOf = (payload: Payload, tenant: ID, customerId: ID) =>
  forTenant(payload, tenant).findOne<MoodboardDoc>('moodboards', { customer: { equals: asId(customerId) } })

/** Design ids the customer has saved, most recent first. */
export const savedDesignIds = async (payload: Payload, tenant: ID, customerId: ID): Promise<ID[]> => {
  const board = await boardOf(payload, tenant, customerId)
  return (board?.designs ?? []).map((d) => idOf(d) as ID).filter((d) => d != null)
}

/** Save or unsave a design on the customer's moodboard. Returns whether it is now saved. */
export const setDesignSaved = async (payload: Payload, tenant: ID, rawCustomerId: ID, rawDesignId: ID, save: boolean): Promise<boolean> => {
  const customerId = asId(rawCustomerId)
  const designId = asId(rawDesignId)
  const repo = forTenant(payload, tenant)
  const design = await repo.findByID<{ id: ID; likes?: number | null }>('designs', designId)
  if (!design) throw new Error('Design not found')
  const board = await boardOf(payload, tenant, customerId)
  const current = (board?.designs ?? []).map((d) => idOf(d) as ID)
  const has = current.some((d) => String(d) === String(designId))
  if (has === save) return save
  const next = save ? [designId, ...current] : current.filter((d) => String(d) !== String(designId))
  if (board) await repo.update('moodboards', board.id, { designs: next })
  else await repo.create('moodboards', { customer: customerId, designs: next })
  await repo.update('designs', designId, { likes: Math.max(0, (design.likes ?? 0) + (save ? 1 : -1)) })
  return save
}

export const galleryModule = defineModule({
  key: 'gallery',
  feature: 'gallery',
  collections: [Designs, Moodboards],
  tenantCollections: ['designs', 'moodboards'],
})

export * from './discover'
