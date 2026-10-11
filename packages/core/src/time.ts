import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz'

export const IST = 'Asia/Kolkata'

export const DAY_MS = 24 * 60 * 60 * 1000
export const HOUR_MS = 60 * 60 * 1000
export const MINUTE_MS = 60 * 1000

export const addMinutes = (date: Date, minutes: number) => new Date(date.getTime() + minutes * MINUTE_MS)
export const addHours = (date: Date, hours: number) => new Date(date.getTime() + hours * HOUR_MS)
export const addDays = (date: Date, days: number) => new Date(date.getTime() + days * DAY_MS)

export const daysBetween = (a: Date, b: Date) => Math.floor((b.getTime() - a.getTime()) / DAY_MS)

export const formatIST = (date: Date | string, pattern = 'd MMM yyyy, h:mm a', tz = IST) =>
  formatInTimeZone(typeof date === 'string' ? new Date(date) : date, tz, pattern)

/** Interprets a wall-clock date + "HH:mm" in a salon's time zone and returns the UTC instant. */
export const zonedDateTime = (isoDate: string, hhmm: string, tz = IST): Date =>
  fromZonedTime(`${isoDate}T${hhmm}:00`, tz)

/** The salon-local calendar date (yyyy-MM-dd) for an instant. */
export const localDate = (date: Date, tz = IST): string => formatInTimeZone(date, tz, 'yyyy-MM-dd')

/** Day of week (0 = Sunday) in the salon's time zone. */
export const localWeekday = (date: Date, tz = IST): number => toZonedTime(date, tz).getDay()

export const minutesFromHHMM = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export const hhmmFromMinutes = (minutes: number): string =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
