'use server'

import { asId, forTenant, type ID, localDate, normalizePhone } from '@salon/core'
import {
  BookingError,
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
  offerFromPack,
  type PaymentMode,
  previewReward,
  requestBooking,
  verifyShare,
  walletBalance,
} from '@salon/modules'
import { revalidatePath } from 'next/cache'
import { getPayloadClient } from '@/lib/payload'
import { canManage, requireStaff } from '@/lib/staff'

type Result<T = unknown> = { ok: true; data?: T } | { ok: false; error: string }

const fail = (err: unknown): { ok: false; error: string } => {
  if (err instanceof BookingError) return { ok: false, error: err.message }
  if (err instanceof Error && /not found|Insufficient|Invalid phone|no longer/i.test(err.message)) return { ok: false, error: err.message }
  const details = (err as { data?: { errors?: unknown } })?.data?.errors
  console.error(err instanceof Error ? err.message : err, details ? JSON.stringify(details) : '')
  return { ok: false, error: 'Something went wrong. Please try again.' }
}

const ctx = async (slug: string, opts: { manager?: boolean } = {}) => {
  const { salon, user } = await requireStaff(slug, opts)
  const payload = await getPayloadClient()
  return { salon, user, payload, repo: forTenant(payload, salon.id) }
}

export async function confirmAppt(slug: string, id: ID): Promise<Result> {
  try {
    const { salon, payload } = await ctx(slug)
    await confirmBooking(payload, salon.id, asId(id))
    revalidatePath(`/studio/${slug}`)
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

export async function noShow(slug: string, id: ID): Promise<Result> {
  try {
    const { salon, payload } = await ctx(slug)
    await markNoShow(payload, salon.id, asId(id))
    revalidatePath(`/studio/${slug}`)
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

export async function findCustomer(slug: string, query: string) {
  try {
    const { repo } = await ctx(slug)
    const q = query.trim()
    const phone = normalizePhone(q)
    const res = await repo.find<{ id: ID; name?: string; phone: string; visitCount?: number; segment?: string }>('customers', {
      where: phone ? { phone: { equals: phone } } : { or: [{ name: { like: q } }, { phone: { like: q.replace(/\D/g, '') } }] },
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
    const customer = await repo.findByID<{ id: ID; name?: string; phone: string; visitCount?: number; notes?: string }>('customers', id)
    if (!customer) return { ok: false as const, error: 'Customer not found' }
    const rewards = (
      await repo.find<{ id: ID; title: string; valueType: string; value: number; freebie?: string; validTo?: string; revealed?: boolean }>('rewards', {
        where: { and: [{ customer: { equals: id } }, { status: { equals: 'active' } }, { validTo: { greater_than: new Date().toISOString() } }] },
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

export async function rewardValue(slug: string, rewardId: ID, customerId: ID, subtotal: number) {
  const { salon, payload } = await ctx(slug)
  const { discount } = await previewReward(payload, salon.id, asId(rewardId), asId(customerId), subtotal)
  return discount
}

export interface CheckoutPayload {
  customerId?: ID | null
  phone?: string
  name?: string
  appointmentId?: ID | null
  lines: { serviceId?: ID; name: string; price: number }[]
  manualDiscount?: number
  rewardId?: ID | null
  rewardDiscount?: number
  useWallet?: boolean
  customerPackageId?: ID | null
  packageCovered?: number
  paymentMode: PaymentMode
  designName?: string
  staffId?: ID | null
}

export async function checkout(
  slug: string,
  input: CheckoutPayload,
): Promise<Result<{ visitId: ID; total: number; payUrl?: string; upiUri?: string; customerId: ID; photoTaskId?: ID }>> {
  try {
    const { salon, user, payload, repo } = await ctx(slug)
    let customerId = input.customerId ? asId(input.customerId) : null
    if (!customerId) {
      if (!input.phone) return { ok: false, error: 'Add the customer phone number' }
      const { customer } = await findOrCreateCustomer(payload, salon.id, { phone: input.phone, name: input.name, source: 'walk-in' })
      customerId = customer.id
    }
    const walletBal = input.useWallet ? await walletBalance(payload, salon.id, customerId) : 0
    let rewardDiscount = 0
    if (input.rewardId) {
      const subtotal = input.lines.reduce((n, l) => n + l.price, 0)
      rewardDiscount = (await previewReward(payload, salon.id, asId(input.rewardId), customerId, subtotal)).discount
    }
    const pendingOnline = input.paymentMode === 'payment-link' || input.paymentMode === 'upi'
    const { visit, totals } = await completeVisit(payload, salon.id, {
      customerId,
      staffId: input.staffId ? asId(input.staffId) : user.role === 'artist' ? user.id : null,
      appointmentId: input.appointmentId ? asId(input.appointmentId) : null,
      lines: input.lines.map((l) => ({ ...l, serviceId: l.serviceId ? asId(l.serviceId) : undefined })),
      manualDiscount: canManage(user) || (input.manualDiscount ?? 0) <= 20000 ? input.manualDiscount : 20000,
      rewardId: input.rewardId ? asId(input.rewardId) : null,
      rewardDiscount,
      walletBalance: walletBal,
      useWallet: input.useWallet,
      customerPackageId: input.customerPackageId ? asId(input.customerPackageId) : null,
      packageCovered: input.packageCovered,
      paymentMode: input.paymentMode,
      paymentPending: pendingOnline,
      designName: input.designName,
    })
    let payUrl: string | undefined
    let upiUri: string | undefined
    if (pendingOnline && totals.total > 0) {
      const customer = await repo.findByID<{ name?: string; phone: string }>('customers', customerId)
      const { payment, link } = await createPayment(payload, salon.id, {
        kind: 'visit',
        amount: totals.total,
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
    revalidatePath(`/studio/${slug}`)
    return { ok: true, data: { visitId: visit.id, total: totals.total, payUrl, upiUri, customerId, photoTaskId: task?.id } }
  } catch (err) {
    return fail(err)
  }
}

export async function staffSlots(slug: string, input: { date: string; serviceIds: ID[] }) {
  try {
    const { salon, payload } = await ctx(slug)
    const { slots } = await getAvailableSlots(payload, salon.id, { date: input.date, serviceIds: input.serviceIds.map(asId) })
    return { ok: true as const, data: slots.map((s) => ({ start: s.start.toISOString(), staffIds: s.staffIds })) }
  } catch (err) {
    return fail(err)
  }
}

/** Pre-book the next visit at checkout, or book on behalf of a customer. */
export async function staffBook(
  slug: string,
  input: { customerId: ID; serviceIds: ID[]; start: string; staffId?: ID | null; preBooked?: boolean },
): Promise<Result<{ appointmentId: ID }>> {
  try {
    const { salon, payload } = await ctx(slug)
    const { appointment } = await requestBooking(payload, salon.id, {
      customerId: asId(input.customerId),
      serviceIds: input.serviceIds.map(asId),
      start: input.start,
      staffId: input.staffId ? asId(input.staffId) : null,
      preBooked: input.preBooked,
      source: input.preBooked ? 'chair' : 'staff',
      confirmImmediately: true,
      actorType: 'staff',
    })
    revalidatePath(`/studio/${slug}`)
    return { ok: true, data: { appointmentId: appointment.id } }
  } catch (err) {
    return fail(err)
  }
}

export async function markPaid(slug: string, visitId: ID): Promise<Result> {
  try {
    const { repo } = await ctx(slug)
    await repo.update('visits', asId(visitId), { paidStatus: 'paid' })
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

export async function uploadPhoto(slug: string, form: FormData): Promise<Result<{ id: ID; url: string }>> {
  try {
    const { salon, payload } = await ctx(slug)
    const file = form.get('file')
    if (!(file instanceof File) || !file.type.startsWith('image/')) return { ok: false, error: 'Choose a photo' }
    const media = (await payload.create({
      collection: 'media',
      overrideAccess: true,
      data: { alt: 'Nail photo', kind: String(form.get('kind') ?? 'visit'), tenant: salon.id } as never,
      file: { data: Buffer.from(await file.arrayBuffer()), mimetype: file.type, name: file.name || 'nails.jpg', size: file.size },
    })) as unknown as { id: ID; url: string }
    return { ok: true, data: { id: media.id, url: media.url } }
  } catch (err) {
    return fail(err)
  }
}

export async function finishPhotos(slug: string, input: { taskId: ID; photoIds: ID[]; designName?: string; frame?: string }): Promise<Result> {
  try {
    const { salon, user, payload } = await ctx(slug)
    await completePhotoTask(payload, salon.id, asId(input.taskId), {
      photoIds: input.photoIds.map(asId),
      designName: input.designName,
      frame: input.frame,
      artistName: user.name.split(' ')[0],
    })
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

export async function saveNotes(slug: string, customerId: ID, notes: string): Promise<Result> {
  try {
    const { repo } = await ctx(slug)
    await repo.update('customers', asId(customerId), { notes })
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

export async function saveOffer(slug: string, input: OfferInput): Promise<Result<{ id: ID }>> {
  try {
    const { salon, payload, repo } = await ctx(slug, { manager: true })
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
    if (!offer) return { ok: false, error: 'Could not save' }
    if (input.launch) await launchOffer(payload, salon.id, offer.id)
    revalidatePath(`/studio/${slug}/campaigns`)
    return { ok: true, data: { id: offer.id } }
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

export async function newTrackingLink(slug: string, input: { label: string; source: string; target: string }): Promise<Result> {
  try {
    const { salon, payload } = await ctx(slug, { manager: true })
    await createTrackingLink(payload, salon.id, input)
    revalidatePath(`/studio/${slug}/settings`)
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
