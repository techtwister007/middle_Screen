import { forTenant } from '@salon/core'
import { allCollections, findOrCreateCustomer, requestBooking, tenantCollections } from '@salon/modules'
import { at, createSalon, createService, createStaff, futureDate } from '@salon/testing'
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'
import { payloadForTests } from '../helpers'

/** Collections that are intentionally shared across salons (no tenant field). */
const SHARED = new Set(['salons', 'users', 'audit-log', 'campaign-packs', 'articles', 'city-listings', 'library-designs', 'library-media'])

let payload: Payload
let salonA: { id: number | string }
let salonB: { id: number | string }
let ownerA: Record<string, unknown>

beforeAll(async () => {
  payload = await payloadForTests()
  salonA = await createSalon(payload)
  salonB = await createSalon(payload)
  ownerA = (await createStaff(payload, salonA.id, { role: 'owner' })) as unknown as Record<string, unknown>
  await createStaff(payload, salonB.id, { role: 'owner' })

  // Give salon B real data across many collections.
  const service = await createService(payload, salonB.id)
  await createStaff(payload, salonB.id)
  const { customer } = await findOrCreateCustomer(payload, salonB.id, { phone: '9876500001', name: 'B Customer', marketingConsent: true })
  const date = futureDate(3)
  await requestBooking(payload, salonB.id, { customerId: customer.id, serviceIds: [service.id], start: at(date, '11:00') })
  await createService(payload, salonA.id)
})

describe('tenant isolation', () => {
  it('every collection is either salon-scoped or explicitly shared', () => {
    const scoped = new Set(tenantCollections())
    const unaccounted = allCollections()
      .map((c) => c.slug)
      .filter((slug) => !scoped.has(slug) && !SHARED.has(slug))
    expect(unaccounted).toEqual([])
  })

  it("a salon owner never sees another salon's documents in any scoped collection", async () => {
    const user = { ...ownerA, collection: 'users' }
    for (const slug of tenantCollections()) {
      const res = await payload.find({ collection: slug as never, user: user as never, overrideAccess: false, depth: 0, limit: 500 }).catch((err: Error) => {
        // Collections nobody may list through the API (e.g. login codes) are fine.
        if (err.name === 'Forbidden' || /not allowed/i.test(err.message)) return { docs: [] }
        throw err
      })
      for (const doc of res.docs as { tenant?: unknown }[]) {
        const t = doc.tenant && typeof doc.tenant === 'object' ? (doc.tenant as { id: unknown }).id : doc.tenant
        expect(String(t), `collection ${slug} leaked a document`).toBe(String(salonA.id))
      }
    }
  })

  it("salon B's customers and appointments exist but are invisible to salon A", async () => {
    const user = { ...ownerA, collection: 'users' }
    const bCustomers = await forTenant(payload, salonB.id).count('customers')
    expect(bCustomers).toBeGreaterThan(0)
    const seenByA = await payload.find({ collection: 'customers' as never, user: user as never, overrideAccess: false })
    expect(seenByA.docs).toHaveLength(0)
    const appts = await payload.find({ collection: 'appointments' as never, user: user as never, overrideAccess: false })
    expect(appts.docs).toHaveLength(0)
  })

  it('the tenant repository cannot read another salon by id', async () => {
    const bCustomer = await forTenant(payload, salonB.id).findOne('customers', {})
    expect(bCustomer).not.toBeNull()
    expect(await forTenant(payload, salonA.id).findByID('customers', bCustomer!.id)).toBeNull()
    expect(await forTenant(payload, salonA.id).update('customers', bCustomer!.id, { name: 'hacked' })).toBeNull()
    expect(await forTenant(payload, salonA.id).delete('customers', bCustomer!.id)).toBe(false)
  })

  it('anonymous API requests cannot read customer data', async () => {
    for (const slug of ['customers', 'appointments', 'visits', 'messages', 'rewards', 'payments', 'otp-codes']) {
      const res = await payload.find({ collection: slug as never, overrideAccess: false, depth: 0 }).catch(() => ({ docs: [] as unknown[] }))
      expect(res.docs, slug).toHaveLength(0)
    }
  })

  it('one customer per phone per salon, but the same phone can exist at two salons', async () => {
    const a1 = await findOrCreateCustomer(payload, salonA.id, { phone: '9876500001' })
    const a2 = await findOrCreateCustomer(payload, salonA.id, { phone: '+91 98765 00001' })
    expect(a1.customer.id).toBe(a2.customer.id)
    const b = await forTenant(payload, salonB.id).findOne<{ id: unknown }>('customers', { phone: { equals: '+919876500001' } })
    expect(b?.id).not.toBe(a1.customer.id)
  })
})
