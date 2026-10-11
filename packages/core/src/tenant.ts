import type { Payload, Where } from 'payload'
import { type FeatureKey, type FeatureOverride, isEnabled, type Plan } from './features'
import type { ID } from './module'

/** The tenant (salon) field name added by the multi-tenant plugin to every salon-scoped collection. */
export const TENANT_FIELD = 'tenant'

const withTenant = (tenant: ID, where?: Where): Where =>
  where ? { and: [{ [TENANT_FIELD]: { equals: tenant } }, where] } : { [TENANT_FIELD]: { equals: tenant } }

type AnyDoc = Record<string, unknown> & { id: ID }

/**
 * Server-side data access that is ALWAYS scoped to one salon.
 * Public pages, event handlers and jobs must use this instead of raw `payload.find`
 * so a query can never return another salon's documents.
 */
export const forTenant = (payload: Payload, tenant: ID) => {
  const assertOwned = (doc: AnyDoc | null) => {
    if (!doc) return null
    const owner = doc[TENANT_FIELD]
    const ownerId = owner && typeof owner === 'object' ? (owner as { id: ID }).id : owner
    if (String(ownerId) !== String(tenant)) return null
    return doc
  }

  return {
    tenant,
    async find<T = AnyDoc>(collection: string, args: { where?: Where; sort?: string; limit?: number; page?: number; depth?: number } = {}) {
      const res = await payload.find({
        collection: collection as never,
        overrideAccess: true,
        depth: args.depth ?? 0,
        limit: args.limit ?? 100,
        page: args.page,
        sort: args.sort,
        where: withTenant(tenant, args.where),
      })
      return res as unknown as { docs: T[]; totalDocs: number; hasNextPage: boolean }
    },
    async findOne<T = AnyDoc>(collection: string, where: Where, depth = 0): Promise<T | null> {
      const res = await payload.find({
        collection: collection as never,
        overrideAccess: true,
        depth,
        limit: 1,
        where: withTenant(tenant, where),
      })
      return (res.docs[0] as unknown as T) ?? null
    },
    async findByID<T = AnyDoc>(collection: string, id: ID, depth = 0): Promise<T | null> {
      try {
        const doc = await payload.findByID({ collection: collection as never, id, depth, overrideAccess: true })
        return assertOwned(doc as unknown as AnyDoc) as T | null
      } catch {
        return null
      }
    },
    async count(collection: string, where?: Where) {
      const res = await payload.count({ collection: collection as never, overrideAccess: true, where: withTenant(tenant, where) })
      return res.totalDocs
    },
    async create<T = AnyDoc>(collection: string, data: Record<string, unknown>): Promise<T> {
      const doc = await payload.create({
        collection: collection as never,
        overrideAccess: true,
        data: { ...data, [TENANT_FIELD]: tenant } as never,
      })
      return doc as unknown as T
    },
    async update<T = AnyDoc>(collection: string, id: ID, data: Record<string, unknown>): Promise<T | null> {
      const existing = await this.findByID(collection, id)
      if (!existing) return null
      const { [TENANT_FIELD]: _ignored, ...rest } = data
      const doc = await payload.update({ collection: collection as never, id, overrideAccess: true, data: rest as never })
      return doc as unknown as T
    },
    async delete(collection: string, id: ID) {
      const existing = await this.findByID(collection, id)
      if (!existing) return false
      await payload.delete({ collection: collection as never, id, overrideAccess: true })
      return true
    },
  }
}

export type TenantRepo = ReturnType<typeof forTenant>

/** Extracts an ID from a relationship value that may be populated or not. */
export const idOf = (value: unknown): ID | null => {
  if (value == null) return null
  if (typeof value === 'object') return ((value as { id?: ID }).id ?? null) as ID | null
  return value as ID
}

export interface SalonRow {
  id: ID
  name: string
  slug: string
  status: string
  plan: Plan
  timezone?: string | null
  featureOverrides?: FeatureOverride[] | null
  settings?: Record<string, unknown> | null
}

/** Salons a scheduled job should work on: not suspended and, if given, with the feature switched on. */
export const liveSalons = async (payload: Payload, feature?: FeatureKey): Promise<SalonRow[]> => {
  const res = await payload.find({
    collection: 'salons' as never,
    where: { status: { not_equals: 'suspended' } },
    limit: 5000,
    depth: 0,
    overrideAccess: true,
  })
  const salons = res.docs as unknown as SalonRow[]
  if (!feature) return salons
  return salons.filter((s) => isEnabled(s, feature))
}
