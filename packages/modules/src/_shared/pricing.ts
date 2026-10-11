import type { Paise } from '@salon/core'

export interface PricedItem {
  id: string | number
  name: string
  price: Paise
  durationMinutes: number
  isAddOn?: boolean | null
  requiresDeposit?: 'auto' | 'always' | 'never' | null
}

export interface Quote {
  subtotal: Paise
  durationMinutes: number
  deposit: Paise
  items: PricedItem[]
}

export interface DepositRule {
  depositMinMinutes: number
  depositPercent: number
}

/** Prices a selection of services + add-ons and works out whether a deposit is needed. */
export const quote = (items: PricedItem[], rule: DepositRule): Quote => {
  const subtotal = items.reduce((sum, i) => sum + i.price, 0)
  const durationMinutes = items.reduce((sum, i) => sum + i.durationMinutes, 0)
  const forced = items.some((i) => i.requiresDeposit === 'always')
  const exempt = items.length > 0 && items.every((i) => i.requiresDeposit === 'never')
  const needsDeposit = !exempt && (forced || durationMinutes >= rule.depositMinMinutes)
  const deposit = needsDeposit ? Math.round((subtotal * rule.depositPercent) / 100 / 100) * 100 : 0
  return { subtotal, durationMinutes, deposit, items }
}

/** "1 h 15 min" */
export const formatDuration = (minutes: number): string => {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h && m) return `${h} h ${m} min`
  if (h) return `${h} h`
  return `${m} min`
}
