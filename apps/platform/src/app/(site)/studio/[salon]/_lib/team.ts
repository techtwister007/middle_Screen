import 'server-only'
import type { ID } from '@salon/core'
import type { Payload } from 'payload'

export interface TeamMember {
  id: ID
  name: string
  role: string
  bookable?: boolean | null
  active?: boolean | null
  phone?: string | null
}

/** Everyone on the salon's team (users are platform-wide, filtered by their tenants list). */
export const teamOf = async (payload: Payload, salonId: ID, opts: { bookableOnly?: boolean } = {}) => {
  const res = await payload.find({
    collection: 'users',
    overrideAccess: true,
    depth: 0,
    limit: 100,
    sort: 'name',
    where: {
      and: [{ 'tenants.tenant': { equals: salonId } }, { active: { not_equals: false } }, ...(opts.bookableOnly ? [{ bookable: { equals: true } }] : [])],
    },
  })
  return (res.docs as unknown as TeamMember[]).map((m) => ({ id: m.id, name: m.name, role: m.role, phone: m.phone ?? null }))
}
