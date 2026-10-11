import { defineModule, emit, forTenant, type ID, idOf } from '@salon/core'
import type { CollectionConfig, Payload } from 'payload'
import { salonData } from '../_shared/access'

export const Ratings: CollectionConfig = {
  slug: 'ratings',
  admin: { defaultColumns: ['createdAt', 'customer', 'score', 'followUp'] },
  access: salonData,
  fields: [
    { name: 'visit', type: 'relationship', relationTo: 'visits', index: true },
    { name: 'customer', type: 'relationship', relationTo: 'customers', required: true, index: true },
    { name: 'staff', type: 'relationship', relationTo: 'users' },
    { name: 'score', type: 'number', required: true, min: 1, max: 5 },
    { name: 'comment', type: 'textarea' },
    { name: 'googleLinkShown', type: 'checkbox', defaultValue: false },
    { name: 'followUp', type: 'select', defaultValue: 'none', options: ['none', 'needed', 'called', 'resolved'] },
    { name: 'followUpNote', type: 'textarea' },
  ],
}

/** Answers to "why haven't you come back?" from the last-chance message. */
export const Feedback: CollectionConfig = {
  slug: 'feedback',
  access: salonData,
  fields: [
    { name: 'customer', type: 'relationship', relationTo: 'customers' },
    { name: 'reason', type: 'select', options: ['price', 'quality', 'distance', 'time', 'moved', 'tried-elsewhere', 'other'] },
    { name: 'comment', type: 'textarea' },
  ],
}

export const submitRating = async (payload: Payload, tenant: ID, input: { customerId: ID; visitId?: ID; score: number; comment?: string }) => {
  const repo = forTenant(payload, tenant)
  if (input.visitId) {
    const existing = await repo.findOne<{ id: ID }>('ratings', { visit: { equals: input.visitId } })
    if (existing) return existing
  }
  const visit = input.visitId ? await repo.findByID<{ staff?: ID | { id: ID } | null; customer: ID | { id: ID } }>('visits', input.visitId) : null
  if (visit && String(idOf(visit.customer)) !== String(input.customerId)) throw new Error('Not your visit')
  const score = Math.max(1, Math.min(5, Math.round(input.score)))
  const rating = await repo.create<{ id: ID }>('ratings', {
    visit: input.visitId,
    customer: input.customerId,
    staff: idOf(visit?.staff) ?? undefined,
    score,
    comment: input.comment,
    googleLinkShown: true,
    followUp: score <= 3 ? 'needed' : 'none',
  })
  await emit(payload, {
    tenant,
    type: 'rating.submitted',
    payload: { ratingId: rating.id, customerId: input.customerId, score },
    actorType: 'customer',
    actorId: input.customerId,
  })
  return rating
}

export const reviewsModule = defineModule({
  key: 'reviews',
  feature: 'reviews',
  collections: [Ratings, Feedback],
  tenantCollections: ['ratings', 'feedback'],
})
