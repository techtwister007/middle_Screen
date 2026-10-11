import 'server-only'
import type { ID } from '@salon/core'
import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { cache } from 'react'
import { getPayloadClient } from './payload'
import { type SalonRecord, getSalonBySlug } from './salon'

export type StaffRole = 'platform-admin' | 'owner' | 'manager' | 'artist'

export interface StaffUser {
  id: ID
  name: string
  email: string
  role: StaffRole
  tenants?: { tenant: ID | { id: ID; slug?: string; name?: string } }[]
}

export const getStaffUser = cache(async (): Promise<StaffUser | null> => {
  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers: await headers() })
  if (!user || (user as { collection?: string }).collection !== 'users') return null
  return user as unknown as StaffUser
})

export const staffSalonIds = (user: StaffUser) =>
  (user.tenants ?? []).map((t) => (typeof t.tenant === 'object' ? t.tenant.id : t.tenant)).map(String)

export const canManage = (user: StaffUser) => ['platform-admin', 'owner', 'manager'].includes(user.role)

/** Loads the salon and the signed-in staff member, enforcing membership and role. */
export const requireStaff = async (slug: string, opts: { manager?: boolean } = {}): Promise<{ salon: SalonRecord; user: StaffUser }> => {
  const user = await getStaffUser()
  if (!user) redirect(`/studio/login?next=${encodeURIComponent(`/studio/${slug}`)}`)
  const salon = await getSalonBySlug(slug)
  if (!salon) notFound()
  const member = user.role === 'platform-admin' || staffSalonIds(user).includes(String(salon.id))
  if (!member) notFound()
  if (opts.manager && !canManage(user)) redirect(`/studio/${slug}/today`)
  return { salon, user }
}

export const requirePlatformAdmin = async () => {
  const user = await getStaffUser()
  if (!user) redirect('/studio/login?next=/console')
  if (user.role !== 'platform-admin') notFound()
  return user
}
