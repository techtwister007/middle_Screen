import { defineModule, type ID, isEnabled } from '@salon/core'
import type { CollectionConfig, Payload } from 'payload'
import { platformOnly, staffOnly } from '../_shared/access'

/** City discovery page listings. Managed by the platform; salons opt in. Off by default. */
export const CityListings: CollectionConfig = {
  slug: 'city-listings',
  admin: { defaultColumns: ['salon', 'city', 'optedIn', 'featured'] },
  access: { read: staffOnly, create: platformOnly, update: platformOnly, delete: platformOnly },
  fields: [
    { name: 'salon', type: 'relationship', relationTo: 'salons', required: true, unique: true },
    { name: 'city', type: 'text', required: true, index: true },
    { name: 'area', type: 'text' },
    { name: 'blurb', type: 'textarea' },
    { name: 'optedIn', type: 'checkbox', defaultValue: false },
    { name: 'featured', type: 'checkbox', defaultValue: false },
    { name: 'specialties', type: 'text', hasMany: true },
  ],
}

export interface CityListing {
  salon: { id: ID; name: string; slug: string; tagline?: string; plan: 'starter' | 'studio' | 'growth'; featureOverrides?: never[]; status: string }
  area?: string
  blurb?: string
  featured?: boolean
  specialties?: string[]
}

/** Salons shown on a city page: opted in AND discovery enabled for the salon. No customer data. */
export const cityListings = async (payload: Payload, city: string): Promise<CityListing[]> => {
  const res = await payload.find({
    collection: 'city-listings' as never,
    overrideAccess: true,
    depth: 1,
    limit: 200,
    where: { and: [{ city: { like: city } }, { optedIn: { equals: true } }] },
    sort: '-featured',
  })
  return (res.docs as unknown as CityListing[]).filter(
    (l) => l.salon && typeof l.salon === 'object' && l.salon.status !== 'suspended' && isEnabled(l.salon, 'discovery'),
  )
}

export const discoveryModule = defineModule({
  key: 'discovery',
  feature: 'discovery',
  collections: [CityListings],
})
