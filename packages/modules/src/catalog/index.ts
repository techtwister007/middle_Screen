import { defineModule } from '@salon/core'
import type { CollectionConfig } from 'payload'
import { salonConfig } from '../_shared/access'
import { moneyField } from '../_shared/fields'

export const SERVICE_CATEGORIES = ['gel', 'extensions', 'nail-art', 'manicure', 'pedicure', 'refill', 'removal', 'add-on', 'bridal', 'lashes', 'brows', 'other'] as const

export const Services: CollectionConfig = {
  slug: 'services',
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'category', 'price', 'durationMinutes', 'active'] },
  access: salonConfig,
  defaultSort: 'order',
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'category', type: 'select', required: true, defaultValue: 'gel', options: [...SERVICE_CATEGORIES] },
    { name: 'description', type: 'textarea' },
    {
      type: 'row',
      fields: [
        moneyField('price', { required: true }),
        { name: 'durationMinutes', type: 'number', required: true, defaultValue: 60, min: 5 },
      ],
    },
    {
      name: 'isAddOn',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Add-ons (chrome, art on 2 fingers) are added on top of a main service' },
    },
    {
      name: 'cycleDays',
      type: 'number',
      admin: { description: 'Days until this service is usually repeated (refill reminders). Empty = no reminder.' },
    },
    { name: 'requiresDeposit', type: 'select', defaultValue: 'auto', options: ['auto', 'always', 'never'] },
    { name: 'images', type: 'upload', relationTo: 'media', hasMany: true },
    { name: 'lastsDays', type: 'number', admin: { description: 'How long the result usually lasts' } },
    { name: 'aftercare', type: 'textarea' },
    { name: 'order', type: 'number', defaultValue: 0 },
    { name: 'active', type: 'checkbox', defaultValue: true, index: true },
  ],
}

export const Packages: CollectionConfig = {
  slug: 'packages',
  admin: { useAsTitle: 'name' },
  access: salonConfig,
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    { name: 'kind', type: 'select', defaultValue: 'bundle', options: ['bundle', 'prepaid-credit'] },
    {
      name: 'items',
      type: 'array',
      admin: { condition: (_, s) => s?.kind !== 'prepaid-credit' },
      fields: [
        { name: 'service', type: 'relationship', relationTo: 'services', required: true },
        { name: 'quantity', type: 'number', defaultValue: 1, min: 1 },
      ],
    },
    moneyField('price', { required: true }),
    moneyField('creditValue', { admin: { description: 'For prepaid credit: value credited to the wallet (paise)' } }),
    { name: 'validityDays', type: 'number', defaultValue: 180 },
    { name: 'active', type: 'checkbox', defaultValue: true },
  ],
}

export const catalogModule = defineModule({
  key: 'catalog',
  feature: 'catalog',
  collections: [Services, Packages],
  tenantCollections: ['services', 'packages'],
})

export * from '../_shared/pricing'
