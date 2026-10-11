import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { defineModule, emit, forTenant, type ID, idOf, publicUrl, salonLink } from '@salon/core'
import type { CollectionConfig, Payload } from 'payload'
import { salonData, staffOnly } from '../_shared/access'
import { buildCollage, buildShareKit, type Frame, frameByKey } from './sharekit'

export const PhotoTasks: CollectionConfig = {
  slug: 'photo-tasks',
  admin: { defaultColumns: ['createdAt', 'customer', 'designName', 'status'] },
  access: salonData,
  fields: [
    { name: 'visit', type: 'relationship', relationTo: 'visits', required: true, index: true },
    { name: 'customer', type: 'relationship', relationTo: 'customers', required: true, index: true },
    { name: 'staff', type: 'relationship', relationTo: 'users' },
    { name: 'photos', type: 'upload', relationTo: 'media', hasMany: true },
    { name: 'designName', type: 'text' },
    { name: 'frame', type: 'text', defaultValue: 'classic' },
    { name: 'story', type: 'upload', relationTo: 'media' },
    { name: 'statusImage', type: 'upload', relationTo: 'media' },
    { name: 'square', type: 'upload', relationTo: 'media' },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pending',
      index: true,
      options: ['pending', 'sent', 'shared', 'verified'],
    },
    { name: 'sharedTo', type: 'select', hasMany: true, options: ['instagram', 'whatsapp-status', 'whatsapp', 'other'] },
    { name: 'galleryConsent', type: 'checkbox', defaultValue: false },
    { name: 'galleryDesign', type: 'relationship', relationTo: 'designs' },
  ],
}

/** Platform content library: aftercare and trend articles, written once, shown in every salon's brand. */
export const Articles: CollectionConfig = {
  slug: 'articles',
  admin: { useAsTitle: 'title' },
  access: {
    read: staffOnly,
    create: ({ req }) => (req.user as { role?: string } | null)?.role === 'platform-admin',
    update: ({ req }) => (req.user as { role?: string } | null)?.role === 'platform-admin',
    delete: ({ req }) => (req.user as { role?: string } | null)?.role === 'platform-admin',
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    { name: 'kind', type: 'select', defaultValue: 'aftercare', options: ['aftercare', 'trend', 'guide'] },
    { name: 'serviceCategories', type: 'text', hasMany: true },
    { name: 'language', type: 'select', defaultValue: 'en', options: ['en', 'hi', 'gu'] },
    { name: 'summary', type: 'textarea' },
    { name: 'body', type: 'textarea', required: true, admin: { description: 'Markdown' } },
    { name: 'cover', type: 'upload', relationTo: 'media' },
    { name: 'published', type: 'checkbox', defaultValue: true },
  ],
}

interface MediaDoc {
  id: ID
  url?: string | null
  filename?: string | null
}

/** Reads an uploaded image from local disk or its public URL. */
export const readMedia = async (media: MediaDoc): Promise<Buffer> => {
  if (media.filename) {
    try {
      return await readFile(path.resolve(process.env.MEDIA_DIR ?? 'media', media.filename))
    } catch {
      // fall through to URL
    }
  }
  if (!media.url) throw new Error('Media has no file')
  const url = media.url.startsWith('http') ? media.url : `${publicUrl()}${media.url}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Could not read media ${url}`)
  return Buffer.from(await res.arrayBuffer())
}

export const saveImage = async (payload: Payload, tenant: ID, buffer: Buffer, name: string, kind: string, alt?: string) =>
  (await payload.create({
    collection: 'media' as never,
    overrideAccess: true,
    data: { alt: alt ?? name, kind, tenant } as never,
    file: { data: buffer, mimetype: 'image/jpeg', name: `${name}.jpg`, size: buffer.length },
  })) as unknown as MediaDoc

interface SalonDoc {
  id: ID
  name: string
  slug: string
  contact?: { instagram?: string | null } | null
}

interface TaskDoc {
  id: ID
  visit: ID | { id: ID }
  customer: ID | { id: ID }
  staff?: ID | { id: ID } | null
  photos?: (ID | MediaDoc)[] | null
  designName?: string | null
  frame?: string | null
  status: string
  galleryConsent?: boolean
  sharedTo?: string[] | null
}

/** Creates the photo task for a visit (or returns the existing one). */
export const photoTaskForVisit = async (payload: Payload, tenant: ID, visitId: ID) => {
  const repo = forTenant(payload, tenant)
  const existing = await repo.findOne<TaskDoc>('photo-tasks', { visit: { equals: visitId } })
  if (existing) return existing
  const visit = await repo.findByID<{ id: ID; customer: ID | { id: ID }; staff?: ID | { id: ID } | null; designName?: string }>('visits', visitId)
  if (!visit) throw new Error('Visit not found')
  return repo.create<TaskDoc>('photo-tasks', {
    visit: visitId,
    customer: idOf(visit.customer),
    staff: idOf(visit.staff) ?? undefined,
    designName: visit.designName,
    status: 'pending',
  })
}

/**
 * Staff finished the photo corner: generate the share kit (story, WhatsApp Status, square post)
 * and send the reveal to the customer.
 */
export const completePhotoTask = async (
  payload: Payload,
  tenant: ID,
  taskId: ID,
  input: { photoIds: ID[]; designName?: string; frame?: string; artistName?: string },
) => {
  const repo = forTenant(payload, tenant)
  const task = await repo.findByID<TaskDoc>('photo-tasks', taskId)
  if (!task) throw new Error('Photo task not found')
  const salon = (await payload.findByID({ collection: 'salons' as never, id: tenant, depth: 0, overrideAccess: true })) as unknown as SalonDoc
  const customer = await repo.findByID<{ referralCode?: string }>('customers', idOf(task.customer) as ID)
  const firstPhoto = await repo.findByID<MediaDoc>('media', input.photoIds[0])
  if (!firstPhoto) throw new Error('Photo not found')
  const frame: Frame = frameByKey(input.frame ?? task.frame)
  const link = customer?.referralCode ? salonLink(salon.slug, `/r/${customer.referralCode}`) : salonLink(salon.slug)
  let kit: { story: MediaDoc; statusImage: MediaDoc; square: MediaDoc } | null = null
  try {
    const buffers = await buildShareKit(await readMedia(firstPhoto), frame, {
      salonName: salon.name,
      handle: salon.contact?.instagram,
      designName: input.designName ?? task.designName,
      artist: input.artistName,
      link,
    })
    const base = `share-${task.id}-${Date.now()}`
    kit = {
      story: await saveImage(payload, tenant, buffers.story, `${base}-story`, 'share-kit'),
      statusImage: await saveImage(payload, tenant, buffers.status, `${base}-status`, 'share-kit'),
      square: await saveImage(payload, tenant, buffers.square, `${base}-square`, 'share-kit'),
    }
  } catch (err) {
    // The reveal still goes out with the plain photos if image generation fails.
    console.error('[content-engine] share kit failed', err)
  }
  const updated = await repo.update<TaskDoc>('photo-tasks', taskId, {
    photos: input.photoIds,
    designName: input.designName ?? task.designName,
    frame: frame.key,
    status: 'sent',
    ...(kit ? { story: kit.story.id, statusImage: kit.statusImage.id, square: kit.square.id } : {}),
  })
  await repo.update('visits', idOf(task.visit) as ID, { photos: input.photoIds, designName: input.designName ?? task.designName })
  await emit(payload, {
    tenant,
    type: 'photo.ready',
    payload: { photoTaskId: taskId, customerId: idOf(task.customer) as ID, visitId: idOf(task.visit) as ID },
    actorType: 'staff',
  })
  return updated
}

export const recordShare = async (payload: Payload, tenant: ID, taskId: ID, customerId: ID, channel: string) => {
  const repo = forTenant(payload, tenant)
  const task = await repo.findByID<TaskDoc>('photo-tasks', taskId)
  if (!task || String(idOf(task.customer)) !== String(customerId)) return null
  const sharedTo = Array.from(new Set([...(task.sharedTo ?? []), channel]))
  await repo.update('photo-tasks', taskId, { sharedTo, status: task.status === 'verified' ? 'verified' : 'shared' })
  await emit(payload, { tenant, type: 'photo.shared', payload: { photoTaskId: taskId, customerId }, actorType: 'customer', actorId: customerId })
  return sharedTo
}

export const verifyShare = async (payload: Payload, tenant: ID, taskId: ID) => {
  const repo = forTenant(payload, tenant)
  const task = await repo.findByID<TaskDoc>('photo-tasks', taskId)
  if (!task || task.status === 'verified') return task
  await repo.update('photo-tasks', taskId, { status: 'verified' })
  await emit(payload, { tenant, type: 'share.verified', payload: { photoTaskId: taskId, customerId: idOf(task.customer) as ID }, actorType: 'staff' })
  return task
}

/** "Feature my nails": publishes the customer's photo to the gallery as a bookable design. */
export const featureInGallery = async (payload: Payload, tenant: ID, taskId: ID, customerId: ID) => {
  const repo = forTenant(payload, tenant)
  const task = await repo.findByID<TaskDoc & { galleryDesign?: ID | null }>('photo-tasks', taskId)
  if (!task || String(idOf(task.customer)) !== String(customerId)) return null
  if (task.galleryDesign) return task.galleryDesign
  const visit = await repo.findByID<{ lines: { service?: ID | { id: ID } | null; price: number }[]; staff?: ID | { id: ID } | null }>(
    'visits',
    idOf(task.visit) as ID,
  )
  const design = await repo.create<{ id: ID }>('designs', {
    title: task.designName || 'Customer favourite',
    images: (task.photos ?? []).map((p) => idOf(p)),
    source: 'customer',
    customer: customerId,
    customerConsent: true,
    published: true,
    artist: idOf(visit?.staff ?? task.staff) ?? undefined,
    service: idOf(visit?.lines?.[0]?.service) ?? undefined,
    priceFrom: visit?.lines?.reduce((n, l) => n + l.price, 0) ?? 0,
  })
  await repo.update('photo-tasks', taskId, { galleryConsent: true, galleryDesign: design.id })
  const customer = await repo.findByID<{ consents?: Record<string, unknown> | null }>('customers', customerId)
  await repo.update('customers', customerId, { consents: { ...(customer?.consents ?? {}), gallery: true } })
  return design.id
}

export const weeklyCollage = async (payload: Payload, tenant: ID) => {
  const repo = forTenant(payload, tenant)
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString()
  const tasks = await repo.find<TaskDoc>('photo-tasks', {
    where: { and: [{ createdAt: { greater_than: since } }, { status: { in: ['sent', 'shared', 'verified'] } }] },
    depth: 1,
    limit: 12,
  })
  const media = tasks.docs.flatMap((t) => (t.photos ?? []).slice(0, 1)).filter((m): m is MediaDoc => typeof m === 'object')
  if (media.length < 2) return null
  const salon = (await payload.findByID({ collection: 'salons' as never, id: tenant, depth: 0, overrideAccess: true })) as unknown as SalonDoc & {
    theme?: string
  }
  const buffers = await Promise.all(media.slice(0, 4).map(readMedia))
  const collage = await buildCollage(buffers, frameByKey(salon.theme === 'luxe' ? 'noir' : 'classic'), `This week at ${salon.name}`)
  return saveImage(payload, tenant, collage, `collage-${Date.now()}`, 'share-kit', 'Weekly collage')
}

export const contentEngineModule = defineModule({
  key: 'content-engine',
  feature: 'contentEngine',
  collections: [PhotoTasks, Articles],
  tenantCollections: ['photo-tasks'],
  on: {
    'visit.completed': async ({ payload, event }) => {
      await photoTaskForVisit(payload, event.tenant, event.payload.visitId)
    },
  },
})

export * from './sharekit'
