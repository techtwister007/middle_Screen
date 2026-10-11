import { defineModule, emit, forTenant, type ID, isEnabled, publicUrl } from '@salon/core'
import { getImageAi } from '@salon/integrations'
import type { CollectionConfig, Payload } from 'payload'
import { salonData } from '../_shared/access'

export const TryOns: CollectionConfig = {
  slug: 'try-ons',
  access: salonData,
  fields: [
    { name: 'customer', type: 'relationship', relationTo: 'customers', index: true },
    { name: 'hand', type: 'upload', relationTo: 'media' },
    { name: 'design', type: 'relationship', relationTo: 'designs' },
    { name: 'resultUrl', type: 'text' },
    { name: 'ai', type: 'checkbox', defaultValue: false },
    { name: 'provider', type: 'text' },
    { name: 'cost', type: 'number', defaultValue: 0 },
  ],
}

export class TryOnError extends Error {
  constructor(
    public code: 'disabled' | 'no-credits' | 'customer-cap' | 'not-found',
    message: string,
  ) {
    super(message)
  }
}

const absolute = (url?: string | null) => (!url ? '' : url.startsWith('http') ? url : `${publicUrl()}${url}`)

/** Remaining AI try-ons for a customer, given salon credits and the per-customer cap. */
export const aiTryOnAllowance = async (payload: Payload, tenant: ID, customerId: ID) => {
  const salon = (await payload.findByID({ collection: 'salons' as never, id: tenant, depth: 0, overrideAccess: true })) as unknown as {
    plan: 'starter' | 'studio' | 'growth'
    featureOverrides?: { feature: never; enabled: boolean }[]
    settings?: { aiTryOnCredits?: number; aiTryOnPerCustomer?: number }
  }
  if (!isEnabled(salon, 'aiTryOn')) return { enabled: false, remaining: 0, salonCredits: 0 }
  const used = await forTenant(payload, tenant).count('try-ons', { and: [{ customer: { equals: customerId } }, { ai: { equals: true } }] })
  const perCustomer = salon.settings?.aiTryOnPerCustomer ?? 3
  const credits = salon.settings?.aiTryOnCredits ?? 0
  return { enabled: true, remaining: Math.max(0, Math.min(perCustomer - used, credits)), salonCredits: credits }
}

export const aiTryOn = async (payload: Payload, tenant: ID, input: { customerId: ID; handMediaId: ID; designId: ID }) => {
  const allowance = await aiTryOnAllowance(payload, tenant, input.customerId)
  if (!allowance.enabled) throw new TryOnError('disabled', 'AI try-on is not available at this salon yet')
  if (allowance.salonCredits <= 0) throw new TryOnError('no-credits', 'AI try-on is taking a break. Try the free preview instead.')
  if (allowance.remaining <= 0) throw new TryOnError('customer-cap', 'You have used all your AI try-ons. Your artist can show you more in the salon!')
  const repo = forTenant(payload, tenant)
  const hand = await repo.findByID<{ url?: string }>('media', input.handMediaId)
  const design = await repo.findByID<{ images?: (ID | { url?: string })[] }>('designs', input.designId, 1)
  const designImage = design?.images?.[0]
  if (!hand || !design || !designImage || typeof designImage !== 'object') throw new TryOnError('not-found', 'Design not found')
  const ai = getImageAi()
  const result = await ai.tryOn({ handImageUrl: absolute(hand.url), designImageUrl: absolute(designImage.url) })
  const record = await repo.create<{ id: ID }>('try-ons', {
    customer: input.customerId,
    hand: input.handMediaId,
    design: input.designId,
    resultUrl: result.imageUrl,
    ai: true,
    provider: result.provider,
    cost: result.cost,
  })
  // Spend one salon credit and log the pass-through cost.
  const salon = (await payload.findByID({ collection: 'salons' as never, id: tenant, depth: 0, overrideAccess: true })) as {
    settings?: Record<string, unknown>
  }
  await payload.update({
    collection: 'salons' as never,
    id: tenant,
    overrideAccess: true,
    data: { settings: { ...(salon.settings ?? {}), aiTryOnCredits: Math.max(0, allowance.salonCredits - 1) } } as never,
  })
  if (result.cost)
    await repo.create('cost-ledger', {
      kind: 'ai-image',
      units: 1,
      unitCost: result.cost,
      total: result.cost,
      period: new Date().toISOString().slice(0, 7),
      reference: `try-on:${record.id}`,
    })
  await emit(payload, { tenant, type: 'tryon.generated', payload: { tryOnId: record.id, customerId: input.customerId, ai: true } })
  return { id: record.id, imageUrl: result.imageUrl, remaining: allowance.remaining - 1 }
}

export const tryOnModule = defineModule({
  key: 'try-on',
  feature: 'tryOn',
  collections: [TryOns],
  tenantCollections: ['try-ons'],
})
