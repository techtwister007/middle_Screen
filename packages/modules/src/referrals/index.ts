import { defineModule, emit, forTenant, type ID, idOf, normalizePhone, salonLink } from '@salon/core'
import type { CollectionConfig, Payload } from 'payload'
import { salonData } from '../_shared/access'

export const Referrals: CollectionConfig = {
  slug: 'referrals',
  admin: { defaultColumns: ['referrer', 'inviteePhone', 'status', 'createdAt'] },
  access: salonData,
  fields: [
    { name: 'referrer', type: 'relationship', relationTo: 'customers', required: true, index: true },
    { name: 'invitee', type: 'relationship', relationTo: 'customers', index: true },
    { name: 'inviteePhone', type: 'text', index: true },
    { name: 'channel', type: 'select', defaultValue: 'whatsapp', options: ['whatsapp', 'status', 'instagram', 'link', 'qr'] },
    { name: 'status', type: 'select', defaultValue: 'sent', index: true, options: ['sent', 'joined', 'visited', 'rewarded', 'rejected'] },
    { name: 'convertedAt', type: 'date' },
    { name: 'rejectReason', type: 'text' },
  ],
}

interface CustomerDoc {
  id: ID
  name?: string | null
  phone: string
  referralCode?: string | null
  referredBy?: ID | { id: ID } | null
}

/** The customer's personal invite link: friends who join through it get a welcome gift. */
export const inviteLink = (salonSlug: string, referralCode: string) => salonLink(salonSlug, `/r/${referralCode}`)

export const inviteMessage = (salonName: string, firstName: string, amountText: string, link: string) =>
  `${firstName} sent you a gift 🎁 ${amountText} off your first visit at ${salonName}. Book here: ${link}`

export const recordInvite = async (payload: Payload, tenant: ID, referrerId: ID, channel = 'whatsapp', inviteePhone?: string) => {
  const referral = await forTenant(payload, tenant).create<{ id: ID }>('referrals', {
    referrer: referrerId,
    inviteePhone: inviteePhone ? (normalizePhone(inviteePhone) ?? undefined) : undefined,
    channel,
    status: 'sent',
  })
  await emit(payload, { tenant, type: 'referral.sent', payload: { referralId: referral.id, referrerId }, actorType: 'customer', actorId: referrerId })
  return referral
}

/** Monthly leaderboard: referrers ranked by friends who actually visited. */
export const leaderboard = async (payload: Payload, tenant: ID, since: Date) => {
  const res = await forTenant(payload, tenant).find<{ referrer: ID | { id: ID; name?: string } }>('referrals', {
    where: { and: [{ status: { in: ['visited', 'rewarded'] } }, { convertedAt: { greater_than_equal: since.toISOString() } }] },
    limit: 5000,
    depth: 1,
  })
  const counts = new Map<string, { id: ID; name: string; count: number }>()
  for (const r of res.docs) {
    const ref = r.referrer as { id: ID; name?: string }
    const key = String(ref.id ?? r.referrer)
    const row = counts.get(key) ?? { id: ref.id ?? (r.referrer as ID), name: ref.name ?? 'A customer', count: 0 }
    row.count++
    counts.set(key, row)
  }
  return [...counts.values()].sort((a, b) => b.count - a.count)
}

export const referralsModule = defineModule({
  key: 'referrals',
  feature: 'referrals',
  collections: [Referrals],
  tenantCollections: ['referrals'],
  on: {
    'customer.registered': async ({ payload, event }) => {
      if (!event.payload.referralCode) return
      const repo = forTenant(payload, event.tenant)
      const invitee = await repo.findByID<CustomerDoc>('customers', event.payload.customerId)
      const referrerId = idOf(invitee?.referredBy)
      if (!invitee || !referrerId) return
      // Match a pending invite to this phone, else record the join against the referrer.
      const pending = await repo.findOne<{ id: ID }>('referrals', {
        and: [{ referrer: { equals: referrerId } }, { inviteePhone: { equals: invitee.phone } }, { status: { equals: 'sent' } }],
      })
      if (pending) await repo.update('referrals', pending.id, { invitee: invitee.id, status: 'joined' })
      else await repo.create('referrals', { referrer: referrerId, invitee: invitee.id, inviteePhone: invitee.phone, channel: 'link', status: 'joined' })
    },
    'visit.completed': async ({ payload, event }) => {
      if (!event.payload.isFirstVisit) return
      const repo = forTenant(payload, event.tenant)
      const referral = await repo.findOne<{ id: ID; referrer: ID | { id: ID }; status: string }>('referrals', {
        and: [{ invitee: { equals: event.payload.customerId } }, { status: { equals: 'joined' } }],
      })
      if (!referral) return
      await repo.update('referrals', referral.id, { status: 'rewarded', convertedAt: new Date().toISOString() })
      await emit(payload, {
        tenant: event.tenant,
        type: 'referral.converted',
        payload: { referralId: referral.id, referrerId: idOf(referral.referrer) as ID, inviteeId: event.payload.customerId },
      })
    },
  },
})
