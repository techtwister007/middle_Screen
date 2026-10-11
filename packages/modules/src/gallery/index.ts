import { defineModule } from '@salon/core'
import type { CollectionConfig } from 'payload'
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

export const galleryModule = defineModule({
  key: 'gallery',
  feature: 'gallery',
  collections: [Designs, Moodboards],
  tenantCollections: ['designs', 'moodboards'],
})

export * from './discover'
