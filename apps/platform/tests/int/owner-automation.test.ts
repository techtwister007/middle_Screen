import { emit, forTenant, type ID, liveSalons, rupees } from '@salon/core'
import { FakeMessaging } from '@salon/integrations'
import {
  cancelBooking,
  confirmBooking,
  findOrCreateCustomer,
  notifyRunningLate,
  previousMonth,
  remindDueCustomers,
  requestBooking,
  sendMonthlyReport,
} from '@salon/modules'
import { at, createSalon, createService, createStaff, futureDate } from '@salon/testing'
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'
import { payloadForTests } from '../helpers'

let payload: Payload
let salon: { id: ID; slug: string; name: string }
let gel: { id: ID }
const OWNER = '+919800000001'
const sentTo = (phone: string) => FakeMessaging.outbox.filter((m) => m.to === phone).map((m) => m.template)

beforeAll(async () => {
  payload = await payloadForTests()
  FakeMessaging.clear()
  salon = await createSalon(payload)
  await createStaff(payload, salon.id, { name: 'Riya Shah' })
  gel = await createService(payload, salon.id, { name: 'Gel polish', price: rupees(799), durationMinutes: 45, cycleDays: 21 })
})

describe('owner automations', () => {
  it('imported customers get no first-visit gift and no messages', async () => {
    const { customer, created } = await findOrCreateCustomer(payload, salon.id, { phone: '98111 00001', name: 'Imported One', source: 'import' })
    expect(created).toBe(true)
    const repo = forTenant(payload, salon.id)
    expect(await repo.count('rewards', { customer: { equals: customer.id } })).toBe(0)
    expect(sentTo(customer.phone)).toEqual([])
  })

  it('one-tap reminders reach due customers once a week and skip people already booked', async () => {
    const repo = forTenant(payload, salon.id)
    const { customer: due } = await findOrCreateCustomer(payload, salon.id, { phone: '98111 00002', name: 'Due Customer' })
    const { customer: booked } = await findOrCreateCustomer(payload, salon.id, { phone: '98111 00003', name: 'Booked Customer' })
    await repo.update('customers', due.id, { segment: 'due' })
    await repo.update('customers', booked.id, { segment: 'due' })
    await requestBooking(payload, salon.id, { customerId: booked.id, serviceIds: [gel.id], start: at(futureDate(5), '12:00') })

    const first = await remindDueCustomers(payload, salon.id)
    expect(first).toMatchObject({ sent: 1, skipped: 1, total: 2 })
    expect(sentTo(due.phone)).toContain('refill_due')

    const again = await remindDueCustomers(payload, salon.id)
    expect(again.sent).toBe(0)
  })

  it('the owner hears about customer cancellations, and customers about running late', async () => {
    const { customer } = await findOrCreateCustomer(payload, salon.id, { phone: '98111 00004', name: 'Kavya Joshi' })
    const { appointment } = await requestBooking(payload, salon.id, { customerId: customer.id, serviceIds: [gel.id], start: at(futureDate(6), '15:00') })
    await confirmBooking(payload, salon.id, appointment.id)
    await notifyRunningLate(payload, salon.id, appointment.id, 20)
    expect(sentTo(customer.phone)).toContain('running_late')
    expect(FakeMessaging.to(customer.phone).at(-1)?.body).toMatch(/about 20 minutes/)

    await cancelBooking(payload, salon.id, appointment.id, 'Busy', 'customer')
    const alert = FakeMessaging.to(OWNER).filter((m) => m.template === 'owner_cancellation')
    expect(alert).toHaveLength(1)
    expect(alert[0].body).toContain('Kavya Joshi')
  })

  it('photos customers offer to the gallery ping the owner for approval', async () => {
    const { customer } = await findOrCreateCustomer(payload, salon.id, { phone: '98111 00005', name: 'Meera Shah' })
    await emit(payload, { tenant: salon.id, type: 'gallery.submitted', payload: { designId: '1', customerId: customer.id } })
    expect(sentTo(OWNER)).toContain('owner_photo_approval')
  })

  it('sends the monthly ROI report once per month', async () => {
    const first = await sendMonthlyReport(payload, { id: salon.id, plan: 'studio' })
    expect(first?.summary).toMatch(/bookings came through the app/)
    expect(sentTo(OWNER)).toContain('owner_monthly_report')
    expect(await sendMonthlyReport(payload, { id: salon.id, plan: 'studio' })).toBeNull()
  })

  it('works out the previous month in IST', () => {
    const m = previousMonth(new Date('2026-01-01T02:00:00+05:30'))
    expect(m.key).toBe('2025-12')
    expect(m.from.toISOString()).toBe('2025-11-30T18:30:00.000Z')
    expect(m.to.toISOString()).toBe('2025-12-31T18:30:00.000Z')
  })
})

describe('demo salons', () => {
  it("send owner alerts to the prospect's phone, never the sample salon number", async () => {
    const demo = await createSalon(payload, { status: 'demo', settings: { demoPhone: '+919999912345' } })
    await sendMonthlyReport(payload, { id: demo.id, plan: 'studio' })
    expect(sentTo('+919999912345')).toContain('owner_monthly_report')
  })

  it('scheduled jobs skip suspended salons', async () => {
    const paused = await createSalon(payload, { status: 'suspended' })
    const ids = (await liveSalons(payload)).map((s) => String(s.id))
    expect(ids).toContain(String(salon.id))
    expect(ids).not.toContain(String(paused.id))
  })
})

describe('login codes', () => {
  it('fall back to SMS when WhatsApp cannot deliver', async () => {
    const { FakeSms, setMessaging, FakeMessaging: Fake } = await import('@salon/integrations')
    const { sendOtp } = await import('@salon/modules')
    FakeSms.clear()
    setMessaging({ name: 'down', send: async () => ({ providerId: '', status: 'failed', cost: 0, error: 'provider down' }) })
    try {
      const r = await sendOtp(payload, salon.id, '+919811100099', '424242')
      expect(r.status).toBe('sent')
      expect(FakeSms.outbox.at(-1)).toMatchObject({ to: '+919811100099', code: '424242' })
      expect(await forTenant(payload, salon.id).count('cost-ledger', { kind: { equals: 'sms' } })).toBe(1)
    } finally {
      setMessaging(new Fake())
    }
  })
})

describe('deposits', () => {
  it('are refunded when the customer cancels in time, kept when it is too late, and always when the salon cancels', async () => {
    const { FakePayments } = await import('@salon/integrations')
    const { createPayment, capturePayment } = await import('@salon/modules')
    const repo = forTenant(payload, salon.id)
    const book = async (phone: string, startsInHours: number) => {
      const { customer } = await findOrCreateCustomer(payload, salon.id, { phone, name: 'Deposit Test' })
      const start = new Date(Math.ceil((Date.now() + startsInHours * 3_600_000) / 3_600_000) * 3_600_000)
      await repo.create('appointments', {
        customer: customer.id,
        services: [gel.id],
        start: start.toISOString(),
        end: new Date(start.getTime() + 45 * 60_000).toISOString(),
        status: 'confirmed',
      })
      const appt = await repo.findOne<{ id: ID }>('appointments', { customer: { equals: customer.id } })
      const { payment } = await createPayment(payload, salon.id, {
        kind: 'deposit',
        amount: rupees(200),
        customerId: customer.id,
        appointmentId: appt!.id,
        description: 'Deposit',
      })
      await capturePayment(payload, salon.id, payment.id, `pay_${phone.replace(/\D/g, '')}`)
      return { appt: appt!, payment }
    }
    const status = async (id: ID) => (await repo.findByID<{ status: string }>('payments', id))?.status

    const early = await book('98111 00011', 72)
    await cancelBooking(payload, salon.id, early.appt.id, 'Plans changed', 'customer')
    expect(await status(early.payment.id)).toBe('refunded')

    const late = await book('98111 00012', 3)
    await cancelBooking(payload, salon.id, late.appt.id, 'Late', 'customer')
    expect(await status(late.payment.id)).toBe('captured')

    const bySalon = await book('98111 00013', 3)
    await cancelBooking(payload, salon.id, bySalon.appt.id, 'Artist unwell', 'staff')
    expect(await status(bySalon.payment.id)).toBe('refunded')
    expect(FakePayments.refunds.map((r) => r.providerPaymentId)).toEqual(expect.arrayContaining(['pay_9811100011', 'pay_9811100013']))
  })
})
