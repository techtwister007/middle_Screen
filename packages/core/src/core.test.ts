import { describe, expect, it } from 'vitest'
import { parseEvent } from './events'
import { enabledFeatures, isEnabled, PLAN_FEATURES } from './features'
import { formatINR, percentOf, rupees } from './money'
import { formatPhone, normalizePhone, waDigits } from './phone'
import { localDate, zonedDateTime } from './time'

describe('money', () => {
  it('stores rupees as integer paise', () => {
    expect(rupees(1999)).toBe(199900)
    expect(rupees(0.1 + 0.2)).toBe(30)
  })
  it('formats INR without float errors', () => {
    expect(formatINR(199900)).toBe('₹1,999')
    expect(formatINR(150)).toBe('₹1.50')
    expect(formatINR(10000000)).toBe('₹1,00,000')
  })
  it('rounds percentages to the nearest paisa', () => {
    expect(percentOf(99999, 10)).toBe(10000)
  })
})

describe('phone', () => {
  it('normalises Indian numbers to E.164', () => {
    expect(normalizePhone('98765 43210')).toBe('+919876543210')
    expect(normalizePhone('+91 98765-43210')).toBe('+919876543210')
    expect(normalizePhone('09876543210')).toBe('+919876543210')
  })
  it('rejects invalid numbers', () => {
    expect(normalizePhone('12345')).toBeNull()
  })
  it('formats for display and wa.me', () => {
    expect(waDigits('+919876543210')).toBe('919876543210')
    expect(formatPhone('+919876543210')).toContain('98765')
  })
})

describe('time', () => {
  it('converts salon-local wall time to UTC', () => {
    expect(zonedDateTime('2026-10-20', '10:00', 'Asia/Kolkata').toISOString()).toBe('2026-10-20T04:30:00.000Z')
  })
  it('gives the salon-local date of an instant', () => {
    expect(localDate(new Date('2026-10-20T20:00:00Z'), 'Asia/Kolkata')).toBe('2026-10-21')
  })
})

describe('features', () => {
  it('follows the plan with per-salon overrides', () => {
    expect(isEnabled({ plan: 'starter' }, 'referrals')).toBe(false)
    expect(isEnabled({ plan: 'studio' }, 'referrals')).toBe(true)
    expect(isEnabled({ plan: 'studio' }, 'aiTryOn')).toBe(false)
    expect(isEnabled({ plan: 'studio', featureOverrides: [{ feature: 'aiTryOn', enabled: true }] }, 'aiTryOn')).toBe(true)
    expect(isEnabled({ plan: 'growth', featureOverrides: [{ feature: 'contests', enabled: false }] }, 'contests')).toBe(false)
  })
  it('keeps opt-in features off on every plan', () => {
    for (const plan of ['starter', 'studio', 'growth'] as const) {
      expect(enabledFeatures({ plan }).has('discovery')).toBe(false)
      expect(PLAN_FEATURES[plan]).not.toContain('aiTryOn')
    }
  })
})

describe('events', () => {
  it('validates payloads against the catalogue', () => {
    expect(() => parseEvent('rating.submitted', { ratingId: 1, customerId: 2, score: 9 })).toThrow()
    expect(parseEvent('rating.submitted', { ratingId: 1, customerId: 2, score: 4 }).score).toBe(4)
  })
})
