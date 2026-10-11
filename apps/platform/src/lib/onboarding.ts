import { forTenant, type ID, normalizePhone, rupees, shortCode } from '@salon/core'
import { copyLibraryDesign, salonStyles, tenantCollections } from '@salon/modules'
import type { Payload } from 'payload'
import { renderAvatar, renderLogo } from '@/seed/nailArt'

export interface RealSalonInput {
  name: string
  slug: string
  plan: 'starter' | 'studio' | 'growth'
  theme: 'default' | 'luxe' | 'minimal'
  primaryColor?: string
  tagline?: string
  about?: string
  phone?: string
  instagram?: string
  address?: string
  area?: string
  city?: string
  hours: { day: string; open: string; close: string; closed: boolean }[]
  owner: { name: string; email: string; password: string }
  artists: string[]
  services: { name: string; category: string; price: number; minutes: number; isAddOn?: boolean; cycleDays?: number }[]
  logo?: { data: Buffer; mimetype: string; name: string } | null
  photos: { data: Buffer; mimetype: string; title: string }[]
  /** Start the gallery with this many looks from the platform design library (clearly the salon's to replace). */
  libraryLooks: number
}

const COLORS = ['#B4537A', '#8E6BBF', '#D98C6C', '#5E8C7A']

const media = async (payload: Payload, tenant: ID, file: { data: Buffer; mimetype: string; name: string }, kind: string, alt: string) =>
  (await payload.create({
    collection: 'media',
    overrideAccess: true,
    data: { alt, kind, tenant } as never,
    file: { ...file, size: file.data.length },
  })) as unknown as { id: ID }

/**
 * Creates a real (paying) salon: only what the operator entered, nothing invented. No sample customers, offers,
 * packages or address; the gallery is the salon's own photos, optionally topped up from the design library.
 */
export const createRealSalon = async (payload: Payload, input: RealSalonInput) => {
  const salon = (await payload.create({
    collection: 'salons',
    overrideAccess: true,
    data: {
      name: input.name,
      slug: input.slug,
      plan: input.plan,
      status: 'active',
      theme: input.theme,
      tagline: input.tagline || undefined,
      about: input.about || undefined,
      languages: ['en', 'gu', 'hi'],
      contact: {
        phone: input.phone ? normalizePhone(input.phone) : undefined,
        whatsapp: input.phone ? normalizePhone(input.phone) : undefined,
        instagram: input.instagram?.replace(/^@/, '') || undefined,
        address: input.address || undefined,
        area: input.area || undefined,
        city: input.city || undefined,
      },
      hours: input.hours,
      brand: { primaryColor: input.primaryColor || undefined },
    } as never,
  })) as unknown as { id: ID; slug: string }
  const tenant = salon.id
  const repo = forTenant(payload, tenant)

  const logo = input.logo
    ? await media(payload, tenant, input.logo, 'brand', `${input.name} logo`)
    : await media(
        payload,
        tenant,
        {
          data: await renderLogo(input.name.slice(0, 1).toUpperCase(), input.primaryColor || '#B4537A', '#FFFFFF'),
          mimetype: 'image/png',
          name: `${input.slug}-logo.png`,
        },
        'brand',
        `${input.name} logo`,
      )
  await payload.update({
    collection: 'salons',
    id: tenant,
    overrideAccess: true,
    data: { brand: { primaryColor: input.primaryColor || undefined, logo: logo.id } } as never,
  })

  await payload.create({
    collection: 'users',
    overrideAccess: true,
    data: {
      name: input.owner.name,
      email: input.owner.email.toLowerCase(),
      password: input.owner.password,
      role: 'owner',
      bookable: !input.artists.length,
      phone: input.phone ? normalizePhone(input.phone) : undefined,
      tenants: [{ tenant }],
    } as never,
  })
  const weekly = input.hours.map((h) => ({ day: h.day, start: h.open, end: h.close, off: h.closed }))
  for (const [i, name] of input.artists.entries()) {
    const initials = name
      .split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
    const avatar = await media(
      payload,
      tenant,
      { data: await renderAvatar(initials, COLORS[i % COLORS.length]), mimetype: 'image/jpeg', name: `${input.slug}-${initials}.jpg` },
      'brand',
      name,
    )
    const user = (await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        name,
        email: `${
          name
            .split(' ')[0]
            .toLowerCase()
            .replace(/[^a-z]/g, '') || 'artist'
        }.${shortCode(4).toLowerCase()}@${input.slug}.invalid`,
        password: shortCode(16),
        role: 'artist',
        bookable: true,
        active: true,
        avatar: avatar.id,
        tenants: [{ tenant }],
      } as never,
    })) as unknown as { id: ID }
    await repo.create('availability', { staff: user.id, weekly })
  }

  for (const [i, s] of input.services.entries())
    await repo.create('services', {
      name: s.name,
      category: s.category,
      price: rupees(s.price),
      durationMinutes: s.minutes,
      cycleDays: s.cycleDays,
      isAddOn: Boolean(s.isAddOn) || s.category === 'add-on',
      order: i,
      active: true,
    })

  await salonStyles(payload, tenant)
  for (const [i, p] of input.photos.entries()) {
    const m = await media(payload, tenant, { data: p.data, mimetype: p.mimetype, name: `${input.slug}-design-${i}.jpg` }, 'design', p.title)
    await repo.create('designs', { title: p.title, images: [m.id], source: 'staff', published: true, order: i * 10 })
  }
  if (input.libraryLooks > 0) {
    const looks = (
      await payload.find({
        collection: 'library-designs',
        overrideAccess: true,
        depth: 0,
        limit: input.libraryLooks,
        sort: '-timesCopied',
        where: { published: { equals: true } },
      })
    ).docs as unknown as { id: ID }[]
    for (const l of looks) await copyLibraryDesign(payload, tenant, l.id)
  }

  for (const [label, source, target] of [
    ['Instagram bio', 'instagram', '/'],
    ['Mirror QR', 'qr', '/chair'],
    ['Window poster', 'poster', '/designs'],
    ['Aftercare card', 'qr', '/care'],
  ] as const)
    await repo.create('tracking-links', { label, source, target, code: `${input.slug.slice(0, 3)}${shortCode(3).toLowerCase()}`, clicks: 0 })
  return salon
}

/** Removes a salon and everything it owns. Used to roll back a failed onboarding so a retry starts clean. */
export const deleteSalonCompletely = async (payload: Payload, salonId: ID) => {
  const repo = forTenant(payload, salonId)
  // Children before parents: relationship order matters for required links (e.g. photo tasks → visits).
  const order = [
    'photo-tasks',
    'ratings',
    'contest-votes',
    'contest-entries',
    'messages',
    'rewards',
    'referrals',
    'wallet-entries',
    'payments',
    'visits',
    'appointments',
  ]
  const rest = tenantCollections().filter((c) => !order.includes(c) && c !== 'media')
  for (const col of [...order, ...rest, 'media']) {
    for (let guard = 0; guard < 200; guard++) {
      const batch = (await repo.find<{ id: ID }>(col, { limit: 200, depth: 0 }).catch(() => ({ docs: [] as { id: ID }[] }))).docs
      if (!batch.length) break
      for (const d of batch) await repo.delete(col, d.id).catch(() => null)
    }
  }
  const users = (await payload.find({ collection: 'users', overrideAccess: true, depth: 0, limit: 500, where: { 'tenants.tenant': { equals: salonId } } }))
    .docs as unknown as {
    id: ID
    role: string
    tenants?: { tenant: ID }[]
  }[]
  for (const u of users) {
    if (u.role === 'platform-admin') continue
    const others = (u.tenants ?? []).filter((t) => String(t.tenant) !== String(salonId))
    if (others.length) await payload.update({ collection: 'users', id: u.id, overrideAccess: true, data: { tenants: others } as never })
    else await payload.delete({ collection: 'users', id: u.id, overrideAccess: true })
  }
  await payload.delete({ collection: 'salons', id: salonId, overrideAccess: true })
}
