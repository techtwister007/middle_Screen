import { DAY_MS } from '@salon/core'

export type Segment = 'lead' | 'new' | 'regular' | 'due' | 'at-risk' | 'lapsed'

export interface SegmentInput {
  visitCount: number
  nextDueDate?: string | Date | null
  lastVisitAt?: string | Date | null
}

/**
 * Lifecycle segment. "Cycle" is the repeat interval of the customer's last service.
 * Due: cycle reached (0–14 days past). At risk: 15–59 days past. Lapsed: 60+ days past.
 * Customers without a cycle fall back to 60/120 days since the last visit.
 */
export const segmentFor = (c: SegmentInput, now = new Date()): Segment => {
  if (!c.visitCount) return 'lead'
  let daysPast: number | null = null
  if (c.nextDueDate) {
    daysPast = Math.floor((now.getTime() - new Date(c.nextDueDate).getTime()) / DAY_MS)
  } else if (c.lastVisitAt) {
    const since = Math.floor((now.getTime() - new Date(c.lastVisitAt).getTime()) / DAY_MS)
    daysPast = since >= 120 ? 60 : since >= 60 ? 15 : -1
  }
  if (daysPast !== null && daysPast >= 60) return 'lapsed'
  if (daysPast !== null && daysPast >= 15) return 'at-risk'
  if (daysPast !== null && daysPast >= 0) return 'due'
  return c.visitCount === 1 ? 'new' : 'regular'
}

/** Spend threshold for the top 10% (VIP). */
export const vipThreshold = (spends: number[]): number => {
  const sorted = spends.filter((s) => s > 0).sort((a, b) => b - a)
  if (sorted.length === 0) return Number.POSITIVE_INFINITY
  const index = Math.max(0, Math.ceil(sorted.length * 0.1) - 1)
  return sorted[index]
}

export const nextDueFrom = (visitAt: Date, cycleDays: number[]): Date | null => {
  const cycles = cycleDays.filter((d) => d > 0)
  if (cycles.length === 0) return null
  return new Date(visitAt.getTime() + Math.min(...cycles) * DAY_MS)
}
