import { DAY_MS } from '@salon/core'

export interface PromoPolicy {
  perWeek: number
  perMonth: number
}

/** Frequency cap for promotional (marketing) messages. Reminders are exempt. */
export const withinPromoCap = (sentAt: Date[], now: Date, policy: PromoPolicy): boolean => {
  const week = sentAt.filter((d) => now.getTime() - d.getTime() < 7 * DAY_MS).length
  const month = sentAt.filter((d) => now.getTime() - d.getTime() < 30 * DAY_MS).length
  return week < policy.perWeek && month < policy.perMonth
}

export type SkipReason = 'no-consent' | 'cap' | 'no-phone' | null

export const shouldSend = (input: {
  category: 'utility' | 'marketing' | 'authentication' | 'service'
  marketingConsent: boolean
  promoHistory: Date[]
  now: Date
  policy: PromoPolicy
  phone?: string | null
}): SkipReason => {
  if (!input.phone) return 'no-phone'
  if (input.category !== 'marketing') return null
  if (!input.marketingConsent) return 'no-consent'
  if (!withinPromoCap(input.promoHistory, input.now, input.policy)) return 'cap'
  return null
}

/**
 * The refill journey for a visit: the offsets (in days from the visit) at which each step fires.
 * A step is skipped at run time if the customer has booked or visited since.
 */
export const refillJourney = (cycleDays: number, t: { refillHeadsUpDays: number; nudgeDays: number; winbackDays: number; lastChanceDays: number }) =>
  [
    { step: 'refill-heads-up', offsetDays: Math.max(1, cycleDays - t.refillHeadsUpDays) },
    { step: 'refill-due', offsetDays: cycleDays },
    { step: 'nudge', offsetDays: cycleDays + t.nudgeDays },
    { step: 'winback', offsetDays: cycleDays + t.winbackDays },
    { step: 'last-chance', offsetDays: cycleDays + t.lastChanceDays },
  ] as const
