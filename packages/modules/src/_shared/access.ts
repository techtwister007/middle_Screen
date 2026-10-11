import type { Access, PayloadRequest } from 'payload'

export type StaffRole = 'platform-admin' | 'owner' | 'manager' | 'artist'

export const roleOf = (req: PayloadRequest): StaffRole | null =>
  ((req.user as { role?: StaffRole } | null)?.role ?? null)

export const isPlatformAdmin = (req: PayloadRequest) => roleOf(req) === 'platform-admin'

/** Any signed-in staff member. Tenant scoping is added on top by the multi-tenant plugin. */
export const staffOnly: Access = ({ req }) => Boolean(req.user)

/** Owners, managers and platform admins. */
export const managersOnly: Access = ({ req }) => {
  const role = roleOf(req)
  return role === 'platform-admin' || role === 'owner' || role === 'manager'
}

export const platformOnly: Access = ({ req }) => isPlatformAdmin(req)

export const nobody: Access = () => false

/** Standard access for salon data: staff read and write, managers delete. */
export const salonData = {
  read: staffOnly,
  create: staffOnly,
  update: staffOnly,
  delete: managersOnly,
}

/** Settings-like data: everyone reads, managers write. */
export const salonConfig = {
  read: staffOnly,
  create: managersOnly,
  update: managersOnly,
  delete: managersOnly,
}
