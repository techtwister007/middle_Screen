import { describe, expect, it } from 'vitest'
import { formatDuration, quote } from '../_shared/pricing'
import { computeSlots, isFree, pickStaff } from '../booking/slots'
import { nextDueFrom, segmentFor, vipThreshold } from '../customers/segments'
import { rankByTaste, surpriseMe } from '../gallery/discover'
import { applyBudget, nextVisitReward, pointsFor, rewardDiscount, tierFor } from '../loyalty/rules'
import { refillJourney, shouldSend, withinPromoCap } from '../messaging/policy'
import { render } from '../messaging/templates'
import { computeCheckout } from '../visits'

const DAY = 86_400_000

describe('pricing', () => {
  const rule = { depositMinMinutes: 90, depositPercent: 20 }
  it('adds prices and durations', () => {
    const q = quote(
      [
        { id: 1, name: 'Gel', price: 79900, durationMinutes: 45 },
        { id: 2, name: 'Chrome', price: 30000, durationMinutes: 15, isAddOn: true },
      ],
      rule,
    )
    expect(q.subtotal).toBe(109900)
    expect(q.durationMinutes).toBe(60)
    expect(q.deposit).toBe(0)
  })
  it('asks for a deposit on long services, rounded to whole rupees', () => {
    const q = quote([{ id: 1, name: 'Extensions', price: 199900, durationMinutes: 120 }], rule)
    expect(q.deposit).toBe(40000)
  })
  it('respects always/never deposit flags', () => {
    expect(quote([{ id: 1, name: 'x', price: 50000, durationMinutes: 30, requiresDeposit: 'always' }], rule).deposit).toBe(10000)
    expect(quote([{ id: 1, name: 'x', price: 50000, durationMinutes: 200, requiresDeposit: 'never' }], rule).deposit).toBe(0)
  })
  it('formats durations', () => {
    expect(formatDuration(75)).toBe('1 h 15 min')
    expect(formatDuration(120)).toBe('2 h')
    expect(formatDuration(40)).toBe('40 min')
  })
})

describe('slots', () => {
  const tz = 'Asia/Kolkata'
  const at = (hhmm: string) => new Date(`2026-10-20T${hhmm}:00+05:30`)
  const base = {
    date: '2026-10-20',
    timezone: tz,
    stepMinutes: 30,
    now: new Date('2026-10-19T00:00:00Z'),
  }
  it('lists free starts per artist', () => {
    const slots = computeSlots({
      ...base,
      durationMinutes: 60,
      staff: [
        { staffId: 'a', hours: { open: '10:00', close: '13:00' }, busy: [{ start: at('11:00'), end: at('12:00') }] },
        { staffId: 'b', hours: { open: '10:00', close: '12:00' }, busy: [] },
      ],
    })
    const starts = slots.map((s) => [s.start.toISOString(), s.staffIds.join(',')])
    expect(starts).toEqual([
      [at('10:00').toISOString(), 'a,b'],
      [at('10:30').toISOString(), 'b'],
      [at('11:00').toISOString(), 'b'],
      [at('12:00').toISOString(), 'a'],
    ])
  })
  it('respects breaks, time off and days off', () => {
    const slots = computeSlots({
      ...base,
      durationMinutes: 60,
      staff: [
        { staffId: 'a', hours: { open: '10:00', close: '12:00' }, breaks: [{ start: '10:30', end: '11:00' }], busy: [] },
        { staffId: 'b', hours: null, busy: [] },
        { staffId: 'c', hours: { open: '10:00', close: '12:00' }, timeOff: [{ start: at('00:00'), end: at('23:59') }], busy: [] },
      ],
    })
    expect(slots.map((s) => s.start.toISOString())).toEqual([at('11:00').toISOString()])
  })
  it('never offers times in the past', () => {
    const slots = computeSlots({
      ...base,
      now: at('11:10'),
      durationMinutes: 30,
      staff: [{ staffId: 'a', hours: { open: '10:00', close: '13:00' }, busy: [] }],
    })
    expect(slots[0].start.getTime()).toBeGreaterThanOrEqual(at('11:40').getTime())
  })
  it('checks a specific range', () => {
    const day = { staffId: 'a', hours: { open: '10:00', close: '13:00' }, busy: [{ start: at('11:00'), end: at('12:00') }] }
    expect(isFree(day, '2026-10-20', tz, at('10:00'), at('11:00'))).toBe(true)
    expect(isFree(day, '2026-10-20', tz, at('10:30'), at('11:30'))).toBe(false)
    expect(isFree(day, '2026-10-20', tz, at('12:30'), at('13:30'))).toBe(false)
  })
  it('prefers the requested artist, else the least busy', () => {
    const load = new Map([
      ['a', 3],
      ['b', 1],
    ])
    expect(pickStaff(['a', 'b'], load, 'a')).toBe('a')
    expect(pickStaff(['a', 'b'], load, null)).toBe('b')
    expect(pickStaff([], load, 'a')).toBeNull()
  })
})

describe('checkout', () => {
  const lines = [
    { name: 'Gel extensions', price: 199900 },
    { name: 'Chrome', price: 30000 },
  ]
  it('applies package, discount, reward then wallet without going negative', () => {
    const t = computeCheckout({ lines, manualDiscount: 10000, rewardDiscount: 30000, walletBalance: 500000, useWallet: true })
    expect(t.subtotal).toBe(229900)
    expect(t.walletApplied).toBe(189900)
    expect(t.total).toBe(0)
  })
  it('caps every deduction at what remains', () => {
    const t = computeCheckout({ lines, packageCovered: 199900, rewardDiscount: 50000 })
    expect(t.packageCovered).toBe(199900)
    expect(t.rewardDiscount).toBe(30000)
    expect(t.total).toBe(0)
  })
  it('ignores the wallet unless asked', () => {
    expect(computeCheckout({ lines, walletBalance: 100000 }).total).toBe(229900)
  })
  it('handles quantities and any combination consistently', () => {
    for (let i = 0; i < 200; i++) {
      const input = {
        lines: [{ name: 'x', price: Math.floor(Math.random() * 300000), quantity: 1 + Math.floor(Math.random() * 3) }],
        manualDiscount: Math.floor(Math.random() * 100000),
        rewardDiscount: Math.floor(Math.random() * 100000),
        packageCovered: Math.floor(Math.random() * 100000),
        walletBalance: Math.floor(Math.random() * 100000),
        useWallet: Math.random() > 0.5,
      }
      const t = computeCheckout(input)
      expect(t.total).toBeGreaterThanOrEqual(0)
      expect(t.packageCovered + t.manualDiscount + t.rewardDiscount + t.walletApplied + t.total).toBe(t.subtotal)
    }
  })
})

describe('customer groups', () => {
  const now = new Date('2026-10-20T00:00:00Z')
  const daysAgo = (d: number) => new Date(now.getTime() - d * DAY)
  it('classifies by cycle', () => {
    expect(segmentFor({ visitCount: 0 }, now)).toBe('lead')
    expect(segmentFor({ visitCount: 1, nextDueDate: daysAgo(-5) }, now)).toBe('new')
    expect(segmentFor({ visitCount: 3, nextDueDate: daysAgo(-5) }, now)).toBe('regular')
    expect(segmentFor({ visitCount: 3, nextDueDate: daysAgo(2) }, now)).toBe('due')
    expect(segmentFor({ visitCount: 3, nextDueDate: daysAgo(20) }, now)).toBe('at-risk')
    expect(segmentFor({ visitCount: 3, nextDueDate: daysAgo(70) }, now)).toBe('lapsed')
  })
  it('falls back to time since last visit without a cycle', () => {
    expect(segmentFor({ visitCount: 2, lastVisitAt: daysAgo(10) }, now)).toBe('regular')
    expect(segmentFor({ visitCount: 2, lastVisitAt: daysAgo(70) }, now)).toBe('at-risk')
    expect(segmentFor({ visitCount: 2, lastVisitAt: daysAgo(130) }, now)).toBe('lapsed')
  })
  it('VIP is the top 10% by spend', () => {
    expect(vipThreshold([100, 200, 300, 400, 500, 600, 700, 800, 900, 1000])).toBe(1000)
    expect(vipThreshold([])).toBe(Number.POSITIVE_INFINITY)
  })
  it('next due uses the shortest cycle', () => {
    expect(nextDueFrom(now, [28, 21, 0])?.toISOString()).toBe(new Date(now.getTime() + 21 * DAY).toISOString())
    expect(nextDueFrom(now, [0])).toBeNull()
  })
})

describe('loyalty rules', () => {
  it('tiers and points', () => {
    const s = { silverAfterVisits: 4, goldAfterVisits: 10 }
    expect(tierFor(1, s)).toBe('member')
    expect(tierFor(4, s)).toBe('silver')
    expect(tierFor(12, s)).toBe('gold')
    expect(pointsFor(199900, 5)).toBe(95)
  })
  it('cross-sells extensions to gel-only customers', () => {
    expect(nextVisitReward({ categories: ['gel'] }, 0.1).title).toContain('extensions')
    expect(nextVisitReward({ categories: ['extensions', 'nail-art'] }, 0.1).valueType).toBe('freebie')
  })
  it('swaps discounts for extras when the budget is used up', () => {
    const spec = { title: '₹300 off', valueType: 'amount' as const, value: 30000, isDiscount: true }
    expect(applyBudget(spec, 90000, 100000, 30000).valueType).toBe('freebie')
    expect(applyBudget(spec, 10000, 100000, 30000)).toBe(spec)
  })
  it('values rewards on a bill', () => {
    const now = new Date('2026-10-20T00:00:00Z')
    const r = { valueType: 'amount' as const, value: 30000, status: 'active', validTo: '2026-11-01' }
    expect(rewardDiscount(r, 100000, now)).toBe(30000)
    expect(rewardDiscount(r, 20000, now)).toBe(20000)
    expect(rewardDiscount({ ...r, status: 'redeemed' }, 100000, now)).toBe(0)
    expect(rewardDiscount({ ...r, validTo: '2026-10-01' }, 100000, now)).toBe(0)
    expect(rewardDiscount({ ...r, minSpend: 150000 }, 100000, now)).toBe(0)
    expect(rewardDiscount({ valueType: 'percent', value: 10, status: 'active' }, 199900, now)).toBe(19990)
  })
})

describe('messaging policy', () => {
  const now = new Date('2026-10-20T12:00:00Z')
  const policy = { perWeek: 1, perMonth: 3 }
  it('caps promotions per week and month', () => {
    expect(withinPromoCap([], now, policy)).toBe(true)
    expect(withinPromoCap([new Date(now.getTime() - 2 * DAY)], now, policy)).toBe(false)
    expect(
      withinPromoCap(
        [8, 15, 22].map((d) => new Date(now.getTime() - d * DAY)),
        now,
        policy,
      ),
    ).toBe(false)
    expect(
      withinPromoCap(
        [8, 15].map((d) => new Date(now.getTime() - d * DAY)),
        now,
        policy,
      ),
    ).toBe(true)
  })
  it('never sends promotions without consent; reminders are exempt', () => {
    const base = { promoHistory: [], now, policy, phone: '+919876543210' }
    expect(shouldSend({ ...base, category: 'marketing', marketingConsent: false })).toBe('no-consent')
    expect(shouldSend({ ...base, category: 'utility', marketingConsent: false })).toBeNull()
    expect(shouldSend({ ...base, category: 'utility', marketingConsent: false, phone: null })).toBe('no-phone')
  })
  it('builds the refill journey from the cycle', () => {
    const j = refillJourney(21, { refillHeadsUpDays: 5, nudgeDays: 15, winbackDays: 30, lastChanceDays: 60 })
    expect(j.map((s) => s.offsetDays)).toEqual([16, 21, 36, 51, 81])
  })
  it('renders templates', () => {
    expect(render('Hi {{name}}, {{missing}}see {{link}}', { name: 'Priya', link: 'x' })).toBe('Hi Priya, see x')
  })
})

describe('gallery discovery', () => {
  const designs = [
    { id: 1, category: 'chrome', priceFrom: 150000, durationMinutes: 90, likes: 3 },
    { id: 2, category: 'french', priceFrom: 90000, durationMinutes: 60, likes: 9, featured: true },
    { id: 3, category: 'chrome', priceFrom: 250000, durationMinutes: 120, likes: 1 },
  ]
  it('ranks by liked styles', () => {
    const ranked = rankByTaste(designs, { liked: [{ id: 9, category: 'chrome' }], skipped: [{ id: 8, category: 'french' }] })
    expect(ranked[0].category).toBe('chrome')
  })
  it('surprise me respects budget and time', () => {
    expect(surpriseMe(designs, 160000, 90).map((d) => d.id)).toEqual([2, 1])
  })
})
