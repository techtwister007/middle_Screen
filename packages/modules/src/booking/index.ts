import { addDays, asId, defineModule, emit, forTenant, type ID, idOf, localDate, localWeekday, MINUTE_MS, shortCode, zonedDateTime } from '@salon/core'
import type { CollectionConfig, Payload } from 'payload'
import { managersOnly, salonData } from '../_shared/access'
import { moneyField } from '../_shared/fields'
import { type PricedItem, quote } from '../_shared/pricing'
import { computeSlots, isFree, pickStaff, type Slot, type StaffDay } from './slots'

const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

export const APPOINTMENT_STATUSES = ['requested', 'confirmed', 'completed', 'cancelled', 'no-show'] as const
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number]

export const Availability: CollectionConfig = {
  slug: 'availability',
  admin: { useAsTitle: 'id', defaultColumns: ['staff'] },
  access: { ...salonData, create: managersOnly },
  fields: [
    { name: 'staff', type: 'relationship', relationTo: 'users', required: true, index: true },
    {
      name: 'weekly',
      type: 'array',
      fields: [
        { name: 'day', type: 'select', required: true, options: WEEKDAYS },
        { name: 'start', type: 'text', defaultValue: '10:00' },
        { name: 'end', type: 'text', defaultValue: '20:00' },
        { name: 'off', type: 'checkbox', defaultValue: false },
      ],
    },
    {
      name: 'breaks',
      type: 'array',
      fields: [
        { name: 'start', type: 'text', required: true },
        { name: 'end', type: 'text', required: true },
      ],
    },
    {
      name: 'timeOff',
      type: 'array',
      fields: [
        { name: 'from', type: 'date', required: true },
        { name: 'to', type: 'date', required: true },
        { name: 'reason', type: 'text' },
      ],
    },
  ],
}

export const Appointments: CollectionConfig = {
  slug: 'appointments',
  admin: { useAsTitle: 'start', defaultColumns: ['start', 'customer', 'staff', 'status'] },
  access: salonData,
  indexes: [{ fields: ['tenant', 'staff', 'start'] }],
  fields: [
    { name: 'customer', type: 'relationship', relationTo: 'customers', required: true, index: true },
    { name: 'staff', type: 'relationship', relationTo: 'users', index: true },
    { name: 'services', type: 'relationship', relationTo: 'services', hasMany: true, required: true },
    { name: 'design', type: 'relationship', relationTo: 'designs' },
    { name: 'inspiration', type: 'upload', relationTo: 'media', hasMany: true },
    { name: 'start', type: 'date', required: true, index: true, admin: { date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'end', type: 'date', required: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'requested',
      index: true,
      options: [...APPOINTMENT_STATUSES],
    },
    moneyField('quotedTotal'),
    moneyField('depositRequired'),
    { name: 'depositPaid', type: 'checkbox', defaultValue: false },
    { name: 'depositPayment', type: 'relationship', relationTo: 'payments' },
    { name: 'source', type: 'text', defaultValue: 'app' },
    { name: 'preBooked', type: 'checkbox', defaultValue: false, admin: { description: 'Booked at checkout of a previous visit' } },
    { name: 'group', type: 'relationship', relationTo: 'group-bookings' },
    { name: 'notes', type: 'textarea' },
    { name: 'cancelReason', type: 'text' },
    { name: 'remindersSent', type: 'json', admin: { hidden: true } },
  ],
}

export const Waitlist: CollectionConfig = {
  slug: 'waitlist',
  access: salonData,
  fields: [
    { name: 'customer', type: 'relationship', relationTo: 'customers', required: true },
    { name: 'services', type: 'relationship', relationTo: 'services', hasMany: true },
    { name: 'date', type: 'text', required: true, admin: { description: 'yyyy-MM-dd' }, index: true },
    { name: 'from', type: 'text', defaultValue: '10:00' },
    { name: 'to', type: 'text', defaultValue: '20:00' },
    { name: 'status', type: 'select', defaultValue: 'waiting', options: ['waiting', 'offered', 'booked', 'expired'] },
    { name: 'offeredStart', type: 'date' },
  ],
}

export const GroupBookings: CollectionConfig = {
  slug: 'group-bookings',
  access: salonData,
  fields: [
    { name: 'organiser', type: 'relationship', relationTo: 'customers', required: true },
    { name: 'code', type: 'text', required: true, index: true },
    { name: 'occasion', type: 'text' },
    { name: 'start', type: 'date', required: true },
    { name: 'size', type: 'number', defaultValue: 2, min: 2, max: 20 },
    { name: 'status', type: 'select', defaultValue: 'open', options: ['open', 'full', 'cancelled'] },
  ],
}

// ---------------------------------------------------------------------------
// Service functions (called by the app's server actions)
// ---------------------------------------------------------------------------

interface SalonForBooking {
  id: ID
  timezone?: string | null
  hours?: { day: string; open?: string | null; close?: string | null; closed?: boolean | null }[] | null
  settings?: {
    autoConfirmBookings?: boolean | null
    slotStepMinutes?: number | null
    depositMinMinutes?: number | null
    depositPercent?: number | null
    bookingHorizonDays?: number | null
  } | null
}

interface AvailabilityDoc {
  staff: ID | { id: ID }
  weekly?: { day: string; start?: string | null; end?: string | null; off?: boolean | null }[] | null
  breaks?: { start: string; end: string }[] | null
  timeOff?: { from: string; to: string }[] | null
}

export interface AppointmentDoc {
  id: ID
  customer: ID | { id: ID }
  staff?: ID | { id: ID } | null
  services: (ID | { id: ID })[]
  design?: ID | { id: ID } | null
  start: string
  end: string
  status: AppointmentStatus
  quotedTotal?: number | null
  depositRequired?: number | null
  depositPaid?: boolean | null
  preBooked?: boolean | null
  group?: ID | { id: ID } | null
}

const loadSalon = async (payload: Payload, tenant: ID) =>
  (await payload.findByID({ collection: 'salons' as never, id: tenant, depth: 0, overrideAccess: true })) as unknown as SalonForBooking

export const loadServices = async (payload: Payload, tenant: ID, serviceIds: ID[]): Promise<PricedItem[]> => {
  const repo = forTenant(payload, tenant)
  const res = await repo.find<PricedItem & { active?: boolean }>('services', { where: { id: { in: serviceIds } } })
  if (res.docs.length !== serviceIds.length) throw new BookingError('invalid-service', 'Some selected services are not available')
  return res.docs
}

export class BookingError extends Error {
  constructor(
    public code: 'invalid-service' | 'slot-taken' | 'outside-hours' | 'not-found' | 'not-allowed' | 'group-full',
    message: string,
  ) {
    super(message)
  }
}

const bookableStaff = async (payload: Payload, tenant: ID, staffId?: ID | null) => {
  const res = await payload.find({
    collection: 'users' as never,
    overrideAccess: true,
    depth: 0,
    limit: 100,
    where: {
      and: [
        { 'tenants.tenant': { equals: tenant } },
        { bookable: { equals: true } },
        { active: { equals: true } },
        ...(staffId ? [{ id: { equals: staffId } }] : []),
      ],
    },
  })
  return res.docs as unknown as { id: ID; name: string }[]
}

const staffDays = async (payload: Payload, salon: SalonForBooking, date: string, staff: { id: ID }[], ignoreAppointmentId?: ID): Promise<StaffDay[]> => {
  const tz = salon.timezone ?? 'Asia/Kolkata'
  const repo = forTenant(payload, salon.id)
  const dayStart = zonedDateTime(date, '00:00', tz)
  const dayEnd = addDays(dayStart, 1)
  const weekday = WEEKDAYS[localWeekday(dayStart, tz)]
  const salonDay = salon.hours?.find((h) => h.day === weekday)
  const salonHours =
    salonDay && !salonDay.closed
      ? { open: salonDay.open ?? '10:00', close: salonDay.close ?? '20:00' }
      : salon.hours?.length
        ? null
        : { open: '10:00', close: '20:00' }

  const appts = await repo.find<AppointmentDoc>('appointments', {
    where: {
      and: [{ start: { less_than: dayEnd.toISOString() } }, { end: { greater_than: dayStart.toISOString() } }, { status: { in: ['requested', 'confirmed'] } }],
    },
    limit: 500,
  })
  const availability = await repo.find<AvailabilityDoc>('availability', { limit: 200 })

  return staff.map((s) => {
    const av = availability.docs.find((a) => String(idOf(a.staff)) === String(s.id))
    const w = av?.weekly?.find((d) => d.day === weekday)
    let hours = salonHours
    if (w) hours = w.off ? null : { open: w.start ?? salonHours?.open ?? '10:00', close: w.end ?? salonHours?.close ?? '20:00' }
    if (!salonHours) hours = null
    return {
      staffId: s.id,
      hours,
      breaks: av?.breaks ?? [],
      timeOff: (av?.timeOff ?? []).map((t) => ({ start: new Date(t.from), end: new Date(t.to) })),
      busy: appts.docs
        .filter((a) => String(idOf(a.staff)) === String(s.id) && String(a.id) !== String(ignoreAppointmentId ?? ''))
        .map((a) => ({ start: new Date(a.start), end: new Date(a.end) })),
    }
  })
}

export const getAvailableSlots = async (
  payload: Payload,
  tenant: ID,
  raw: { date: string; serviceIds: ID[]; staffId?: ID | null; now?: Date },
): Promise<{ slots: Slot[]; durationMinutes: number }> => {
  const input = { ...raw, serviceIds: raw.serviceIds.map(asId), staffId: raw.staffId ? asId(raw.staffId) : null }
  const salon = await loadSalon(payload, tenant)
  const services = await loadServices(payload, tenant, input.serviceIds)
  const durationMinutes = services.reduce((n, s) => n + s.durationMinutes, 0)
  const staff = await bookableStaff(payload, tenant, input.staffId)
  const days = await staffDays(payload, salon, input.date, staff)
  const slots = computeSlots({
    date: input.date,
    timezone: salon.timezone ?? 'Asia/Kolkata',
    durationMinutes,
    stepMinutes: salon.settings?.slotStepMinutes ?? 15,
    staff: days,
    now: input.now ?? new Date(),
  })
  return { slots, durationMinutes }
}

export interface RequestBookingInput {
  customerId: ID
  serviceIds: ID[]
  start: string
  staffId?: ID | null
  designId?: ID | null
  inspirationIds?: ID[]
  notes?: string
  source?: string
  preBooked?: boolean
  groupId?: ID | null
  /** Staff creating a booking on behalf of a customer can confirm straight away */
  confirmImmediately?: boolean
  actorType?: 'customer' | 'staff'
}

export const requestBooking = async (payload: Payload, tenant: ID, raw: RequestBookingInput) => {
  const input: RequestBookingInput = {
    ...raw,
    customerId: asId(raw.customerId),
    serviceIds: raw.serviceIds.map(asId),
    staffId: raw.staffId ? asId(raw.staffId) : null,
    designId: raw.designId ? asId(raw.designId) : null,
    inspirationIds: (raw.inspirationIds ?? []).map(asId),
    groupId: raw.groupId ? asId(raw.groupId) : null,
  }
  const salon = await loadSalon(payload, tenant)
  const services = await loadServices(payload, tenant, input.serviceIds)
  const q = quote(services, {
    depositMinMinutes: salon.settings?.depositMinMinutes ?? 90,
    depositPercent: salon.settings?.depositPercent ?? 20,
  })
  const start = new Date(input.start)
  const end = new Date(start.getTime() + q.durationMinutes * MINUTE_MS)
  const date = localDate(start, salon.timezone ?? 'Asia/Kolkata')

  const staff = await bookableStaff(payload, tenant, input.staffId)
  const days = await staffDays(payload, salon, date, staff)
  const tz = salon.timezone ?? 'Asia/Kolkata'
  if (start.getTime() < Date.now()) throw new BookingError('outside-hours', 'Please choose a time in the future.')
  const candidates = days.filter((d) => isFree(d, date, tz, start, end)).map((d) => d.staffId)
  if (candidates.length === 0) throw new BookingError('slot-taken', 'Sorry, that time was just taken. Please pick another slot.')

  const repo = forTenant(payload, tenant)
  const customer = await repo.findByID<{ id: ID; preferredArtist?: ID | null }>('customers', input.customerId)
  if (!customer) throw new BookingError('not-found', 'Customer not found')
  const load = new Map<string, number>(days.map((d) => [String(d.staffId), d.busy.length]))
  const staffId = pickStaff(candidates, load, input.staffId ?? idOf(customer.preferredArtist))

  const needsDeposit = q.deposit > 0
  const autoConfirm = input.confirmImmediately || (salon.settings?.autoConfirmBookings && !needsDeposit)
  const appointment = await repo.create<AppointmentDoc>('appointments', {
    customer: input.customerId,
    staff: staffId,
    services: input.serviceIds,
    design: input.designId ?? undefined,
    inspiration: input.inspirationIds ?? [],
    start: start.toISOString(),
    end: end.toISOString(),
    status: autoConfirm ? 'confirmed' : 'requested',
    quotedTotal: q.subtotal,
    depositRequired: q.deposit,
    source: input.source ?? 'app',
    preBooked: Boolean(input.preBooked),
    group: input.groupId ?? undefined,
    notes: input.notes,
  })

  await emit(payload, {
    tenant,
    type: 'booking.requested',
    payload: { appointmentId: appointment.id, customerId: input.customerId },
    actorType: input.actorType ?? 'customer',
    actorId: input.customerId,
  })
  if (autoConfirm) {
    await emit(payload, {
      tenant,
      type: 'booking.confirmed',
      payload: { appointmentId: appointment.id, customerId: input.customerId, start: appointment.start },
    })
  }
  return { appointment, quote: q }
}

const setStatus = async (payload: Payload, tenant: ID, appointmentId: ID, status: AppointmentStatus, extra: Record<string, unknown> = {}) => {
  const repo = forTenant(payload, tenant)
  const appt = await repo.findByID<AppointmentDoc>('appointments', appointmentId)
  if (!appt) throw new BookingError('not-found', 'Appointment not found')
  return { appt, updated: (await repo.update<AppointmentDoc>('appointments', appointmentId, { status, ...extra })) as AppointmentDoc }
}

export const confirmBooking = async (payload: Payload, tenant: ID, appointmentId: ID) => {
  const { appt, updated } = await setStatus(payload, tenant, appointmentId, 'confirmed')
  if (appt.status !== 'confirmed')
    await emit(payload, {
      tenant,
      type: 'booking.confirmed',
      payload: { appointmentId, customerId: idOf(appt.customer) as ID, start: appt.start },
      actorType: 'staff',
    })
  return updated
}

export const cancelBooking = async (payload: Payload, tenant: ID, appointmentId: ID, reason?: string, by: 'customer' | 'staff' = 'customer') => {
  const { appt, updated } = await setStatus(payload, tenant, appointmentId, 'cancelled', { cancelReason: reason })
  if (appt.status === 'cancelled') return updated
  await emit(payload, {
    tenant,
    type: 'booking.cancelled',
    payload: { appointmentId, customerId: idOf(appt.customer) as ID, start: appt.start, staffId: idOf(appt.staff) ?? undefined },
    actorType: by,
  })
  return updated
}

export const markNoShow = async (payload: Payload, tenant: ID, appointmentId: ID) => {
  const { appt, updated } = await setStatus(payload, tenant, appointmentId, 'no-show')
  await emit(payload, { tenant, type: 'booking.no_show', payload: { appointmentId, customerId: idOf(appt.customer) as ID }, actorType: 'staff' })
  return updated
}

export const rescheduleBooking = async (payload: Payload, tenant: ID, appointmentId: ID, newStart: string) => {
  const repo = forTenant(payload, tenant)
  const appt = await repo.findByID<AppointmentDoc>('appointments', appointmentId)
  if (!appt) throw new BookingError('not-found', 'Appointment not found')
  const salon = await loadSalon(payload, tenant)
  const duration = new Date(appt.end).getTime() - new Date(appt.start).getTime()
  const start = new Date(newStart)
  const end = new Date(start.getTime() + duration)
  const staffId = idOf(appt.staff)
  const staff = await bookableStaff(payload, tenant, staffId)
  const days = await staffDays(payload, salon, localDate(start, salon.timezone ?? 'Asia/Kolkata'), staff, appointmentId)
  const ok = days.some((d) => isFree(d, localDate(start, salon.timezone ?? 'Asia/Kolkata'), salon.timezone ?? 'Asia/Kolkata', start, end))
  if (!ok) throw new BookingError('slot-taken', 'That time is not available.')
  const updated = await repo.update<AppointmentDoc>('appointments', appointmentId, { start: start.toISOString(), end: end.toISOString() })
  await emit(payload, {
    tenant,
    type: 'booking.rescheduled',
    payload: { appointmentId, customerId: idOf(appt.customer) as ID, start: start.toISOString() },
  })
  return updated
}

export const markDepositPaid = async (payload: Payload, tenant: ID, appointmentId: ID, paymentId: ID) => {
  const repo = forTenant(payload, tenant)
  const appt = await repo.findByID<AppointmentDoc>('appointments', appointmentId)
  if (!appt) return null
  await repo.update('appointments', appointmentId, { depositPaid: true, depositPayment: paymentId })
  if (appt.status === 'requested') return confirmBooking(payload, tenant, appointmentId)
  return appt
}

export const joinWaitlist = async (payload: Payload, tenant: ID, input: { customerId: ID; serviceIds: ID[]; date: string; from?: string; to?: string }) =>
  forTenant(payload, tenant).create('waitlist', {
    customer: input.customerId,
    services: input.serviceIds,
    date: input.date,
    from: input.from ?? '10:00',
    to: input.to ?? '20:00',
    status: 'waiting',
  })

export const createGroupBooking = async (payload: Payload, tenant: ID, input: { organiserId: ID; start: string; size: number; occasion?: string }) =>
  forTenant(payload, tenant).create<{ id: ID; code: string }>('group-bookings', {
    organiser: input.organiserId,
    start: input.start,
    size: input.size,
    occasion: input.occasion,
    code: shortCode(6),
    status: 'open',
  })

/**
 * Whether a customer may still change (reschedule or cancel) this appointment online.
 * Only upcoming requested/confirmed appointments, and not inside `cutoffHours` before the start.
 */
export const customerCanChange = (appt: { start: string; status: string }, now = new Date(), cutoffHours = 0): boolean =>
  (appt.status === 'requested' || appt.status === 'confirmed') && new Date(appt.start).getTime() - now.getTime() > cutoffHours * 3_600_000

/** An open group booking by its share code, or null. */
export const findGroupBooking = async (payload: Payload, tenant: ID, code: string) => {
  const group = await forTenant(payload, tenant).findOne<{
    id: ID
    code: string
    start: string
    size: number
    status: string
    occasion?: string | null
    organiser: ID | { id: ID; name?: string | null }
  }>('group-bookings', { code: { equals: code.trim().toUpperCase() } }, 1)
  return group && group.status === 'open' ? group : null
}

export const bookingModule = defineModule({
  key: 'booking',
  feature: 'booking',
  collections: [Availability, Appointments, Waitlist, GroupBookings],
  tenantCollections: ['availability', 'appointments', 'waitlist', 'group-bookings'],
  on: {
    'payment.captured': async ({ payload, event }) => {
      if (event.payload.kind !== 'deposit') return
      const payment = await forTenant(payload, event.tenant).findByID<{ id: ID; appointment?: ID | { id: ID } | null }>('payments', event.payload.paymentId)
      const appointmentId = idOf(payment?.appointment)
      if (appointmentId) await markDepositPaid(payload, event.tenant, appointmentId, event.payload.paymentId)
    },
    'booking.cancelled': async ({ payload, event }) => {
      // Offer the freed slot to the first matching waitlist customer.
      const repo = forTenant(payload, event.tenant)
      const salon = await loadSalon(payload, event.tenant)
      const tz = salon.timezone ?? 'Asia/Kolkata'
      const start = new Date(event.payload.start)
      if (start.getTime() < Date.now()) return
      const date = localDate(start, tz)
      const hhmm = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz }).format(start)
      const waiting = await repo.find<{ id: ID; customer: ID | { id: ID }; from: string; to: string }>('waitlist', {
        where: { and: [{ date: { equals: date } }, { status: { equals: 'waiting' } }] },
        sort: 'createdAt',
      })
      const match = waiting.docs.find((w) => w.from <= hhmm && hhmm < w.to)
      if (!match) return
      await repo.update('waitlist', match.id, { status: 'offered', offeredStart: start.toISOString() })
      await emit(payload, {
        tenant: event.tenant,
        type: 'waitlist.offered',
        payload: { waitlistId: match.id, customerId: idOf(match.customer) as ID, start: start.toISOString() },
      })
    },
  },
})

export * from './slots'
