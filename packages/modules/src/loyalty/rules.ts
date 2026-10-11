import type { Paise } from '@salon/core'

export type Tier = 'member' | 'silver' | 'gold'

export const tierFor = (visitCount: number, s: { silverAfterVisits: number; goldAfterVisits: number }): Tier =>
  visitCount >= s.goldAfterVisits ? 'gold' : visitCount >= s.silverAfterVisits ? 'silver' : 'member'

export const pointsFor = (amountPaise: Paise, pointsPer100: number) => Math.floor(amountPaise / 10000) * pointsPer100

export type RewardValueType = 'amount' | 'percent' | 'freebie'

export interface RewardSpec {
  title: string
  valueType: RewardValueType
  value: number
  freebie?: string
  /** Discount rewards count against the salon's monthly discount budget; extras do not. */
  isDiscount: boolean
}

export interface CrossSellInput {
  categories: string[]
}

/**
 * Next-visit reward chosen to cross-sell: someone who only does gel is nudged towards extensions,
 * someone without art gets free art. Extras before cash.
 */
export const nextVisitReward = (input: CrossSellInput, roll: number): RewardSpec => {
  const has = (c: string) => input.categories.includes(c)
  if (has('gel') && !has('extensions') && roll < 0.5) return { title: '₹300 off extensions', valueType: 'amount', value: 30000, isDiscount: true }
  if (!has('nail-art') && roll < 0.8) return { title: 'Free art on 2 nails', valueType: 'freebie', value: 0, freebie: 'Art on 2 nails', isDiscount: false }
  if (roll < 0.9) return { title: 'Free cuticle spa', valueType: 'freebie', value: 0, freebie: 'Cuticle spa', isDiscount: false }
  return { title: '10% off your next visit', valueType: 'percent', value: 10, isDiscount: true }
}

/** Swaps a discount for an extra when the monthly discount budget is used up. */
export const applyBudget = (spec: RewardSpec, spentThisMonth: Paise, budget: Paise, estimatedCost: Paise): RewardSpec =>
  spec.isDiscount && spentThisMonth + estimatedCost > budget
    ? { title: 'Free art on 2 nails', valueType: 'freebie', value: 0, freebie: 'Art on 2 nails', isDiscount: false }
    : spec

export interface RewardLike {
  valueType: RewardValueType
  value: number
  minSpend?: Paise | null
  status: string
  validFrom?: string | null
  validTo?: string | null
}

/** Discount a reward gives on a bill. Freebies are applied by staff as a service at ₹0. */
export const rewardDiscount = (reward: RewardLike, subtotal: Paise, now = new Date()): Paise => {
  if (reward.status !== 'active') return 0
  if (reward.validFrom && new Date(reward.validFrom) > now) return 0
  if (reward.validTo && new Date(reward.validTo) < now) return 0
  if (reward.minSpend && subtotal < reward.minSpend) return 0
  if (reward.valueType === 'amount') return Math.min(reward.value, subtotal)
  if (reward.valueType === 'percent') return Math.min(subtotal, Math.round((subtotal * reward.value) / 100))
  return 0
}

export const estimatedCost = (spec: RewardSpec, averageBill: Paise): Paise =>
  spec.valueType === 'amount' ? spec.value : spec.valueType === 'percent' ? Math.round((averageBill * spec.value) / 100) : 0
