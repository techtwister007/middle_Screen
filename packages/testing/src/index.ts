import { type ID, rupees } from '@salon/core'
import type { Payload } from 'payload'

let counter = 0
const uid = () => `${Date.now().toString(36)}${(counter++).toString(36)}`

export const createSalon = async (payload: Payload, overrides: Record<string, unknown> = {}) => {
  const slug = `test-${uid()}`
  return (await payload.create({
    collection: 'salons' as never,
    overrideAccess: true,
    data: {
      name: `Salon ${slug}`,
      slug,
      plan: 'studio',
      status: 'active',
      contact: { phone: '+919800000001', whatsapp: '+919800000001', instagram: 'testsalon', city: 'Vadodara' },
      hours: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map((day) => ({ day, open: '10:00', close: '20:00', closed: false })),
      settings: { autoConfirmBookings: false, googleReviewUrl: 'https://g.page/r/test/review' },
      ...overrides,
    } as never,
  })) as unknown as { id: ID; slug: string; name: string }
}

export const createStaff = async (
  payload: Payload,
  salonId: ID,
  overrides: Record<string, unknown> = {},
) =>
  (await payload.create({
    collection: 'users' as never,
    overrideAccess: true,
    data: {
      name: `Artist ${uid()}`,
      email: `staff-${uid()}@example.com`,
      password: 'test-password-123',
      role: 'artist',
      bookable: true,
      active: true,
      tenants: [{ tenant: salonId }],
      ...overrides,
    } as never,
  })) as unknown as { id: ID; name: string; email: string; role: string }

export const createService = async (payload: Payload, salonId: ID, overrides: Record<string, unknown> = {}) =>
  (await payload.create({
    collection: 'services' as never,
    overrideAccess: true,
    data: {
      tenant: salonId,
      name: 'Gel polish',
      category: 'gel',
      price: rupees(799),
      durationMinutes: 45,
      cycleDays: 21,
      active: true,
      ...overrides,
    } as never,
  })) as unknown as { id: ID; name: string; price: number; durationMinutes: number }

/** Next weekday date (yyyy-MM-dd) at least `days` ahead. */
export const futureDate = (days = 2) => {
  const d = new Date(Date.now() + days * 86_400_000)
  return d.toISOString().slice(0, 10)
}

export const at = (date: string, hhmm: string) => new Date(`${date}T${hhmm}:00+05:30`).toISOString()
