import { asId, defineModule, forTenant, type ID, idOf, publicUrl, slugify } from '@salon/core'
import type { CollectionConfig, Payload } from 'payload'
import { platformOnly, salonConfig, salonData, staffOnly } from '../_shared/access'
import { moneyField } from '../_shared/fields'

export const OCCASIONS = ['everyday', 'office', 'party', 'wedding', 'garba', 'festive', 'vacation', 'date-night'] as const
export const SHAPES = ['almond', 'coffin', 'square', 'oval', 'stiletto', 'round', 'squoval'] as const
export const LENGTHS = ['short', 'medium', 'long', 'extra-long'] as const

/** Starting styles for a new salon. Owners rename, reorder, hide or add their own. */
export const DEFAULT_STYLES: { name: string; category: string }[] = [
  { name: 'Nail art', category: 'nail-art' },
  { name: 'French', category: 'french' },
  { name: 'Chrome & cat-eye', category: 'chrome' },
  { name: 'Ombré', category: 'ombre' },
  { name: 'Minimal', category: 'minimal' },
  { name: 'Glitter', category: 'glitter' },
  { name: 'Solid colour', category: 'solid' },
  { name: 'Bridal', category: 'bridal' },
  { name: '3D & charms', category: '3d' },
]

/** A salon's own design styles (the filter chips customers see in the gallery). */
export const Styles: CollectionConfig = {
  slug: 'styles',
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'order', 'active'] },
  access: salonConfig,
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', index: true },
    { name: 'order', type: 'number', defaultValue: 0 },
    { name: 'active', type: 'checkbox', defaultValue: true },
  ],
  hooks: {
    beforeChange: [
      ({ data }) => {
        if (data?.name && !data.slug) data.slug = slugify(data.name)
        return data
      },
    ],
  },
}

/** Photos for the platform design library (not owned by any salon). */
export const LibraryMedia: CollectionConfig = {
  slug: 'library-media',
  admin: { group: 'Platform' },
  access: { read: () => true, create: platformOnly, update: platformOnly, delete: platformOnly },
  upload: {
    staticDir: `${process.env.MEDIA_DIR ?? 'media'}/library`,
    mimeTypes: ['image/*'],
    imageSizes: [
      { name: 'thumb', width: 320, height: 320, position: 'centre' },
      { name: 'card', width: 720 },
    ],
  },
  fields: [{ name: 'alt', type: 'text' }],
}

/** Platform design library: curated looks any salon can copy into its gallery in one tap. */
export const LibraryDesigns: CollectionConfig = {
  slug: 'library-designs',
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'styleNames', 'published'], group: 'Platform' },
  access: { read: staffOnly, create: platformOnly, update: platformOnly, delete: platformOnly },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    { name: 'images', type: 'upload', relationTo: 'library-media', hasMany: true, required: true, minRows: 1 },
    { name: 'styleNames', type: 'text', hasMany: true, admin: { description: 'Matched to the salon’s styles by name when copied' } },
    { name: 'shape', type: 'select', options: [...SHAPES] },
    { name: 'length', type: 'select', options: [...LENGTHS] },
    { name: 'occasions', type: 'select', hasMany: true, options: [...OCCASIONS] },
    { name: 'seasons', type: 'text', hasMany: true },
    { name: 'colors', type: 'text', hasMany: true },
    { name: 'suggestedService', type: 'text', admin: { description: 'Service name to link, e.g. "Gel polish"' } },
    { name: 'credit', type: 'text', admin: { description: 'Photo source / licence' } },
    { name: 'published', type: 'checkbox', defaultValue: true, index: true },
    { name: 'timesCopied', type: 'number', defaultValue: 0 },
  ],
}

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
    { name: 'styles', type: 'relationship', relationTo: 'styles', hasMany: true, index: true },
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
    { name: 'order', type: 'number', defaultValue: 0, admin: { description: 'Lower shows first' } },
    { name: 'libraryDesign', type: 'relationship', relationTo: 'library-designs', admin: { readOnly: true } },
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

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

export interface StyleDoc {
  id: ID
  name: string
  slug?: string | null
  order?: number | null
  active?: boolean | null
}

/** The salon's styles in display order. Creates the defaults the first time. */
export const salonStyles = async (payload: Payload, tenant: ID, opts: { includeHidden?: boolean } = {}): Promise<StyleDoc[]> => {
  const repo = forTenant(payload, tenant)
  let styles = (await repo.find<StyleDoc>('styles', { sort: 'order', limit: 200, depth: 0 })).docs
  if (!styles.length) {
    for (const [i, s] of DEFAULT_STYLES.entries()) await repo.create('styles', { name: s.name, slug: slugify(s.name), order: i * 10, active: true })
    styles = (await repo.find<StyleDoc>('styles', { sort: 'order', limit: 200, depth: 0 })).docs
  }
  return opts.includeHidden ? styles : styles.filter((s) => s.active !== false)
}

/** Style ids for a list of names, creating any the salon doesn't have yet. */
export const styleIdsByName = async (payload: Payload, tenant: ID, names: string[]): Promise<ID[]> => {
  if (!names.length) return []
  const repo = forTenant(payload, tenant)
  const existing = await salonStyles(payload, tenant, { includeHidden: true })
  const ids: ID[] = []
  for (const name of names) {
    const found = existing.find((s) => s.name.toLowerCase() === name.toLowerCase() || s.slug === slugify(name))
    if (found) ids.push(found.id)
    else {
      const created = await repo.create<StyleDoc>('styles', { name, slug: slugify(name), order: (existing.length + ids.length) * 10, active: true })
      existing.push(created)
      ids.push(created.id)
    }
  }
  return ids
}

/** Style name for a legacy design category (used by the seed and the library). */
export const styleNameForCategory = (category?: string | null) => DEFAULT_STYLES.find((s) => s.category === category)?.name

// ---------------------------------------------------------------------------
// Design library
// ---------------------------------------------------------------------------

interface LibraryDoc {
  id: ID
  title: string
  description?: string | null
  images: ({ id: ID; url?: string | null; filename?: string | null; mimeType?: string | null } | ID)[]
  styleNames?: string[] | null
  shape?: string | null
  length?: string | null
  occasions?: string[] | null
  seasons?: string[] | null
  colors?: string[] | null
  suggestedService?: string | null
  published?: boolean | null
  timesCopied?: number | null
}

const fetchImage = async (m: { url?: string | null; mimeType?: string | null; filename?: string | null }) => {
  const meta = { mimetype: m.mimeType ?? 'image/jpeg', name: m.filename ?? 'design.jpg' }
  // Local storage: read the file straight from disk. Cloud storage (S3 / Supabase): download it.
  if (!process.env.S3_BUCKET && m.filename) {
    try {
      const { readFile } = await import('node:fs/promises')
      const path = await import('node:path')
      return { data: await readFile(path.join(process.env.MEDIA_DIR ?? 'media', 'library', m.filename)), ...meta }
    } catch {}
  }
  if (!m.url) return null
  const res = await fetch(new URL(m.url, publicUrl()))
  if (!res.ok) return null
  return { data: Buffer.from(await res.arrayBuffer()), ...meta }
}

/**
 * Copies a library look into a salon's gallery: images become the salon's own media, styles are matched by
 * name (created if missing) and the service is matched by name. The copy is the salon's to edit or delete.
 */
export const copyLibraryDesign = async (payload: Payload, tenant: ID, libraryId: ID, opts: { serviceId?: ID | null; publish?: boolean } = {}) => {
  const repo = forTenant(payload, tenant)
  const already = await repo.findOne<{ id: ID }>('designs', { libraryDesign: { equals: asId(libraryId) } })
  if (already) return { id: already.id, created: false }
  const lib = (await payload.findByID({ collection: 'library-designs' as never, id: asId(libraryId), depth: 1, overrideAccess: true })) as unknown as LibraryDoc
  if (!lib || lib.published === false) throw new Error('Design not found')
  const images: ID[] = []
  for (const img of lib.images ?? []) {
    if (typeof img !== 'object') continue
    const file = await fetchImage(img)
    if (!file) continue
    const media = (await payload.create({
      collection: 'media' as never,
      overrideAccess: true,
      data: { alt: lib.title, kind: 'design', tenant } as never,
      file: { ...file, size: file.data.length },
    })) as unknown as { id: ID }
    images.push(media.id)
  }
  if (!images.length) throw new Error('Could not copy the photos')
  let serviceId = opts.serviceId ? asId(opts.serviceId) : null
  if (!serviceId && lib.suggestedService) {
    const svc = await repo.findOne<{ id: ID }>('services', { and: [{ name: { like: lib.suggestedService } }, { active: { equals: true } }] })
    serviceId = svc?.id ?? null
  }
  const design = await repo.create<{ id: ID }>('designs', {
    title: lib.title,
    description: lib.description,
    images,
    styles: await styleIdsByName(payload, tenant, lib.styleNames ?? []),
    shape: lib.shape,
    length: lib.length,
    occasions: lib.occasions ?? [],
    seasons: lib.seasons ?? [],
    colors: lib.colors ?? [],
    service: serviceId ?? undefined,
    source: 'staff',
    published: opts.publish !== false,
    libraryDesign: lib.id,
  })
  await payload.update({
    collection: 'library-designs' as never,
    id: lib.id,
    overrideAccess: true,
    data: { timesCopied: (lib.timesCopied ?? 0) + 1 } as never,
  })
  return { id: design.id, created: true }
}

export const galleryModule = defineModule({
  key: 'gallery',
  feature: 'gallery',
  collections: [Styles, Designs, Moodboards, LibraryMedia, LibraryDesigns],
  tenantCollections: ['styles', 'designs', 'moodboards'],
})

export * from './discover'
