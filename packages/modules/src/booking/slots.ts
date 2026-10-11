import { MINUTE_MS, minutesFromHHMM, zonedDateTime } from '@salon/core'

export interface TimeRange {
  start: Date
  end: Date
}

export interface StaffDay {
  staffId: string | number
  /** Working window for the day in salon-local "HH:mm", or null when off */
  hours: { open: string; close: string } | null
  breaks?: { start: string; end: string }[]
  /** Absolute time-off ranges (holidays, leave) */
  timeOff?: TimeRange[]
  /** Existing appointments that block time */
  busy: TimeRange[]
}

export interface SlotQuery {
  /** Salon-local date yyyy-MM-dd */
  date: string
  timezone: string
  durationMinutes: number
  stepMinutes: number
  staff: StaffDay[]
  /** No slots before now + lead time */
  now: Date
  minLeadMinutes?: number
}

export interface Slot {
  start: Date
  end: Date
  staffIds: (string | number)[]
}

const overlaps = (a: TimeRange, b: TimeRange) => a.start < b.end && b.start < a.end

/** Computes bookable start times for a date, listing which staff are free for each. */
export const computeSlots = (q: SlotQuery): Slot[] => {
  const earliest = new Date(q.now.getTime() + (q.minLeadMinutes ?? 30) * MINUTE_MS)
  const byStart = new Map<number, Slot>()
  for (const s of q.staff) {
    if (!s.hours) continue
    const open = minutesFromHHMM(s.hours.open)
    const close = minutesFromHHMM(s.hours.close)
    const blocks: TimeRange[] = [
      ...s.busy,
      ...(s.timeOff ?? []),
      ...(s.breaks ?? []).map((b) => ({
        start: zonedDateTime(q.date, b.start, q.timezone),
        end: zonedDateTime(q.date, b.end, q.timezone),
      })),
    ]
    for (let m = open; m + q.durationMinutes <= close; m += q.stepMinutes) {
      const hh = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
      const start = zonedDateTime(q.date, hh, q.timezone)
      const end = new Date(start.getTime() + q.durationMinutes * MINUTE_MS)
      if (start < earliest) continue
      if (blocks.some((b) => overlaps({ start, end }, b))) continue
      const key = start.getTime()
      const slot = byStart.get(key) ?? { start, end, staffIds: [] }
      slot.staffIds.push(s.staffId)
      byStart.set(key, slot)
    }
  }
  return [...byStart.values()].sort((a, b) => a.start.getTime() - b.start.getTime())
}

/** How busy a day is, 0..1, for the date picker heat hint. */
export const busyness = (slots: Slot[], staffCount: number, possiblePerStaff: number): number => {
  if (!staffCount || !possiblePerStaff) return 1
  const free = slots.reduce((n, s) => n + s.staffIds.length, 0)
  return Math.max(0, Math.min(1, 1 - free / (staffCount * possiblePerStaff)))
}

/** Picks the staff member for "anyone": preferred first, then the least busy. */
export const pickStaff = (candidates: (string | number)[], loadByStaff: Map<string, number>, preferred?: string | number | null): string | number | null => {
  if (candidates.length === 0) return null
  if (preferred != null && candidates.some((c) => String(c) === String(preferred))) return preferred
  return [...candidates].sort((a, b) => (loadByStaff.get(String(a)) ?? 0) - (loadByStaff.get(String(b)) ?? 0))[0]
}

export { overlaps }

/** True when a staff member can take the whole range [start, end) on the given salon-local date. */
export const isFree = (day: StaffDay, date: string, timezone: string, start: Date, end: Date): boolean => {
  if (!day.hours) return false
  const open = zonedDateTime(date, day.hours.open, timezone)
  const close = zonedDateTime(date, day.hours.close, timezone)
  if (start < open || end > close) return false
  const blocks: TimeRange[] = [
    ...day.busy,
    ...(day.timeOff ?? []),
    ...(day.breaks ?? []).map((b) => ({ start: zonedDateTime(date, b.start, timezone), end: zonedDateTime(date, b.end, timezone) })),
  ]
  return !blocks.some((b) => overlaps({ start, end }, b))
}

/**
 * The quietest `windowMinutes` stretch of a day (on the hour), measured in booked minutes across all artists.
 * Used to suggest slot-filler deals at a time that is actually empty.
 */
export const quietestWindow = (
  date: string,
  timezone: string,
  open: string,
  close: string,
  bookings: TimeRange[],
  windowMinutes = 180,
): { from: string; to: string; bookedMinutes: number } | null => {
  const openMin = minutesFromHHMM(open)
  const closeMin = minutesFromHHMM(close)
  if (closeMin - openMin < windowMinutes) return null
  const dayStart = zonedDateTime(date, '00:00', timezone).getTime()
  const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
  let best: { from: string; to: string; bookedMinutes: number } | null = null
  for (let start = Math.ceil(openMin / 60) * 60; start + windowMinutes <= closeMin; start += 60) {
    const ws = dayStart + start * MINUTE_MS
    const we = ws + windowMinutes * MINUTE_MS
    const booked = bookings.reduce((n, b) => n + Math.max(0, Math.min(we, b.end.getTime()) - Math.max(ws, b.start.getTime())) / MINUTE_MS, 0)
    if (!best || booked < best.bookedMinutes) best = { from: fmt(start), to: fmt(start + windowMinutes), bookedMinutes: Math.round(booked) }
  }
  return best
}
