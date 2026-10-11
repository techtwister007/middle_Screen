'use server'

import { randomBytes } from 'node:crypto'
import { asId, formatINR, forTenant, type ID, idOf, localDate, normalizePhone, salonLink } from '@salon/core'
import {
  type AppointmentDoc,
  BookingError,
  cancelBooking,
  completePhotoTask,
  completeVisit,
  confirmBooking,
  createPayment,
  createTrackingLink,
  findOrCreateCustomer,
  getAvailableSlots,
  launchOffer,
  manualMessageLink,
  markNoShow,
  notifyRunningLate,
  offerFromPack,
  type PaymentMode,
  previewReward,
  remindDueCustomers,
  requestBooking,
  rescheduleBooking,
  sendToCustomer,
  type VisitDoc,
  verifyShare,
  walletBalance,
  weeklyCollage,
} from '@salon/modules'
import { revalidatePath } from 'next/cache'
import type { Where } from 'payload'
import { getPayloadClient } from '@/lib/payload'
import { canManage, requireStaff, type StaffUser } from '@/lib/staff'

type Result<T = unknown> = { ok: true; data?: T } | { ok: false; error: string }

const SAFE_MESSAGE = /not found|Insufficient|Invalid phone|no longer|not available|another artist|Only |Pick |Choose |Add the|can't|cannot/i

/** Known, user-safe errors pass through; anything else is logged with a short ref the owner can quote to support. */
const fail = (err: unknown): { ok: false; error: string } => {
  if (err instanceof Error && err.message.startsWith('NEXT_')) throw err
  if (err instanceof BookingError) return { ok: false, error: err.message }
  const details = (err as { data?: { errors?: { message?: string; path?: string }[] } })?.data?.errors
  if (details?.length) return { ok: false, error: details.map((d) => d.message ?? d.path ?? '').join(', ') }
  if (err instanceof Error && SAFE_MESSAGE.test(err.message) && err.message.length < 160) return { ok: false, error: err.message }
  const ref = randomBytes(2).toString('hex').toUpperCase()
  console.error(`[studio ref ${ref}]`, err)
  return { ok: false, error: `Something went wrong (ref ${ref}). Please try again.` }
}

const ctx = async (slug: string, opts: { manager?: boolean } = {}) => {
  const { salon, user } = await requireStaff(slug, opts)
  const payload = await getPayloadClient()
  return { salon, user, payload, repo: forTenant(payload, salon.id) }
}
type Ctx = Awaited<ReturnType<typeof ctx>>

/** Artists work on their own appointments and unassigned requests; managers on everything. */
const canTouch = (user: StaffUser, appt: { staff?: unknown }) => {
  if (canManage(user)) return true
  const staff = idOf(appt.staff)
  return staff == null || String(staff) === String(user.id)
}

const loadAppt = async (c: Ctx, id: ID) => {
  const appt = await c.repo.findByID<AppointmentDoc & { notes?: string | null }>('appointments', asId(id))
  if (!appt) throw new BookingError('not-found', 'Appointment not found')
  if (!canTouch(c.user, appt)) throw new BookingError('not-allowed', 'That appointment belongs to another artist')
  return appt
}

/** Checks that a staff id is on this salon's team (so revenue is never credited to a stranger). */
const teamMember = async (c: Ctx, staffId: ID | null | undefined) => {
  if (!staffId) return null
  const res = await c.payload.find({
    collection: 'users',
    overrideAccess: true,
    depth: 0,
    limit: 1,
    where: { and: [{ id: { equals: asId(staffId) } }, { 'tenants.tenant': { equals: c.salon.id } }] },
  })
  const m = res.docs[0] as unknown as { id: ID; name: string } | undefined
  if (!m) throw new Error('Choose an artist from your team')
  return m
}

// ── Appointments ──────────────────────────────────────────────────────────────

export async function confirmAppt(slug: string, id: ID): Promise<Result> {
  try {
    const c = await ctx(slug)
    const appt = await loadAppt(c, id)
    // An artist confirming an unassigned request takes it on.
    if (!idOf(appt.staff) && c.user.role === 'artist') await c.repo.update('appointments', appt.id, { staff: c.user.id })
    await confirmBooking(c.payload, c.salon.id, appt.id)
    revalidatePath(`/studio/${slug}`, 'layout')
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

/** Decline a request or cancel a booking. The customer is told on WhatsApp; deposits are handled by payments. */
export async function cancelAppt(slug: string, id: ID, reason: string): Promise<Result> {
  try {
    const c = await ctx(slug)
    const appt = await loadAppt(c, id)
    if (!['requested', 'confirmed'].includes(appt.status)) return { ok: false, error: 'Only upcoming appointments can be cancelled' }
    await cancelBooking(c.payload, c.salon.id, appt.id, reason.trim().slice(0, 200) || 'Cancelled by the salon', 'staff')
    revalidatePath(`/studio/${slug}`, 'layout')
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

export async function rescheduleAppt(slug: string, id: ID, start: string, staffId?: ID | null): Promise<Result> {
  try {
    const c = await ctx(slug)
    const appt = await loadAppt(c, id)
    if (staffId && !canManage(c.user) && String(staffId) !== String(c.user.id)) return { ok: false, error: 'Only a manager can move it to another artist' }
    if (staffId) await teamMember(c, staffId)
    // Moving a request also confirms it: the salon has picked the time.
    await rescheduleBooking(c.payload, c.salon.id, appt.id, start, { staffId: staffId ?? null })
    if (appt.status === 'requested') await confirmBooking(c.payload, c.salon.id, appt.id)
    revalidatePath(`/studio/${slug}`, 'layout')
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

export async function noShow(slug: string, id: ID): Promise<Result> {
  try {
    const c = await ctx(slug)
    const appt = await loadAppt(c, id)
    await markNoShow(c.payload, c.salon.id, appt.id)
    revalidatePath(`/studio/${slug}`, 'layout')
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

export async function runningLate(slug: string, appointmentId: ID, minutes: number): Promise<Result> {
  try {
    const c = await ctx(slug)
    const appt = await loadAppt(c, appointmentId)
    if (!Number.isFinite(minutes) || minutes < 5 || minutes > 180) return { ok: false, error: 'Pick 5–180 minutes' }
    const msg = await notifyRunningLate(c.payload, c.salon.id, appt.id, Math.round(minutes))
    return msg ? { ok: true } : { ok: false, error: 'Appointment not found' }
  } catch (err) {
    return fail(err)
  }
}

// ── Customers ─────────────────────────────────────────────────────────────────

interface CustomerHit {
  id: ID
  name?: string
  phone: string
  visitCount?: number
  segment?: string
  notes?: string
  allergies?: string
}

/** Name (case-insensitive, contains) or phone. Partial phone search needs at least 3 digits. */
export async function findCustomer(slug: string, query: string) {
  try {
    const { repo } = await ctx(slug)
    const q = query.trim()
    if (!q) return { ok: true as const, data: [] as CustomerHit[] }
    const digits = q.replace(/\D/g, '')
    const phone = digits.length >= 10 ? normalizePhone(q) : null
    const or: Where[] = [
      ...(/[a-z]/i.test(q) ? [{ name: { contains: q } }] : []),
      ...(digits.length >= 3 ? [{ phone: { contains: digits.length > 10 ? digits.slice(-10) : digits } }] : []),
    ]
    if (!phone && !or.length) return { ok: true as const, data: [] as CustomerHit[] }
    const res = await repo.find<CustomerHit>('customers', {
      where: phone ? { phone: { equals: phone } } : { or },
      sort: '-visitCount',
      limit: 8,
    })
    return { ok: true as const, data: res.docs }
  } catch (err) {
    return fail(err)
  }
}

export async function customerForCheckout(slug: string, customerId: ID) {
  try {
    const { salon, payload, repo } = await ctx(slug)
    const id = asId(customerId)
    const customer = await repo.findByID<CustomerHit>('customers', id)
    if (!customer) return { ok: false as const, error: 'Customer not found' }
    const rewards = (
      await repo.find<{
        id: ID
        kind: string
        title: string
        valueType: string
        value: number
        freebie?: string
        validTo?: string
        revealed?: boolean
        minSpend?: number
      }>('rewards', {
        where: { and: [{ customer: { equals: id } }, { status: { equals: 'active' } }, { validTo: { greater_than: new Date().toISOString() } }] },
        sort: 'validTo',
      })
    ).docs.filter((r) => r.revealed !== false)
    const wallet = await walletBalance(payload, salon.id, id)
    const packages = (
      await repo.find<{ id: ID; package: { name: string }; remaining: { service: ID | { id: ID }; quantity: number }[] }>('customer-packages', {
        where: { and: [{ customer: { equals: id } }, { status: { equals: 'active' } }] },
        depth: 1,
      })
    ).docs
    return { ok: true as const, data: { customer, rewards, wallet, packages } }
  } catch (err) {
    return fail(err)
  }
}

export async function saveNotes(slug: string, customerId: ID, notes: string): Promise<Result> {
  return saveCustomerCare(slug, customerId, { notes })
}

/** Staff notes and allergies (allergies show as a warning on Today and at checkout). */
export async function saveCustomerCare(slug: string, customerId: ID, patch: { notes?: string; allergies?: string }): Promise<Result> {
  try {
    const { repo } = await ctx(slug)
    const data: Record<string, string> = {}
    if (patch.notes !== undefined) data.notes = patch.notes.slice(0, 2000)
    if (patch.allergies !== undefined) data.allergies = patch.allergies.slice(0, 500)
    const updated = await repo.update('customers', asId(customerId), data)
    if (!updated) return { ok: false, error: 'Customer not found' }
    revalidatePath(`/studio/${slug}/customers/${customerId}`)
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

export async function setFollowUp(slug: string, ratingId: ID, followUp: 'called' | 'resolved', note?: string): Promise<Result> {
  try {
    const { repo } = await ctx(slug)
    await repo.update('ratings', asId(ratingId), { followUp, followUpNote: note })
    revalidatePath(`/studio/${slug}`)
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

export async function whatsappLink(
  slug: string,
  customerId: ID,
  template: 'refill_due' | 'winback' | 'nudge_new_designs' | 'aftercare',
  link: string,
): Promise<Result<{ url: string }>> {
  try {
    const { salon, payload } = await ctx(slug)
    const url = await manualMessageLink(payload, salon.id, asId(customerId), { template, link })
    return url ? { ok: true, data: { url } } : { ok: false, error: 'Customer not found' }
  } catch (err) {
    return fail(err)
  }
}

// ── Checkout ──────────────────────────────────────────────────────────────────

export async function rewardValue(slug: string, rewardId: ID, customerId: ID, subtotal: number) {
  const { salon, payload } = await ctx(slug)
  const { discount } = await previewReward(payload, salon.id, asId(rewardId), asId(customerId), subtotal)
  return discount
}

type SplitMode = 'upi' | 'cash' | 'card'

export interface CheckoutPayload {
  customerId?: ID | null
  phone?: string
  name?: string
  appointmentId?: ID | null
  lines: { serviceId?: ID; name: string; price: number }[]
  manualDiscount?: number
  rewardId?: ID | null
  rewardDiscount?: number
  /** New customer: apply the first-visit (or friend-referral) gift they get on sign-up */
  applyFirstVisit?: boolean
  useWallet?: boolean
  customerPackageId?: ID | null
  packageCovered?: number
  paymentMode: PaymentMode
  /** Two modes, e.g. part cash and part UPI. Amounts in paise must add up to the total. */
  split?: { mode: SplitMode; amount: number }[]
  tip?: number
  designName?: string
  staffId?: ID | null
}

export interface CheckoutDone {
  visitId: ID
  total: number
  tip: number
  payUrl?: string
  upiUri?: string
  customerId: ID
  photoTaskId?: ID
  rewardApplied?: string
}

export async function checkout(slug: string, input: CheckoutPayload): Promise<Result<CheckoutDone>> {
  try {
    const c = await ctx(slug)
    const { salon, user, payload, repo } = c
    if (!input.lines.length) return { ok: false, error: 'Add at least one service' }
    let customerId = input.customerId ? asId(input.customerId) : null
    if (!customerId) {
      if (!input.phone) return { ok: false, error: 'Add the customer phone number' }
      const { customer } = await findOrCreateCustomer(payload, salon.id, { phone: input.phone, name: input.name, source: 'walk-in' })
      customerId = customer.id
    }
    const subtotal = input.lines.reduce((n, l) => n + l.price, 0)
    let rewardId = input.rewardId ? asId(input.rewardId) : null
    // The first-visit gift is issued when the customer is created (just above, for walk-ins), so pick it up now.
    if (!rewardId && input.applyFirstVisit) {
      const gift = await repo.findOne<{ id: ID }>('rewards', {
        and: [
          { customer: { equals: customerId } },
          { kind: { in: ['first-visit', 'referral'] } },
          { status: { equals: 'active' } },
          { validTo: { greater_than: new Date().toISOString() } },
        ],
      })
      rewardId = gift?.id ?? null
    }
    let rewardDiscount = 0
    let rewardTitle: string | undefined
    if (rewardId) {
      const r = await previewReward(payload, salon.id, rewardId, customerId, subtotal)
      rewardDiscount = r.discount
      rewardTitle = r.reward?.title
    }
    const walletBal = input.useWallet ? await walletBalance(payload, salon.id, customerId) : 0
    const staff = await teamMember(c, input.staffId ?? (user.role === 'artist' ? user.id : null))
    const split = (input.split ?? []).filter((s) => s.amount > 0).map((s) => ({ mode: s.mode, amount: Math.round(s.amount) }))
    const pendingOnline = split.length < 2 && (input.paymentMode === 'payment-link' || input.paymentMode === 'upi')
    const { visit, totals } = await completeVisit(payload, salon.id, {
      customerId,
      staffId: staff?.id ?? null,
      appointmentId: input.appointmentId ? asId(input.appointmentId) : null,
      lines: input.lines.map((l) => ({ ...l, serviceId: l.serviceId ? asId(l.serviceId) : undefined })),
      manualDiscount: canManage(user) || (input.manualDiscount ?? 0) <= 20000 ? input.manualDiscount : 20000,
      rewardId,
      rewardDiscount,
      walletBalance: walletBal,
      useWallet: input.useWallet,
      customerPackageId: input.customerPackageId ? asId(input.customerPackageId) : null,
      packageCovered: input.packageCovered,
      paymentMode: input.paymentMode,
      paymentSplit: split.length > 1 ? split : undefined,
      tip: Math.max(0, Math.round(input.tip ?? 0)),
      paymentPending: pendingOnline,
      designName: input.designName,
    })
    if (split.length > 1) {
      const paid = split.reduce((n, s) => n + s.amount, 0)
      if (paid !== totals.total + Math.max(0, Math.round(input.tip ?? 0)))
        await repo.update('visits', visit.id, {
          notes: `Split payment added up to ${formatINR(paid)} (bill + tip ${formatINR(totals.total + (input.tip ?? 0))})`,
        })
    }
    let payUrl: string | undefined
    let upiUri: string | undefined
    const due = totals.total + Math.max(0, Math.round(input.tip ?? 0))
    if (pendingOnline && due > 0) {
      const customer = await repo.findByID<{ name?: string; phone: string }>('customers', customerId)
      const { payment, link } = await createPayment(payload, salon.id, {
        kind: 'visit',
        amount: due,
        customerId,
        visitId: visit.id,
        description: `${salon.name} visit`,
        customer: { name: customer?.name ?? undefined, phone: customer?.phone },
      })
      await repo.update('visits', visit.id, { payment: payment.id })
      payUrl = link.url
      upiUri = link.upiUri
    }
    const task = await repo.findOne<{ id: ID }>('photo-tasks', { visit: { equals: visit.id } })
    revalidatePath(`/studio/${slug}`, 'layout')
    return {
      ok: true,
      data: {
        visitId: visit.id,
        total: totals.total,
        tip: Math.max(0, Math.round(input.tip ?? 0)),
        payUrl,
        upiUri,
        customerId,
        photoTaskId: task?.id,
        rewardApplied: totals.rewardDiscount > 0 ? rewardTitle : undefined,
      },
    }
  } catch (err) {
    return fail(err)
  }
}

export async function markPaid(slug: string, visitId: ID): Promise<Result> {
  try {
    const { repo } = await ctx(slug)
    const updated = await repo.update('visits', asId(visitId), { paidStatus: 'paid' })
    return updated ? { ok: true } : { ok: false, error: 'Visit not found' }
  } catch (err) {
    return fail(err)
  }
}

/** WhatsApp receipt (utility template). Falls back to a wa.me link the staff can open when it can't be sent. */
export async function sendReceipt(slug: string, visitId: ID): Promise<Result<{ sentAt?: string; url?: string }>> {
  try {
    const { salon, payload, repo } = await ctx(slug)
    const visit = await repo.findByID<VisitDoc>('visits', asId(visitId))
    if (!visit) return { ok: false, error: 'Visit not found' }
    const customerId = idOf(visit.customer) as ID
    const vars = {
      amount: formatINR((visit.total ?? 0) + (visit.tip ?? 0)),
      design: visit.designName || visit.lines.map((l) => l.name).join(', '),
    }
    const link = salonLink(salon.slug, '/care')
    const msg = (await sendToCustomer(payload, salon.id, customerId, { template: 'receipt', vars, link, relatedEvent: `visit:${visit.id}` })) as {
      status?: string
      skipReason?: string
    } | null
    if (msg?.status === 'sent') {
      const sentAt = new Date().toISOString()
      await repo.update('visits', visit.id, { receiptSentAt: sentAt })
      revalidatePath(`/studio/${slug}/customers/${customerId}`)
      return { ok: true, data: { sentAt } }
    }
    const url = await manualMessageLink(payload, salon.id, customerId, { template: 'receipt', vars, link })
    return url ? { ok: true, data: { url } } : { ok: false, error: 'Could not send the receipt' }
  } catch (err) {
    return fail(err)
  }
}

const AUDIT = (user: StaffUser, text: string) => `[${new Date().toISOString().slice(0, 16).replace('T', ' ')} ${user.name.split(' ')[0]}] ${text}`

/** Managers fix a completed bill. The change is written to the visit's notes and the customer's spend is adjusted. */
export async function editVisit(
  slug: string,
  visitId: ID,
  input: {
    lines: { name: string; price: number; serviceId?: ID | null }[]
    manualDiscount: number
    tip: number
    paymentMode: PaymentMode
    staffId?: ID | null
    reason: string
  },
): Promise<Result<{ total: number }>> {
  try {
    const c = await ctx(slug, { manager: true })
    const visit = await c.repo.findByID<VisitDoc & { manualDiscount?: number; rewardDiscount?: number }>('visits', asId(visitId))
    if (!visit) return { ok: false, error: 'Visit not found' }
    if (!input.reason.trim()) return { ok: false, error: 'Add a short reason for the change' }
    const lines = input.lines
      .filter((l) => l.name.trim())
      .map((l) => ({ name: l.name.trim(), price: Math.max(0, Math.round(l.price)), service: l.serviceId ? asId(l.serviceId) : undefined, quantity: 1 }))
    if (!lines.length) return { ok: false, error: 'A bill needs at least one line' }
    const staff = await teamMember(c, input.staffId)
    const subtotal = lines.reduce((n, l) => n + l.price, 0)
    let remaining = subtotal
    const take = (v: number) => {
      const t = Math.max(0, Math.min(remaining, Math.round(v)))
      remaining -= t
      return t
    }
    const packageCovered = take(visit.packageCovered ?? 0)
    const manualDiscount = take(input.manualDiscount)
    const rewardDiscount = take(visit.rewardDiscount ?? 0)
    const walletApplied = take(visit.walletApplied ?? 0)
    const total = remaining
    const note = AUDIT(c.user, `Edited: ${formatINR(visit.total)} → ${formatINR(total)}. ${input.reason.trim()}`)
    await c.repo.update('visits', visit.id, {
      lines,
      subtotal,
      packageCovered,
      manualDiscount,
      rewardDiscount,
      walletApplied,
      total,
      tip: Math.max(0, Math.round(input.tip)),
      paymentMode: input.paymentMode,
      paymentSplit: input.paymentMode === 'mixed' ? visit.paymentSplit : [],
      staff: staff?.id ?? null,
      notes: [visit.notes, note].filter(Boolean).join('\n'),
    })
    const customerId = idOf(visit.customer) as ID
    const customer = await c.repo.findByID<{ lifetimeSpend?: number }>('customers', customerId)
    if (customer) await c.repo.update('customers', customerId, { lifetimeSpend: Math.max(0, (customer.lifetimeSpend ?? 0) + total - visit.total) })
    revalidatePath(`/studio/${slug}`, 'layout')
    return { ok: true, data: { total } }
  } catch (err) {
    return fail(err)
  }
}

/** Voids a bill entered by mistake: amounts go to zero (so revenue reports drop it), the original is kept in the notes. */
export async function voidVisit(slug: string, visitId: ID, reason: string): Promise<Result> {
  try {
    const c = await ctx(slug, { manager: true })
    const visit = await c.repo.findByID<VisitDoc>('visits', asId(visitId))
    if (!visit) return { ok: false, error: 'Visit not found' }
    if (!reason.trim()) return { ok: false, error: 'Add a short reason' }
    if (visit.notes?.includes('VOID:')) return { ok: false, error: 'This bill is already void' }
    const original = `${visit.lines.map((l) => `${l.name} ${formatINR(l.price)}`).join(', ')}; total ${formatINR(visit.total)}${visit.tip ? `, tip ${formatINR(visit.tip)}` : ''}`
    await c.repo.update('visits', visit.id, {
      lines: visit.lines.map((l) => ({ name: l.name, service: idOf(l.service) ?? undefined, price: 0, quantity: l.quantity ?? 1 })),
      subtotal: 0,
      manualDiscount: 0,
      rewardDiscount: 0,
      walletApplied: 0,
      packageCovered: 0,
      total: 0,
      tip: 0,
      paymentSplit: [],
      notes: [visit.notes, AUDIT(c.user, `VOID: ${reason.trim()}. Was: ${original}`)].filter(Boolean).join('\n'),
    })
    const customerId = idOf(visit.customer) as ID
    const customer = await c.repo.findByID<{ lifetimeSpend?: number; visitCount?: number }>('customers', customerId)
    if (customer)
      await c.repo.update('customers', customerId, {
        lifetimeSpend: Math.max(0, (customer.lifetimeSpend ?? 0) - visit.total),
        visitCount: Math.max(0, (customer.visitCount ?? 0) - 1),
      })
    revalidatePath(`/studio/${slug}`, 'layout')
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

// ── Booking from Studio ───────────────────────────────────────────────────────

export async function staffSlots(slug: string, input: { date: string; serviceIds: ID[]; staffId?: ID | null }) {
  try {
    const { salon, payload } = await ctx(slug)
    if (!input.serviceIds.length) return { ok: true as const, data: [] as { start: string; staffIds: ID[] }[] }
    const { slots } = await getAvailableSlots(payload, salon.id, { date: input.date, serviceIds: input.serviceIds.map(asId), staffId: input.staffId ?? null })
    return { ok: true as const, data: slots.map((s) => ({ start: s.start.toISOString(), staffIds: s.staffIds })) }
  } catch (err) {
    return fail(err)
  }
}

/** Pre-book the next visit at checkout, add a walk-in, or book on behalf of a customer. */
export async function staffBook(
  slug: string,
  input: {
    customerId?: ID | null
    phone?: string
    name?: string
    serviceIds: ID[]
    start: string
    staffId?: ID | null
    preBooked?: boolean
    walkIn?: boolean
    notes?: string
  },
): Promise<Result<{ appointmentId: ID; customerId: ID }>> {
  try {
    const c = await ctx(slug)
    if (!input.serviceIds.length) return { ok: false, error: 'Choose at least one service' }
    let customerId = input.customerId ? asId(input.customerId) : null
    if (!customerId) {
      if (!input.phone) return { ok: false, error: 'Add the customer phone number' }
      const { customer } = await findOrCreateCustomer(c.payload, c.salon.id, {
        phone: input.phone,
        name: input.name,
        source: input.walkIn ? 'walk-in' : 'staff',
      })
      customerId = customer.id
    }
    if (input.staffId) await teamMember(c, input.staffId)
    const { appointment } = await requestBooking(c.payload, c.salon.id, {
      customerId,
      serviceIds: input.serviceIds.map(asId),
      start: input.start,
      staffId: input.staffId ? asId(input.staffId) : null,
      preBooked: input.preBooked,
      notes: input.notes?.slice(0, 500) || undefined,
      source: input.preBooked ? 'chair' : input.walkIn ? 'walk-in' : 'staff',
      confirmImmediately: true,
      actorType: 'staff',
    })
    revalidatePath(`/studio/${slug}`, 'layout')
    return { ok: true, data: { appointmentId: appointment.id, customerId } }
  } catch (err) {
    return fail(err)
  }
}

// ── Photo corner ──────────────────────────────────────────────────────────────

export async function uploadPhoto(slug: string, form: FormData): Promise<Result<{ id: ID; url: string }>> {
  try {
    const { salon, payload } = await ctx(slug)
    const file = form.get('file')
    if (!(file instanceof File) || !file.type.startsWith('image/')) return { ok: false, error: 'Choose a photo' }
    if (file.size > 15 * 1024 * 1024) return { ok: false, error: 'Photo is too large (max 15 MB)' }
    const media = (await payload.create({
      collection: 'media',
      overrideAccess: true,
      data: { alt: 'Nail photo', kind: String(form.get('kind') ?? 'visit'), tenant: salon.id } as never,
      file: { data: Buffer.from(await file.arrayBuffer()), mimetype: file.type, name: file.name || 'nails.jpg', size: file.size },
    })) as unknown as { id: ID; url: string; sizes?: { card?: { url?: string } } }
    return { ok: true, data: { id: media.id, url: media.sizes?.card?.url ?? media.url } }
  } catch (err) {
    return fail(err)
  }
}

/** Removes a shot that hasn't been sent yet. */
export async function deletePhoto(slug: string, mediaId: ID): Promise<Result> {
  try {
    const { repo } = await ctx(slug)
    await repo.delete('media', asId(mediaId))
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

export async function finishPhotos(
  slug: string,
  input: { taskId: ID; photoIds: ID[]; designName?: string; frame?: string; artistId?: ID | null },
): Promise<Result> {
  try {
    const c = await ctx(slug)
    if (!input.photoIds.length) return { ok: false, error: 'Take at least one photo' }
    const artist = input.artistId ? await teamMember(c, input.artistId) : null
    await completePhotoTask(c.payload, c.salon.id, asId(input.taskId), {
      photoIds: input.photoIds.map(asId),
      designName: input.designName,
      frame: input.frame,
      artistName: (artist?.name ?? c.user.name).split(' ')[0],
    })
    if (artist) await c.repo.update('photo-tasks', asId(input.taskId), { staff: artist.id })
    revalidatePath(`/studio/${slug}/photos`)
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

/** No photos for this visit (customer in a hurry, didn't want them). The task leaves the list. */
export async function skipPhotoTask(slug: string, taskId: ID): Promise<Result> {
  try {
    const { repo } = await ctx(slug)
    const task = await repo.findByID<{ id: ID; status: string }>('photo-tasks', asId(taskId))
    if (!task) return { ok: false, error: 'Photo task not found' }
    if (task.status !== 'pending') return { ok: false, error: 'Photos were already sent for this visit' }
    await repo.delete('photo-tasks', task.id)
    revalidatePath(`/studio/${slug}/photos`)
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

export async function verify(slug: string, taskId: ID): Promise<Result> {
  try {
    const { salon, payload } = await ctx(slug)
    await verifyShare(payload, salon.id, asId(taskId))
    revalidatePath(`/studio/${slug}/photos`)
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

/** The customer said they shared, but the post isn't there: back to "sent", no points. */
export async function notPosted(slug: string, taskId: ID): Promise<Result> {
  try {
    const { repo } = await ctx(slug)
    const task = await repo.findByID<{ id: ID; status: string }>('photo-tasks', asId(taskId))
    if (!task || task.status !== 'shared') return { ok: false, error: 'Nothing to check for this one' }
    await repo.update('photo-tasks', task.id, { status: 'sent' })
    revalidatePath(`/studio/${slug}/photos`)
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

export async function makeCollage(slug: string): Promise<Result> {
  try {
    const { salon, payload } = await ctx(slug)
    const media = await weeklyCollage(payload, salon.id)
    revalidatePath(`/studio/${slug}/photos`)
    return media ? { ok: true } : { ok: false, error: 'Need at least 2 photo sets from the last 7 days' }
  } catch (err) {
    return fail(err)
  }
}

// ── Campaigns & reminders ─────────────────────────────────────────────────────

export interface OfferInput {
  title: string
  description?: string
  kind: 'offer' | 'slot-filler' | 'festival' | 'first-visit'
  valueType: 'amount' | 'percent' | 'freebie'
  value: number
  freebie?: string
  audience: string[]
  endsAt?: string
  slot?: { date?: string; from?: string; to?: string }
  packId?: ID | null
  launch: boolean
}

export async function saveOffer(slug: string, input: OfferInput): Promise<Result<{ id: ID; sent?: number }>> {
  try {
    const { salon, payload, repo } = await ctx(slug, { manager: true })
    if (!input.title.trim()) return { ok: false, error: 'Add a headline' }
    const base = input.packId ? await offerFromPack(payload, salon.id, asId(input.packId)) : null
    const data = {
      title: input.title,
      description: input.description,
      kind: input.kind,
      valueType: input.valueType,
      value: input.valueType === 'amount' ? Math.round(input.value * 100) : input.value,
      freebie: input.freebie,
      audience: input.audience,
      endsAt: input.endsAt,
      slot: input.slot,
      status: 'draft',
      showOnHome: true,
    }
    const offer = base ? await repo.update<{ id: ID }>('offers', base.id, data) : await repo.create<{ id: ID }>('offers', data)
    if (!offer) return { ok: false, error: 'Could not save the offer' }
    let sent: number | undefined
    if (input.launch) {
      await launchOffer(payload, salon.id, offer.id)
      sent = await repo.count('messages', { and: [{ relatedEvent: { equals: `offer:${offer.id}` } }, { status: { equals: 'sent' } }] })
    }
    revalidatePath(`/studio/${slug}/campaigns`)
    return { ok: true, data: { id: offer.id, sent } }
  } catch (err) {
    return fail(err)
  }
}

export async function audienceSize(slug: string, segments: string[]) {
  const { repo } = await ctx(slug)
  const segs = segments.length ? segments : ['due', 'at-risk', 'regular']
  return repo.count('customers', { and: [{ segment: { in: segs } }, { 'consents.marketing': { equals: true } }] })
}

export async function launch(slug: string, offerId: ID): Promise<Result> {
  try {
    const { salon, payload } = await ctx(slug, { manager: true })
    await launchOffer(payload, salon.id, asId(offerId))
    revalidatePath(`/studio/${slug}/campaigns`)
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

export async function endOffer(slug: string, offerId: ID): Promise<Result> {
  try {
    const { repo } = await ctx(slug, { manager: true })
    await repo.update('offers', asId(offerId), { status: 'ended', endsAt: new Date().toISOString() })
    revalidatePath(`/studio/${slug}/campaigns`)
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

/** Everyone in the "due" group, so Studio can confirm the count and send in batches with progress. */
export async function dueCustomerIds(slug: string): Promise<Result<{ ids: ID[] }>> {
  try {
    const { repo } = await ctx(slug, { manager: true })
    const res = await repo.find<{ id: ID }>('customers', { where: { segment: { equals: 'due' } }, limit: 2000, depth: 0 })
    return { ok: true, data: { ids: res.docs.map((d) => d.id) } }
  } catch (err) {
    return fail(err)
  }
}

/** Refill reminders to the given due customers (or everyone due). Already-booked or reminded-this-week are skipped. */
export async function remindDue(slug: string, customerIds?: ID[]): Promise<Result<{ sent: number; skipped: number }>> {
  try {
    const { salon, payload } = await ctx(slug, { manager: true })
    const r = await remindDueCustomers(payload, salon.id, customerIds?.length ? { customerIds: customerIds.map(asId) } : {})
    revalidatePath(`/studio/${slug}/customers`)
    return { ok: true, data: { sent: r.sent, skipped: r.skipped } }
  } catch (err) {
    return fail(err)
  }
}

export async function newTrackingLink(slug: string, input: { label: string; source: string; target: string }): Promise<Result> {
  try {
    const { salon, payload } = await ctx(slug, { manager: true })
    if (!input.label.trim()) return { ok: false, error: 'Give the link a name' }
    await createTrackingLink(payload, salon.id, { ...input, label: input.label.trim() })
    revalidatePath(`/studio/${slug}/settings/qr`)
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

/** Reception kiosk: a walk-in types their number and joins today's list. */
export async function kioskCheckIn(
  slug: string,
  input: { phone: string; name?: string; serviceId: ID; consent: boolean },
): Promise<Result<{ name: string; start?: string }>> {
  try {
    const { salon, payload } = await ctx(slug)
    const { customer } = await findOrCreateCustomer(payload, salon.id, {
      phone: input.phone,
      name: input.name,
      source: 'walk-in',
      marketingConsent: input.consent,
    })
    const today = localDate(new Date(), salon.timezone ?? 'Asia/Kolkata')
    const { slots } = await getAvailableSlots(payload, salon.id, { date: today, serviceIds: [asId(input.serviceId)] })
    let start: string | undefined
    if (slots[0]) {
      await requestBooking(payload, salon.id, {
        customerId: customer.id,
        serviceIds: [asId(input.serviceId)],
        start: slots[0].start.toISOString(),
        source: 'walk-in',
        confirmImmediately: true,
        actorType: 'staff',
      })
      start = slots[0].start.toISOString()
    }
    return { ok: true, data: { name: customer.name ?? '', start } }
  } catch (err) {
    return fail(err)
  }
}
