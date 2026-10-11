import { forTenant, type ID } from '@salon/core'
import type { Payload } from 'payload'
import sharp from 'sharp'
import { beforeAll, describe, expect, it } from 'vitest'
import { parseMenuText } from '@/lib/menuText'
import { createRealSalon, deleteSalonCompletely } from '@/lib/onboarding'
import { NAIL_SERVICES } from '@/seed/content'
import { seedSalon } from '@/seed/demo'
import { payloadForTests } from '../helpers'

let payload: Payload
const uid = () => Math.random().toString(36).slice(2, 7)
const photo = async (color: string) =>
  sharp({ create: { width: 500, height: 500, channels: 3, background: color } })
    .jpeg()
    .toBuffer()

beforeAll(async () => {
  payload = await payloadForTests()
})

describe('real salon onboarding', () => {
  it('creates only what was entered: no sample customers, offers, packages or invented address', async () => {
    const slug = `real-${uid()}`
    const menu = parseMenuText('Gel polish, 800, 45\nNail art per nail, 100, 10').parsed
    const salon = await createRealSalon(payload, {
      name: 'Lotus Nail Lounge',
      slug,
      plan: 'studio',
      theme: 'minimal',
      address: '4 Race Course Road',
      city: 'Vadodara',
      hours: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day) => ({ day, open: '11:00', close: '19:00', closed: day === 'mon' })),
      owner: { name: 'Lata Shah', email: `${slug}@example.com`, password: 'temp-pass-123' },
      artists: ['Mira Joshi'],
      services: menu.map((m) => ({ ...m, isAddOn: m.category === 'add-on' })),
      photos: [{ data: await photo('#d06080'), mimetype: 'image/jpeg', title: 'Rose ombre' }],
      libraryLooks: 0,
    })
    const repo = forTenant(payload, salon.id)
    expect(await repo.count('customers')).toBe(0)
    expect(await repo.count('offers')).toBe(0)
    expect(await repo.count('packages')).toBe(0)
    expect(await repo.count('designs')).toBe(1)
    const services = (await repo.find<{ name: string; isAddOn: boolean }>('services', { limit: 10 })).docs
    expect(services.find((s) => s.name === 'Nail art per nail')?.isAddOn).toBe(true)
    const doc = (await payload.findByID({ collection: 'salons', id: salon.id, overrideAccess: true })) as unknown as {
      contact: { address: string }
      hours: { day: string; open: string; closed: boolean }[]
      brand: { logo: unknown }
    }
    expect(doc.contact.address).toBe('4 Race Course Road')
    expect(doc.hours.find((h) => h.day === 'mon')?.closed).toBe(true)
    expect(doc.brand.logo).toBeTruthy()
  })
})

describe('demo builder', () => {
  it("builds a demo from the prospect's photos and a menu with cheap add-ons, expiring in 7 days", async () => {
    const slug = `demo-${uid()}`
    const menu = parseMenuText('Gel polish, 800, 45\nNail art per nail, 100, 10\nRemoval, 200, 15').parsed
    let created: ID | null = null
    const salon = await seedSalon(
      payload,
      {
        name: 'Lotus Demo',
        slug,
        tagline: 'Demo',
        about: 'Demo',
        theme: 'default',
        plan: 'studio',
        colors: { cover: ['#F6D6DF', '#E8B4C8', '#C77D9E'], logoBg: '#B4537A', logoFg: '#FFFFFF' },
        area: 'Alkapuri, Vadodara',
        instagram: '',
        phone: '+919800000000',
        artists: [{ name: 'Artist One', specialties: [], color: '#B4537A' }],
        services: menu.map((m) => ({ ...m, isAddOn: m.category === 'add-on' })),
        designCount: 3,
        customers: 120,
        ownerEmail: `owner@${slug}.test`,
        ownerName: 'Owner',
        seed: 501,
        status: 'demo',
      },
      {
        ownerPassword: 'temp-pass-123',
        customers: 12,
        designImages: await Promise.all(
          ['#c04060', '#40a0c0', '#e0c050'].map(async (c, i) => ({ buffer: await photo(c), mimetype: 'image/jpeg', title: `Look ${i}` })),
        ),
        onCreated: (id) => {
          created = id
        },
      },
    )
    expect(created).toEqual(salon.id)
    const repo = forTenant(payload, salon.id)
    expect(await repo.count('customers')).toBeGreaterThanOrEqual(12)
    expect(await repo.count('visits', { total: { less_than: 0 } })).toBe(0)
    const doc = (await payload.findByID({ collection: 'salons', id: salon.id, overrideAccess: true })) as unknown as { settings: { demoExpiresAt: string } }
    const days = (new Date(doc.settings.demoExpiresAt).getTime() - Date.now()) / 86_400_000
    expect(days).toBeGreaterThan(6)
    expect(days).toBeLessThan(8)

    await deleteSalonCompletely(payload, salon.id)
    expect(await payload.count({ collection: 'salons', overrideAccess: true, where: { slug: { equals: slug } } })).toEqual({ totalDocs: 0 })
    expect(await repo.count('visits')).toBe(0)
    expect(await repo.count('customers')).toBe(0)
  }, 120_000)

  it('a real salon with no customers can still be seeded with the standard menu', async () => {
    const slug = `empty-${uid()}`
    const salon = await createRealSalon(payload, {
      name: 'Empty',
      slug,
      plan: 'starter',
      theme: 'default',
      hours: [],
      owner: { name: 'O', email: `${slug}@example.com`, password: 'temp-pass-123' },
      artists: [],
      services: NAIL_SERVICES,
      photos: [],
      libraryLooks: 0,
    })
    expect(await forTenant(payload, salon.id).count('services')).toBe(NAIL_SERVICES.length)
  })
})
