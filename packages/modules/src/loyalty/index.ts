import { addDays, defineModule, emit, forTenant, type ID, idOf, type Paise, shortCode } from '@salon/core'
import type { CollectionConfig, Payload } from 'payload'
import { salonData } from '../_shared/access'
import { moneyField } from '../_shared/fields'
import { applyBudget, estimatedCost, nextVisitReward, pointsFor, type RewardSpec, rewardDiscount, tierFor } from './rules'

export const LoyaltyAccounts: CollectionConfig = {
  slug: 'loyalty-accounts',
  admin: { defaultColumns: ['customer', 'stamps', 'points', 'tier'] },
  access: salonData,
  fields: [
    { name: 'customer', type: 'relationship', relationTo: 'customers', required: true, index: true },
    { name: 'stamps', type: 'number', defaultValue: 0 },
    { name: 'points', type: 'number', defaultValue: 0 },
    { name: 'tier', type: 'select', defaultValue: 'member', options: ['member', 'silver', 'gold'] },
    { name: 'lifetimeStamps', type: 'number', defaultValue: 0 },
    { name: 'walletPassId', type: 'text' },
  ],
}

export const REWARD_KINDS = ['first-visit', 'next-visit', 'stamp-card', 'birthday', 'referral', 'winback', 'offer', 'contest', 'manual'] as const

export const Rewards: CollectionConfig = {
  slug: 'rewards',
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'customer', 'kind', 'status', 'validTo'] },
  access: salonData,
  fields: [
    { name: 'customer', type: 'relationship', relationTo: 'customers', required: true, index: true },
    { name: 'kind', type: 'select', required: true, options: [...REWARD_KINDS], index: true },
    { name: 'title', type: 'text', required: true },
    { name: 'valueType', type: 'select', required: true, defaultValue: 'amount', options: ['amount', 'percent', 'freebie'] },
    { name: 'value', type: 'number', defaultValue: 0, admin: { description: 'Paise for amount, whole number for percent' } },
    { name: 'freebie', type: 'text' },
    moneyField('minSpend'),
    { name: 'isDiscount', type: 'checkbox', defaultValue: true },
    { name: 'scratch', type: 'checkbox', defaultValue: false, admin: { description: 'Revealed by a scratch card' } },
    { name: 'revealed', type: 'checkbox', defaultValue: true },
    { name: 'code', type: 'text', index: true },
    { name: 'validFrom', type: 'date' },
    { name: 'validTo', type: 'date', index: true },
    { name: 'status', type: 'select', defaultValue: 'active', index: true, options: ['active', 'redeemed', 'expired', 'cancelled'] },
    { name: 'redeemedVisit', type: 'relationship', relationTo: 'visits' },
    { name: 'source', type: 'text' },
  ],
}

interface SalonSettings {
  stampsForReward?: number
  pointsPer100?: number
  silverAfterVisits?: number
  goldAfterVisits?: number
  discountBudgetPercent?: number
  firstVisitDiscount?: number
  referralFriendReward?: number
  referralReferrerReward?: number
}

const settingsOf = async (payload: Payload, tenant: ID) => {
  const salon = (await payload.findByID({ collection: 'salons' as never, id: tenant, depth: 0, overrideAccess: true })) as {
    settings?: SalonSettings
  }
  const s = salon.settings ?? {}
  return {
    stampsForReward: s.stampsForReward ?? 6,
    pointsPer100: s.pointsPer100 ?? 5,
    silverAfterVisits: s.silverAfterVisits ?? 4,
    goldAfterVisits: s.goldAfterVisits ?? 10,
    discountBudgetPercent: s.discountBudgetPercent ?? 5,
    firstVisitDiscount: s.firstVisitDiscount ?? 20000,
    referralFriendReward: s.referralFriendReward ?? 20000,
    referralReferrerReward: s.referralReferrerReward ?? 20000,
  }
}

interface AccountDoc {
  id: ID
  customer: ID | { id: ID }
  stamps: number
  points: number
  tier: string
  lifetimeStamps?: number
}

export interface RewardDoc {
  id: ID
  customer: ID | { id: ID }
  kind: string
  title: string
  valueType: 'amount' | 'percent' | 'freebie'
  value: number
  freebie?: string | null
  minSpend?: number | null
  isDiscount?: boolean | null
  scratch?: boolean | null
  revealed?: boolean | null
  code?: string | null
  validFrom?: string | null
  validTo?: string | null
  status: string
}

export const getAccount = async (payload: Payload, tenant: ID, customerId: ID): Promise<AccountDoc> => {
  const repo = forTenant(payload, tenant)
  const existing = await repo.findOne<AccountDoc>('loyalty-accounts', { customer: { equals: customerId } })
  if (existing) return existing
  return repo.create<AccountDoc>('loyalty-accounts', { customer: customerId, stamps: 0, points: 0, tier: 'member' })
}

export const issueReward = async (
  payload: Payload,
  tenant: ID,
  customerId: ID,
  spec: RewardSpec & { kind: (typeof REWARD_KINDS)[number]; validDays?: number; validFrom?: Date; scratch?: boolean; minSpend?: Paise; source?: string },
) => {
  const from = spec.validFrom ?? new Date()
  const reward = await forTenant(payload, tenant).create<RewardDoc>('rewards', {
    customer: customerId,
    kind: spec.kind,
    title: spec.title,
    valueType: spec.valueType,
    value: spec.value,
    freebie: spec.freebie,
    isDiscount: spec.isDiscount,
    minSpend: spec.minSpend ?? 0,
    scratch: Boolean(spec.scratch),
    revealed: !spec.scratch,
    code: shortCode(6),
    validFrom: from.toISOString(),
    validTo: addDays(from, spec.validDays ?? 30).toISOString(),
    status: 'active',
    source: spec.source,
  })
  await emit(payload, { tenant, type: 'reward.issued', payload: { rewardId: reward.id, customerId, kind: spec.kind } })
  return reward
}

/** Discount value of a reward on a given bill (0 for freebies or invalid rewards). */
export const previewReward = async (payload: Payload, tenant: ID, rewardId: ID, customerId: ID, subtotal: Paise) => {
  const reward = await forTenant(payload, tenant).findByID<RewardDoc>('rewards', rewardId)
  if (!reward || String(idOf(reward.customer)) !== String(customerId)) return { reward: null, discount: 0 }
  return { reward, discount: rewardDiscount(reward, subtotal) }
}

export const activeRewards = async (payload: Payload, tenant: ID, customerId: ID) =>
  (
    await forTenant(payload, tenant).find<RewardDoc>('rewards', {
      where: {
        and: [{ customer: { equals: customerId } }, { status: { equals: 'active' } }, { validTo: { greater_than: new Date().toISOString() } }],
      },
      sort: 'validTo',
    })
  ).docs

export const revealScratchCard = async (payload: Payload, tenant: ID, rewardId: ID, customerId: ID) => {
  const repo = forTenant(payload, tenant)
  const reward = await repo.findByID<RewardDoc>('rewards', rewardId)
  if (!reward || String(idOf(reward.customer)) !== String(customerId)) return null
  if (!reward.revealed) await repo.update('rewards', rewardId, { revealed: true })
  return { ...reward, revealed: true }
}

/** Discount value issued this month vs the salon's budget (percent of this month's revenue). */
const discountBudget = async (payload: Payload, tenant: ID, budgetPercent: number) => {
  const repo = forTenant(payload, tenant)
  const monthStart = new Date()
  monthStart.setUTCDate(1)
  monthStart.setUTCHours(0, 0, 0, 0)
  const visits = await repo.find<{ total: number }>('visits', {
    where: { createdAt: { greater_than_equal: monthStart.toISOString() } },
    limit: 5000,
  })
  const revenue = visits.docs.reduce((n, v) => n + (v.total ?? 0), 0)
  const issued = await repo.find<{ valueType: string; value: number }>('rewards', {
    where: { and: [{ createdAt: { greater_than_equal: monthStart.toISOString() } }, { isDiscount: { equals: true } }] },
    limit: 5000,
  })
  const average = visits.docs.length ? Math.round(revenue / visits.docs.length) : 150000
  const spent = issued.docs.reduce((n, r) => n + (r.valueType === 'amount' ? r.value : Math.round((average * r.value) / 100)), 0)
  // Allow a small floor so brand-new salons can still issue a few rewards.
  const budget = Math.max(Math.round((revenue * budgetPercent) / 100), 100000)
  return { spent, budget, average }
}

export const loyaltyModule = defineModule({
  key: 'loyalty',
  feature: 'loyalty',
  collections: [LoyaltyAccounts, Rewards],
  tenantCollections: ['loyalty-accounts', 'rewards'],
  on: {
    'customer.registered': async ({ payload, event }) => {
      await getAccount(payload, event.tenant, event.payload.customerId)
      // Imported customers are existing clients: no "first visit" gift.
      if (event.payload.source === 'import') return
      const s = await settingsOf(payload, event.tenant)
      if (s.firstVisitDiscount > 0 && !event.payload.referralCode) {
        await issueReward(payload, event.tenant, event.payload.customerId, {
          kind: 'first-visit',
          title: `₹${s.firstVisitDiscount / 100} off your first visit`,
          valueType: 'amount',
          value: s.firstVisitDiscount,
          isDiscount: true,
          validDays: 60,
        })
      }
      if (event.payload.referralCode) {
        // The friend's welcome gift. The referrer is rewarded only after the friend's first visit.
        await issueReward(payload, event.tenant, event.payload.customerId, {
          kind: 'referral',
          title: `₹${s.referralFriendReward / 100} off your first visit, from a friend`,
          valueType: 'amount',
          value: s.referralFriendReward,
          isDiscount: true,
          validDays: 60,
        })
      }
    },
    'visit.completed': async ({ payload, event }) => {
      const repo = forTenant(payload, event.tenant)
      const s = await settingsOf(payload, event.tenant)
      const account = await getAccount(payload, event.tenant, event.payload.customerId)
      const visit = await repo.findByID<{ id: ID; reward?: ID | { id: ID } | null; rewardDiscount?: number }>('visits', event.payload.visitId)

      // Redeem the reward used on this bill.
      const usedRewardId = idOf(visit?.reward)
      if (usedRewardId) {
        const used = await repo.findByID<RewardDoc>('rewards', usedRewardId)
        if (used && used.status === 'active') {
          await repo.update('rewards', usedRewardId, { status: 'redeemed', redeemedVisit: event.payload.visitId })
          await emit(payload, { tenant: event.tenant, type: 'reward.redeemed', payload: { rewardId: usedRewardId, customerId: event.payload.customerId } })
        }
      }

      // Stamps, points, tier.
      let stamps = account.stamps + 1
      const customer = await repo.findByID<{ visitCount?: number }>('customers', event.payload.customerId)
      const visitCount = Math.max(customer?.visitCount ?? 0, 1)
      const tier = tierFor(visitCount, s)
      if (stamps >= s.stampsForReward) {
        stamps = 0
        await issueReward(payload, event.tenant, event.payload.customerId, {
          kind: 'stamp-card',
          title: 'Stamp card complete: free nail art set',
          valueType: 'freebie',
          value: 0,
          freebie: 'Nail art set',
          isDiscount: false,
          validDays: 90,
        })
      }
      await repo.update('loyalty-accounts', account.id, {
        stamps,
        lifetimeStamps: (account.lifetimeStamps ?? 0) + 1,
        points: account.points + pointsFor(event.payload.total, s.pointsPer100),
        tier,
      })

      // Scratch card: the next-visit reward, valid inside the service cycle.
      const services = await repo.find<{ category?: string; cycleDays?: number | null }>('services', {
        where: { id: { in: event.payload.serviceIds } },
      })
      const cycle = Math.min(...services.docs.map((x) => x.cycleDays || 30), 45)
      const { spent, budget, average } = await discountBudget(payload, event.tenant, s.discountBudgetPercent)
      let spec = nextVisitReward({ categories: services.docs.map((x) => x.category ?? '') }, Math.random())
      spec = applyBudget(spec, spent, budget, estimatedCost(spec, average))
      await issueReward(payload, event.tenant, event.payload.customerId, {
        ...spec,
        kind: 'next-visit',
        scratch: true,
        validFrom: new Date(),
        validDays: Math.max(14, cycle),
      })
    },
    'referral.converted': async ({ payload, event }) => {
      const s = await settingsOf(payload, event.tenant)
      await issueReward(payload, event.tenant, event.payload.referrerId, {
        kind: 'referral',
        title: `₹${s.referralReferrerReward / 100} off: thank you for the referral`,
        valueType: 'amount',
        value: s.referralReferrerReward,
        isDiscount: true,
        validDays: 90,
      })
    },
    'offer.claimed': async ({ payload, event }) => {
      const offer = await forTenant(payload, event.tenant).findByID<{
        id: ID
        title: string
        valueType: 'amount' | 'percent' | 'freebie'
        value: number
        freebie?: string | null
        endsAt?: string | null
      }>('offers', event.payload.offerId)
      if (!offer) return
      const days = offer.endsAt ? Math.max(1, Math.ceil((new Date(offer.endsAt).getTime() - Date.now()) / 86_400_000)) : 30
      await issueReward(payload, event.tenant, event.payload.customerId, {
        kind: 'offer',
        title: offer.title,
        valueType: offer.valueType,
        value: offer.value,
        freebie: offer.freebie ?? undefined,
        isDiscount: offer.valueType !== 'freebie',
        validDays: days,
        source: `offer:${offer.id}`,
      })
    },
    'contest.won': async ({ payload, event }) => {
      await issueReward(payload, event.tenant, event.payload.customerId, {
        kind: 'contest',
        title: 'Nail of the Month winner: free set',
        valueType: 'freebie',
        value: 0,
        freebie: 'Free nail set',
        isDiscount: false,
        validDays: 60,
        source: `contest:${event.payload.contestId}`,
      })
    },
    'share.verified': async ({ payload, event }) => {
      const account = await getAccount(payload, event.tenant, event.payload.customerId)
      await forTenant(payload, event.tenant).update('loyalty-accounts', account.id, { points: account.points + 20 })
    },
  },
  recurring: [
    {
      slug: 'loyalty-birthdays-and-expiry',
      cron: '0 3 * * *', // 08:30 IST
      handler: async ({ payload }) => {
        const now = new Date()
        const month = now.getUTCMonth()
        const salons = await payload.find({ collection: 'salons' as never, limit: 1000, depth: 0, overrideAccess: true })
        for (const salon of salons.docs as { id: ID }[]) {
          const repo = forTenant(payload, salon.id)
          // Expire old rewards.
          const expired = await repo.find<{ id: ID }>('rewards', {
            where: { and: [{ status: { equals: 'active' } }, { validTo: { less_than: now.toISOString() } }] },
            limit: 1000,
          })
          for (const r of expired.docs) await repo.update('rewards', r.id, { status: 'expired' })
          // Birthday-month treat, once a year, on the first run of the birthday month.
          const withBirthday = await repo.find<{ id: ID; birthday?: string }>('customers', {
            where: { birthday: { exists: true } },
            limit: 5000,
          })
          for (const c of withBirthday.docs) {
            if (!c.birthday || new Date(c.birthday).getUTCMonth() !== month) continue
            const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1)).toISOString()
            const already = await repo.count('rewards', {
              and: [{ customer: { equals: c.id } }, { kind: { equals: 'birthday' } }, { createdAt: { greater_than: yearStart } }],
            })
            if (already) continue
            await issueReward(payload, salon.id, c.id, {
              kind: 'birthday',
              title: 'Birthday treat: free nail art + 15% off',
              valueType: 'percent',
              value: 15,
              freebie: 'Nail art',
              isDiscount: true,
              validDays: 31,
            })
          }
        }
      },
    },
  ],
})

export * from './rules'
