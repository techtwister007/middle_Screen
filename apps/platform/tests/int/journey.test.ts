import { forTenant, getEventBus, type ID, rupees } from '@salon/core'
import { FakeMessaging } from '@salon/integrations'
import {
  BookingError,
  capturePayment,
  completePhotoTask,
  completeVisit,
  createPayment,
  findOrCreateCustomer,
  launchOffer,
  photoTaskForVisit,
  requestBooking,
  submitRating,
} from '@salon/modules'
import { at, createSalon, createService, createStaff, futureDate } from '@salon/testing'
import type { Payload } from 'payload'
import sharp from 'sharp'
import { beforeAll, describe, expect, it } from 'vitest'
import { payloadForTests } from '../helpers'

let payload: Payload
let salon: { id: ID; slug: string; name: string }
let artist: { id: ID; name: string }
let gel: { id: ID; price: number }
let extensions: { id: ID; price: number }
const OWNER_PHONE = '+919800000001'

const messagesTo = (phone: string) => FakeMessaging.outbox.filter((m) => m.to === phone).map((m) => m.template)

beforeAll(async () => {
  payload = await payloadForTests()
  FakeMessaging.clear()
  salon = await createSalon(payload)
  artist = await createStaff(payload, salon.id, { name: 'Riya Shah' })
  gel = await createService(payload, salon.id, { name: 'Gel polish', category: 'gel', price: rupees(799), durationMinutes: 45, cycleDays: 21 })
  extensions = await createService(payload, salon.id, {
    name: 'Gel extensions',
    category: 'extensions',
    price: rupees(1999),
    durationMinutes: 120,
    cycleDays: 21,
  })
})

describe('the core customer journey', () => {
  let priya: { id: ID; phone: string; referralCode?: string | null }
  let ananya: { id: ID; phone: string }
  let appointmentId: ID
  let visitId: ID
  const date = futureDate(4)

  it('a new customer gets a loyalty account and a first-visit reward', async () => {
    const { customer, created } = await findOrCreateCustomer(payload, salon.id, {
      phone: '98250 11111',
      name: 'Priya Shah',
      marketingConsent: true,
      source: 'instagram',
    })
    expect(created).toBe(true)
    priya = customer
    expect(priya.referralCode).toHaveLength(6)
    const repo = forTenant(payload, salon.id)
    expect(await repo.count('loyalty-accounts', { customer: { equals: priya.id } })).toBe(1)
    const rewards = await repo.find<{ kind: string }>('rewards', { where: { customer: { equals: priya.id } } })
    expect(rewards.docs.map((r) => r.kind)).toEqual(['first-visit'])
  })

  it("a friend who joins through Priya's link gets a friend gift, not the generic offer", async () => {
    const { customer } = await findOrCreateCustomer(payload, salon.id, {
      phone: '98250 22222',
      name: 'Ananya Patel',
      referralCode: priya.referralCode ?? undefined,
      marketingConsent: true,
    })
    ananya = customer
    const repo = forTenant(payload, salon.id)
    const rewards = await repo.find<{ kind: string }>('rewards', { where: { customer: { equals: ananya.id } } })
    expect(rewards.docs.map((r) => r.kind)).toEqual(['referral'])
    const referral = await repo.findOne<{ status: string }>('referrals', { invitee: { equals: ananya.id } })
    expect(referral?.status).toBe('joined')
  })

  it('a long service needs a deposit and stays requested until it is paid', async () => {
    const { appointment, quote } = await requestBooking(payload, salon.id, {
      customerId: ananya.id,
      serviceIds: [extensions.id],
      start: at(date, '11:00'),
      source: 'referral',
    })
    appointmentId = appointment.id
    expect(appointment.status).toBe('requested')
    expect(quote.deposit).toBe(rupees(400))
    // Nothing is sent while the deposit is unpaid: no "we got your request" followed by "you're booked".
    expect(messagesTo(ananya.phone)).not.toContain('booking_received')
    expect(messagesTo(OWNER_PHONE)).not.toContain('owner_new_booking')
  })

  it('the same artist cannot be double-booked', async () => {
    await expect(requestBooking(payload, salon.id, { customerId: priya.id, serviceIds: [gel.id], start: at(date, '12:00') })).rejects.toBeInstanceOf(
      BookingError,
    )
  })

  it('paying the deposit confirms the booking and schedules reminders', async () => {
    const { payment, link } = await createPayment(payload, salon.id, {
      kind: 'deposit',
      amount: rupees(400),
      customerId: ananya.id,
      appointmentId,
      description: 'Deposit',
    })
    expect(link.url).toContain('/pay/test/')
    await capturePayment(payload, salon.id, payment.id, 'pay_test_1')
    await capturePayment(payload, salon.id, payment.id, 'pay_test_1') // webhook retry is harmless
    const appt = await forTenant(payload, salon.id).findByID<{ status: string; depositPaid: boolean }>('appointments', appointmentId)
    expect(appt?.status).toBe('confirmed')
    expect(appt?.depositPaid).toBe(true)
    expect(messagesTo(ananya.phone).filter((t) => t === 'booking_confirmed')).toHaveLength(1)
    expect(messagesTo(ananya.phone)).not.toContain('booking_received')
    // The owner hears about it once, when the deposit lands.
    expect(messagesTo(OWNER_PHONE).filter((t) => t === 'owner_new_booking')).toHaveLength(1)
    const jobs = await payload.find({ collection: 'payload-jobs' as never, overrideAccess: true, limit: 100, where: { taskSlug: { equals: 'module-step' } } })
    const steps = (jobs.docs as { input: { step: string } }[]).map((j) => j.input.step)
    expect(steps).toContain('appointment-reminder')
  })

  it('completing the visit updates stats, loyalty, referrals, rewards and photo tasks', async () => {
    const repo = forTenant(payload, salon.id)
    const friendReward = await repo.findOne<{ id: ID; value: number }>('rewards', {
      and: [{ customer: { equals: ananya.id } }, { kind: { equals: 'referral' } }],
    })
    const { visit, totals } = await completeVisit(payload, salon.id, {
      customerId: ananya.id,
      staffId: artist.id,
      appointmentId,
      lines: [{ serviceId: extensions.id, name: 'Gel extensions', price: rupees(1999) }],
      rewardId: friendReward?.id,
      rewardDiscount: friendReward?.value,
      paymentMode: 'upi',
      designName: 'Garba Glow',
    })
    visitId = visit.id
    expect(totals.total).toBe(rupees(1799))

    const customer = await repo.findByID<{ visitCount: number; segment: string; nextDueDate: string; lifetimeSpend: number }>('customers', ananya.id)
    expect(customer?.visitCount).toBe(1)
    expect(customer?.segment).toBe('new')
    expect(customer?.lifetimeSpend).toBe(rupees(1799))
    expect(new Date(customer!.nextDueDate).getTime()).toBeGreaterThan(Date.now() + 19 * 86_400_000)

    const account = await repo.findOne<{ stamps: number; points: number }>('loyalty-accounts', { customer: { equals: ananya.id } })
    expect(account?.stamps).toBe(1)
    expect(account?.points).toBeGreaterThan(0)

    const used = await repo.findByID<{ status: string }>('rewards', friendReward!.id)
    expect(used?.status).toBe('redeemed')
    const scratch = await repo.findOne<{ scratch: boolean; revealed: boolean }>('rewards', {
      and: [{ customer: { equals: ananya.id } }, { kind: { equals: 'next-visit' } }],
    })
    expect(scratch?.scratch).toBe(true)
    expect(scratch?.revealed).toBe(false)

    // Priya is rewarded only now that her friend actually visited.
    const priyaRewards = await repo.find<{ kind: string }>('rewards', { where: { customer: { equals: priya.id } } })
    expect(priyaRewards.docs.map((r) => r.kind).sort()).toEqual(['first-visit', 'referral'])
    expect(messagesTo(priya.phone)).toContain('referral_converted')

    expect(await repo.count('photo-tasks', { visit: { equals: visitId } })).toBe(1)
    const appt = await repo.findByID<{ status: string }>('appointments', appointmentId)
    expect(appt?.status).toBe('completed')

    const jobs = await payload.find({ collection: 'payload-jobs' as never, overrideAccess: true, limit: 200, where: { taskSlug: { equals: 'module-step' } } })
    const steps = (jobs.docs as { input: { step: string; data?: { visitId?: ID } } }[])
      .filter((j) => String(j.input.data?.visitId) === String(visitId))
      .map((j) => j.input.step)
    expect(steps.sort()).toEqual(['aftercare', 'last-chance', 'nudge', 'rating-request', 'refill-due', 'refill-heads-up', 'winback'].sort())
  })

  it('the photo corner produces a share kit and sends the reveal', async () => {
    const task = await photoTaskForVisit(payload, salon.id, visitId)
    const image = await sharp({ create: { width: 900, height: 1200, channels: 3, background: '#d88aa0' } })
      .jpeg()
      .toBuffer()
    const photo = (await payload.create({
      collection: 'media' as never,
      overrideAccess: true,
      data: { alt: 'nails', kind: 'visit', tenant: salon.id } as never,
      file: { data: image, mimetype: 'image/jpeg', name: 'nails.jpg', size: image.length },
    })) as unknown as { id: ID }
    const done = await completePhotoTask(payload, salon.id, task.id, { photoIds: [photo.id], designName: 'Garba Glow', frame: 'navratri', artistName: 'Riya' })
    expect((done as { status: string }).status).toBe('sent')
    expect((done as { story?: unknown }).story).toBeTruthy()
    expect((done as { square?: unknown }).square).toBeTruthy()
    expect(messagesTo(ananya.phone)).toContain('nails_ready')
  })

  it('rating: everyone gets the Google link, low scores alert the owner', async () => {
    await getEventBus().runStep(payload, { tenant: salon.id, module: 'messaging', step: 'rating-request', data: { visitId, customerId: ananya.id } })
    expect(messagesTo(ananya.phone)).toContain('rating_request')
    await submitRating(payload, salon.id, { customerId: ananya.id, visitId, score: 2, comment: 'Lifting on one nail' })
    expect(messagesTo(ananya.phone)).toContain('thanks_review')
    expect(messagesTo(OWNER_PHONE)).toContain('owner_low_rating')
    // Rating again is idempotent.
    await submitRating(payload, salon.id, { customerId: ananya.id, visitId, score: 5 })
    expect(await forTenant(payload, salon.id).count('ratings', { visit: { equals: visitId } })).toBe(1)
  })

  it('refill reminders stop once the customer has booked again', async () => {
    const before = messagesTo(ananya.phone).filter((t) => t === 'refill_due').length
    await requestBooking(payload, salon.id, { customerId: ananya.id, serviceIds: [gel.id], start: at(futureDate(20), '15:00') })
    await getEventBus().runStep(payload, {
      tenant: salon.id,
      module: 'messaging',
      step: 'refill-due',
      data: { visitId, customerId: ananya.id, visitAt: new Date().toISOString() },
    })
    expect(messagesTo(ananya.phone).filter((t) => t === 'refill_due').length).toBe(before)
  })

  it('promotions respect consent and the weekly cap; utility messages log their cost', async () => {
    const repo = forTenant(payload, salon.id)
    await repo.update('customers', priya.id, { segment: 'due' })
    const offer1 = await repo.create<{ id: ID }>('offers', { title: '20% off gel this Tuesday', audience: ['due'], status: 'draft' })
    await launchOffer(payload, salon.id, offer1.id)
    const offer2 = await repo.create<{ id: ID }>('offers', { title: 'Free chrome add-on', audience: ['due'], status: 'draft' })
    await launchOffer(payload, salon.id, offer2.id)
    const offers = await repo.find<{ status: string; skipReason?: string }>('messages', {
      where: { and: [{ customer: { equals: priya.id } }, { template: { equals: 'offer' } }] },
      sort: 'createdAt',
    })
    expect(offers.docs.map((m) => m.status)).toEqual(['sent', 'skipped'])
    expect(offers.docs[1].skipReason).toBe('cap')
    const ledger = await repo.find<{ kind: string; total: number }>('cost-ledger', { limit: 500 })
    expect(ledger.docs.some((c) => c.kind === 'whatsapp-marketing' && c.total > 0)).toBe(true)
    expect(ledger.docs.some((c) => c.kind === 'whatsapp-utility' && c.total > 0)).toBe(true)
  })
})
