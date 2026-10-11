import { DAY_MS, type ID, addDays, forTenant, rupees, shortCode, zonedDateTime } from '@salon/core'
import { recomputeSegments } from '@salon/modules'
import type { Payload } from 'payload'
import { ARTICLES, CAMPAIGN_PACKS, DESIGNS, FIRST_NAMES, LAST_NAMES, LASH_SERVICES, NAIL_SERVICES, REVIEWS, type ServiceSeed } from './content'
import { renderAvatar, renderLogo, renderNailSet } from './nailArt'

/** Deterministic random so every demo looks the same. */
export const rng = (seed: number) => {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

const pick = <T>(r: () => number, list: T[]) => list[Math.floor(r() * list.length)]

const upload = async (payload: Payload, tenant: ID | null, data: Buffer, name: string, mimetype: string, kind: string, alt: string) =>
  (await payload.create({
    collection: 'media',
    overrideAccess: true,
    data: { alt, kind, ...(tenant ? { tenant } : {}) } as never,
    file: { data, mimetype, name, size: data.length },
  })) as unknown as { id: ID; url: string }

export const seedPlatform = async (payload: Payload, adminPassword: string) => {
  const existing = await payload.find({ collection: 'users', overrideAccess: true, where: { email: { equals: 'admin@platform.test' } }, limit: 1 })
  if (!existing.docs.length)
    await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: { name: 'Platform Admin', email: 'admin@platform.test', password: adminPassword, role: 'platform-admin', bookable: false } as never,
    })
  for (const pack of CAMPAIGN_PACKS) {
    const found = await payload.find({ collection: 'campaign-packs', overrideAccess: true, where: { festival: { equals: pack.festival } }, limit: 1 })
    if (!found.docs.length) await payload.create({ collection: 'campaign-packs', overrideAccess: true, data: pack as never })
  }
  for (const a of ARTICLES) {
    const found = await payload.find({ collection: 'articles', overrideAccess: true, where: { slug: { equals: a.slug } }, limit: 1 })
    if (!found.docs.length) await payload.create({ collection: 'articles', overrideAccess: true, data: { ...a, published: true } as never })
  }
}

export interface SalonSeed {
  name: string
  slug: string
  tagline: string
  about: string
  theme: 'default' | 'luxe' | 'minimal'
  plan: 'starter' | 'studio' | 'growth'
  colors: { cover: [string, string, string]; logoBg: string; logoFg: string }
  area: string
  instagram: string
  phone: string
  artists: { name: string; specialties: string[]; color: string }[]
  services: ServiceSeed[]
  designCount: number
  customers: number
  ownerEmail: string
  ownerName: string
  seed: number
  status?: 'active' | 'demo'
  featureOverrides?: { feature: string; enabled: boolean }[]
}

export const DEMO_SALONS: SalonSeed[] = [
  {
    name: 'Glam Nails Studio',
    slug: 'glamnails',
    tagline: 'Nail art that gets you noticed',
    about: 'Gel, extensions and hand-painted art in Alkapuri. Four artists, one obsession: nails that last.',
    theme: 'default',
    plan: 'studio',
    colors: { cover: ['#F6D6DF', '#E8B4C8', '#C77D9E'], logoBg: '#B4537A', logoFg: '#FFFFFF' },
    area: 'Alkapuri, Vadodara',
    instagram: 'glamnails.vadodara',
    phone: '+919825000101',
    artists: [
      { name: 'Riya Shah', specialties: ['Extensions', 'Chrome'], color: '#B4537A' },
      { name: 'Meera Patel', specialties: ['Hand-painted art'], color: '#8E6BBF' },
      { name: 'Krupa Desai', specialties: ['French & minimal'], color: '#D98C6C' },
      { name: 'Sneha Joshi', specialties: ['Bridal'], color: '#5E8C7A' },
    ],
    services: NAIL_SERVICES,
    designCount: 18,
    customers: 120,
    ownerEmail: 'owner@glamnails.test',
    ownerName: 'Nisha Mehta',
    seed: 11,
    featureOverrides: [{ feature: 'aiTryOn', enabled: true }],
  },
  {
    name: 'Aura Beauty Lounge',
    slug: 'aura',
    tagline: 'Quiet luxury for nails, lashes and brows',
    about: 'A private lounge in Gotri. By appointment, with champagne-gold finishes and unhurried care.',
    theme: 'luxe',
    plan: 'growth',
    colors: { cover: ['#2A2024', '#5B4632', '#C9A45C'], logoBg: '#141012', logoFg: '#C9A45C' },
    area: 'Gotri, Vadodara',
    instagram: 'aura.lounge',
    phone: '+919825000202',
    artists: [
      { name: 'Zara Sheikh', specialties: ['Luxury nail art'], color: '#8E6F3E' },
      { name: 'Aditi Iyer', specialties: ['Lashes & brows'], color: '#6B5B4E' },
    ],
    services: [...NAIL_SERVICES.slice(0, 7), ...NAIL_SERVICES.slice(8), ...LASH_SERVICES],
    designCount: 12,
    customers: 60,
    ownerEmail: 'owner@aura.test',
    ownerName: 'Fatima Sheikh',
    seed: 22,
  },
  {
    name: 'Nails by Riddhi',
    slug: 'riddhi',
    tagline: 'Home studio · minimal & clean nails',
    about: 'One artist, one chair, all the attention. Minimal sets for everyday and office.',
    theme: 'minimal',
    plan: 'starter',
    colors: { cover: ['#F5F5F4', '#E7E5E4', '#D4C5B9'], logoBg: '#111111', logoFg: '#FFFFFF' },
    area: 'Manjalpur, Vadodara',
    instagram: 'nailsbyriddhi',
    phone: '+919825000303',
    artists: [{ name: 'Riddhi Trivedi', specialties: ['Minimal', 'French'], color: '#444444' }],
    services: NAIL_SERVICES.filter((s) => ['gel', 'manicure', 'removal', 'add-on'].includes(s.category)),
    designCount: 8,
    customers: 30,
    ownerEmail: 'owner@riddhi.test',
    ownerName: 'Riddhi Trivedi',
    seed: 33,
  },
]

const SOURCES: [string, number][] = [
  ['instagram', 0.34],
  ['qr', 0.14],
  ['whatsapp', 0.12],
  ['referral', 0.14],
  ['google', 0.1],
  ['walk-in', 0.12],
  ['contest', 0.04],
]

const weighted = (r: () => number, items: [string, number][]) => {
  let x = r()
  for (const [v, w] of items) {
    if ((x -= w) <= 0) return v
  }
  return items[items.length - 1][0]
}

export interface SeedSalonOptions {
  ownerPassword: string
  /** Real photos (e.g. a prospect's own Instagram shots) to use instead of generated nail art */
  designImages?: { buffer: Buffer; title?: string; mimetype?: string }[]
  /** Defaults to the seed's own customer count */
  customers?: number
  now?: Date
  log?: (msg: string) => void
}

/** Creates (or recreates) a salon with brand, team, menu, gallery and 90 days of history. */
export const seedSalon = async (payload: Payload, def: SalonSeed, opts: SeedSalonOptions) => {
  const log = opts.log ?? (() => {})
  const now = opts.now ?? new Date()
  const r = rng(def.seed)
  const existing = await payload.find({ collection: 'salons', overrideAccess: true, where: { slug: { equals: def.slug } }, limit: 1 })
  if (existing.docs.length) {
    log(`  ${def.slug} exists, skipping`)
    return existing.docs[0] as unknown as { id: ID; slug: string }
  }

  log(`  creating ${def.name}`)
  const salon = (await payload.create({
    collection: 'salons',
    overrideAccess: true,
    data: {
      name: def.name,
      slug: def.slug,
      plan: def.plan,
      status: def.status ?? 'active',
      tagline: def.tagline,
      about: def.about,
      theme: def.theme,
      featureOverrides: def.featureOverrides ?? [],
      contact: {
        phone: def.phone,
        whatsapp: def.phone,
        email: def.ownerEmail,
        instagram: def.instagram,
        address: `12, Crystal Arcade, ${def.area}`,
        area: def.area.split(',')[0],
        city: 'Vadodara',
        mapUrl: `https://maps.google.com/?q=${encodeURIComponent(`${def.name} ${def.area}`)}`,
        parking: 'Free parking in front of the building',
      },
      hours: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day) => ({
        day,
        open: '10:30',
        close: day === 'sun' ? '17:00' : '20:00',
        closed: def.plan === 'starter' && day === 'mon',
      })),
      languages: ['en', 'gu', 'hi'],
      seasonalHighlight: 'navratri',
      upiVpa: `${def.slug}@upi`,
      settings: {
        autoConfirmBookings: def.plan !== 'growth',
        googleReviewUrl: `https://search.google.com/local/writereview?placeid=DEMO_${def.slug.toUpperCase()}`,
        aiTryOnCredits: 50,
        stampsForReward: 6,
      },
      createdAt: new Date(now.getTime() - 120 * DAY_MS).toISOString(),
    } as never,
  })) as unknown as { id: ID; slug: string; name: string }
  const tenant = salon.id
  const repo = forTenant(payload, tenant)

  const logo = await upload(payload, tenant, await renderLogo(def.name.slice(0, 1), def.colors.logoBg, def.colors.logoFg), `${def.slug}-logo.png`, 'image/png', 'brand', `${def.name} logo`)
  await payload.update({ collection: 'salons', id: tenant, overrideAccess: true, data: { brand: { logo: logo.id } } as never })

  // Team
  await payload.create({
    collection: 'users',
    overrideAccess: true,
    data: { name: def.ownerName, email: def.ownerEmail, password: opts.ownerPassword, role: 'owner', bookable: false, tenants: [{ tenant }], phone: def.phone } as never,
  })
  const artists: { id: ID; name: string }[] = []
  for (const a of def.artists) {
    const initials = a.name
      .split(' ')
      .map((p) => p[0])
      .join('')
    const avatar = await upload(payload, tenant, await renderAvatar(initials, a.color), `${def.slug}-${initials}.jpg`, 'image/jpeg', 'brand', a.name)
    const email = `${a.name.split(' ')[0].toLowerCase()}@${def.slug}.test`
    const user = (await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: { name: a.name, email, password: opts.ownerPassword, role: 'artist', bookable: true, active: true, specialties: a.specialties, avatar: avatar.id, tenants: [{ tenant }] } as never,
    })) as unknown as { id: ID; name: string }
    artists.push(user)
    await repo.create('availability', {
      staff: user.id,
      breaks: [{ start: '14:00', end: '14:30' }],
    })
  }

  // Menu
  const serviceIds = new Map<string, { id: ID; price: number; minutes: number; category: string; cycleDays?: number }>()
  for (const [i, s] of def.services.entries()) {
    const doc = await repo.create<{ id: ID }>('services', {
      name: s.name,
      category: s.category,
      description: s.description,
      price: rupees(s.price),
      durationMinutes: s.minutes,
      cycleDays: s.cycleDays,
      isAddOn: Boolean(s.isAddOn),
      lastsDays: s.lastsDays,
      aftercare: s.aftercare,
      order: i,
      active: true,
    })
    serviceIds.set(s.name, { id: doc.id, price: rupees(s.price), minutes: s.minutes, category: s.category, cycleDays: s.cycleDays })
  }
  const mains = [...serviceIds.entries()].filter(([, s]) => s.category !== 'add-on' && s.category !== 'removal' && s.category !== 'bridal')
  await repo.create('packages', {
    name: 'Prepaid ₹5,000 → ₹6,000',
    description: 'Pay ₹5,000 today, get ₹6,000 to spend over six months.',
    kind: 'prepaid-credit',
    price: rupees(5000),
    creditValue: rupees(6000),
    validityDays: 180,
    active: true,
  })
  const refill = serviceIds.get('Refill')
  if (refill)
    await repo.create('packages', {
      name: '4 refills bundle',
      description: 'Four refills for the price of three and a half.',
      kind: 'bundle',
      items: [{ service: refill.id, quantity: 4 }],
      price: rupees(4199),
      validityDays: 150,
      active: true,
    })

  // Gallery
  const designIds: { id: ID; title: string; service?: ID; price: number; minutes: number }[] = []
  for (const [i, d] of DESIGNS.slice(0, Math.max(def.designCount, opts.designImages?.length ?? 0)).entries()) {
    const own = opts.designImages?.[i]
    const img = own
      ? await upload(payload, tenant, own.buffer, `${def.slug}-design-${i}.jpg`, own.mimetype ?? 'image/jpeg', 'design', own.title ?? d.title)
      : await upload(payload, tenant, await renderNailSet(d.spec, def.seed * 100 + i, 1000), `${def.slug}-${d.title.toLowerCase().replace(/\W+/g, '-')}.jpg`, 'image/jpeg', 'design', d.title)
    const service = serviceIds.get(d.service) ?? mains[0]?.[1]
    const addOns = (d.addOns ?? []).map((a) => serviceIds.get(a)).filter(Boolean) as { id: ID; price: number; minutes: number }[]
    const price = (service?.price ?? 0) + addOns.reduce((n, a) => n + a.price, 0)
    const minutes = (service?.minutes ?? 0) + addOns.reduce((n, a) => n + a.minutes, 0)
    const doc = await repo.create<{ id: ID }>('designs', {
      title: d.title,
      images: [img.id],
      category: d.category,
      shape: d.shape,
      length: d.length,
      occasions: d.occasions,
      seasons: d.seasons ?? [],
      colors: d.colors,
      service: service?.id,
      addOns: addOns.map((a) => a.id),
      priceFrom: price,
      durationMinutes: minutes,
      artist: artists[i % artists.length]?.id,
      featured: Boolean(d.featured),
      published: true,
      likes: Math.floor(r() * 40),
      createdAt: new Date(now.getTime() - (def.designCount - i) * 4 * DAY_MS).toISOString(),
    })
    designIds.push({ id: doc.id, title: d.title, service: service?.id, price, minutes })
  }

  // Use the best design as the hero cover: real work sells better than a gradient.
  const heroDesign = designIds.find((d) => DESIGNS.find((x) => x.title === d.title)?.featured) ?? designIds[0]
  if (heroDesign) {
    const doc = await repo.findByID<{ images: ID[] }>('designs', heroDesign.id)
    if (doc?.images?.[0]) await payload.update({ collection: 'salons', id: tenant, overrideAccess: true, data: { brand: { logo: logo.id, cover: doc.images[0] } } as never })
  }

  // Customers with 90 days of history
  const count = opts.customers ?? def.customers
  log(`  ${count} customers with history`)
  const customers: { id: ID; name: string; phone: string; source: string }[] = []
  for (let i = 0; i < count; i++) {
    const name = `${pick(r, FIRST_NAMES)} ${pick(r, LAST_NAMES)}`
    const source = weighted(r, SOURCES)
    const phone = `+9198${String(def.seed).padStart(2, '0')}${String(100000 + i).padStart(6, '0')}`
    const joined = new Date(now.getTime() - Math.floor(10 + r() * 110) * DAY_MS)
    const referredBy = source === 'referral' && customers.length > 3 ? pick(r, customers.slice(0, Math.max(1, customers.length - 1))) : null
    const c = await repo.create<{ id: ID }>('customers', {
      name,
      phone,
      source,
      language: r() < 0.2 ? 'gu' : r() < 0.1 ? 'hi' : 'en',
      birthday: r() < 0.6 ? new Date(Date.UTC(1990 + Math.floor(r() * 12), Math.floor(r() * 12), 1 + Math.floor(r() * 27))).toISOString() : undefined,
      consents: { marketing: r() < 0.8, gallery: r() < 0.4, contest: r() < 0.5, source: 'demo' },
      referredBy: referredBy?.id,
      createdAt: joined.toISOString(),
    })
    customers.push({ id: c.id, name, phone, source })
    await repo.create('loyalty-accounts', { customer: c.id, stamps: 0, points: 0, tier: 'member' })
    if (referredBy)
      await repo.create('referrals', {
        referrer: referredBy.id,
        invitee: c.id,
        inviteePhone: phone,
        channel: 'whatsapp',
        status: 'rewarded',
        convertedAt: addDays(joined, 2).toISOString(),
        createdAt: joined.toISOString(),
      })

    // Visit history: first visit soon after joining, then roughly every cycle, with some drop-off.
    const loyalty = r()
    let at = addDays(joined, Math.floor(r() * 4))
    let visitIndex = 0
    let stamps = 0
    let points = 0
    let spend = 0
    let lastVisit: Date | null = null
    let lastCycle = 0
    while (at.getTime() < now.getTime() - DAY_MS) {
      const [svcName, svc] = pick(r, mains)
      const design = r() < 0.5 ? pick(r, designIds) : null
      const artist = pick(r, artists)
      const price = design ? design.price : svc.price
      const minutes = design ? design.minutes : svc.minutes
      const hour = 11 + Math.floor(r() * 8)
      const start = new Date(at)
      start.setUTCHours(hour - 6, 0, 0, 0) // ~IST afternoon
      const apptSource = visitIndex === 0 ? (source === 'walk-in' ? 'walk-in' : source) : r() < 0.55 ? 'reminder' : r() < 0.5 ? 'app' : 'walk-in'
      const appt = await repo.create<{ id: ID }>('appointments', {
        customer: c.id,
        staff: artist.id,
        services: [design?.service ?? svc.id],
        design: design?.id,
        start: start.toISOString(),
        end: new Date(start.getTime() + minutes * 60_000).toISOString(),
        status: 'completed',
        quotedTotal: price,
        source: apptSource,
        preBooked: visitIndex > 0 && r() < 0.35,
        createdAt: new Date(start.getTime() - Math.floor(1 + r() * 6) * DAY_MS).toISOString(),
      })
      const discount = visitIndex === 0 && r() < 0.5 ? rupees(200) : 0
      const visit = await repo.create<{ id: ID }>('visits', {
        customer: c.id,
        appointment: appt.id,
        staff: artist.id,
        lines: [{ service: design?.service ?? svc.id, name: design ? design.title : svcName, price, quantity: 1 }],
        subtotal: price,
        rewardDiscount: discount,
        total: price - discount,
        paymentMode: r() < 0.7 ? 'upi' : 'cash',
        paidStatus: 'paid',
        design: design?.id,
        designName: design?.title,
        isFirstVisit: visitIndex === 0,
        createdAt: new Date(start.getTime() + minutes * 60_000).toISOString(),
      })
      if (r() < 0.65)
        await repo.create('photo-tasks', {
          visit: visit.id,
          customer: c.id,
          staff: artist.id,
          designName: design?.title ?? svcName,
          status: r() < 0.5 ? 'verified' : r() < 0.5 ? 'shared' : 'sent',
          sharedTo: ['whatsapp-status'],
          createdAt: start.toISOString(),
        })
      if (r() < 0.55) {
        const score = r() < 0.85 ? 5 : r() < 0.6 ? 4 : 2
        await repo.create('ratings', {
          visit: visit.id,
          customer: c.id,
          staff: artist.id,
          score,
          comment: score >= 4 && r() < 0.4 ? pick(r, REVIEWS) : undefined,
          googleLinkShown: true,
          followUp: score <= 3 ? (r() < 0.5 ? 'needed' : 'resolved') : 'none',
          createdAt: addDays(start, 0).toISOString(),
        })
      }
      if (visitIndex > 0 && apptSource === 'reminder')
        await repo.create('messages', {
          customer: c.id,
          to: phone,
          template: 'refill_due',
          category: 'utility',
          language: 'en',
          body: 'Your nails are due for a refill today.',
          status: 'sent',
          provider: 'demo',
          cost: 12,
          createdAt: new Date(start.getTime() - 3 * DAY_MS).toISOString(),
        })
      stamps = (stamps + 1) % 6
      points += Math.floor((price - discount) / 10000) * 5
      spend += price - discount
      lastVisit = new Date(start.getTime() + minutes * 60_000)
      lastCycle = svc.cycleDays ?? 30
      visitIndex++
      // Loyal customers come back on cycle; others drift or stop.
      if (r() > 0.35 + loyalty * 0.6) break
      at = addDays(at, lastCycle + Math.floor(r() * (loyalty > 0.6 ? 6 : 20)))
    }
    if (visitIndex > 0) {
      await repo.update('customers', c.id, {
        visitCount: visitIndex,
        lifetimeSpend: spend,
        lastVisitAt: lastVisit?.toISOString(),
        nextDueDate: lastVisit ? addDays(lastVisit, lastCycle).toISOString() : null,
      })
      const account = await repo.findOne<{ id: ID }>('loyalty-accounts', { customer: { equals: c.id } })
      if (account) await repo.update('loyalty-accounts', account.id, { stamps, points, tier: visitIndex >= 10 ? 'gold' : visitIndex >= 4 ? 'silver' : 'member', lifetimeStamps: visitIndex })
    }
  }

  // Upcoming appointments (today and the next week)
  for (let d = 0; d < 7; d++) {
    const date = new Date(now.getTime() + d * DAY_MS).toISOString().slice(0, 10)
    const perDay = d === 0 ? 5 : 2 + Math.floor(r() * 4)
    for (let k = 0; k < perDay; k++) {
      const artist = artists[k % artists.length]
      const [, svc] = pick(r, mains)
      const start = zonedDateTime(date, `${String(11 + k * 2).padStart(2, '0')}:00`, 'Asia/Kolkata')
      if (start.getTime() < now.getTime() + 30 * 60_000 && d === 0) continue
      const customer = pick(r, customers)
      await repo.create('appointments', {
        customer: customer.id,
        staff: artist.id,
        services: [svc.id],
        start: start.toISOString(),
        end: new Date(start.getTime() + svc.minutes * 60_000).toISOString(),
        status: d === 0 || r() < 0.8 ? 'confirmed' : 'requested',
        quotedTotal: svc.price,
        source: weighted(r, SOURCES),
      })
    }
  }

  // Offers, contest, tracking links
  await repo.create('offers', {
    title: 'Navratri special: free stones on any garba design',
    description: 'Book any Navratri design and get stones & charms free. Limited slots every evening.',
    kind: 'festival',
    valueType: 'freebie',
    value: 0,
    freebie: 'Stones & charms',
    audience: ['new', 'regular', 'due', 'at-risk', 'lapsed'],
    status: 'live',
    code: shortCode(6),
    startsAt: new Date(now.getTime() - 2 * DAY_MS).toISOString(),
    endsAt: new Date(now.getTime() + 9 * DAY_MS).toISOString(),
    showOnHome: true,
    claims: 14,
  })
  if (def.plan !== 'starter') {
    await repo.create('offers', {
      title: 'Tuesday 2–5 pm: 20% off gel polish',
      description: 'Quiet afternoon? Treat yourself. 20% off any gel polish this Tuesday afternoon.',
      kind: 'slot-filler',
      valueType: 'percent',
      value: 20,
      audience: ['due', 'at-risk'],
      status: 'live',
      code: shortCode(6),
      startsAt: new Date(now.getTime() - DAY_MS).toISOString(),
      endsAt: new Date(now.getTime() + 4 * DAY_MS).toISOString(),
      showOnHome: true,
      claims: 6,
    })
    const contest = await repo.create<{ id: ID }>('contests', {
      title: 'Nail of the Month: October',
      theme: 'Navratri special',
      prize: 'A free nail art set',
      startsAt: new Date(now.getTime() - 10 * DAY_MS).toISOString(),
      endsAt: new Date(now.getTime() + 20 * DAY_MS).toISOString(),
      status: 'open',
    })
    for (const [i, d] of designIds.slice(0, 6).entries()) {
      const design = await repo.findByID<{ images: ID[] }>('designs', d.id)
      await repo.create('contest-entries', {
        contest: contest.id,
        customer: customers[i * 3]?.id ?? customers[0].id,
        photo: design?.images?.[0],
        designName: d.title,
        votes: Math.floor(5 + r() * 60),
      })
    }
  }
  for (const [label, source, target] of [
    ['Instagram bio', 'instagram', '/'],
    ['Mirror QR', 'qr', '/chair'],
    ['Window poster', 'poster', '/designs'],
    ['Aftercare card', 'qr', '/care'],
  ] as const)
    await repo.create('tracking-links', { label, source, target, code: `${def.slug.slice(0, 3)}${shortCode(3).toLowerCase()}`, clicks: Math.floor(20 + r() * 300) })

  await recomputeSegments(payload, tenant, now)
  log(`  done ${def.slug}`)
  return salon
}
