'use server'

import { type ID, asId, forTenant, idOf, normalizePhone } from '@salon/core'
import {
  BookingError,
  OtpError,
  TryOnError,
  VoteError,
  aiTryOn,
  cancelBooking,
  castVote,
  claimOffer,
  createGiftCard,
  createGroupBooking,
  createOtp,
  createPayment,
  enterContest,
  featureInGallery,
  findOrCreateCustomer,
  getAvailableSlots,
  joinWaitlist,
  recordInvite,
  recordShare,
  redeemGiftCard,
  requestBooking,
  rescheduleBooking,
  revealScratchCard,
  sendOtp,
  submitRating,
  verifyOtp,
} from '@salon/modules'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { getPayloadClient } from '@/lib/payload'
import { getSalonBySlug, salonFeatures } from '@/lib/salon'
import { clearCustomerSession, createCustomerSession, getAttribution, getCustomerSession } from '@/lib/session'

type Result<T = unknown> = { ok: true; data?: T } | { ok: false; error: string }

const fail = (err: unknown): { ok: false; error: string } => {
  if (err instanceof BookingError || err instanceof OtpError || err instanceof TryOnError || err instanceof VoteError) return { ok: false, error: err.message }
  if (err instanceof Error && /not valid|expired|no longer|already|Insufficient|Not your/i.test(err.message)) return { ok: false, error: err.message }
  const details = (err as { data?: { errors?: unknown } })?.data?.errors
  console.error(err instanceof Error ? err.message : err, details ? JSON.stringify(details) : '')
  return { ok: false, error: 'Something went wrong. Please try again.' }
}

const ctx = async (slug: string) => {
  const salon = await getSalonBySlug(slug)
  if (!salon) throw new Error('Salon not found')
  const payload = await getPayloadClient()
  return { salon, payload, repo: forTenant(payload, salon.id) }
}

const sessionCustomer = async (slug: string) => {
  const { salon, payload, repo } = await ctx(slug)
  const session = await getCustomerSession(slug, salon.id)
  if (!session) throw new BookingError('not-allowed', 'Please log in first')
  return { salon, payload, repo, customerId: session.customerId }
}

// ---------------------------------------------------------------------------
// Login with phone + one-time code
// ---------------------------------------------------------------------------

export async function requestCode(slug: string, phone: string): Promise<Result<{ phone: string }>> {
  try {
    const { salon, payload } = await ctx(slug)
    const { phone: normalised, code } = await createOtp(payload, salon.id, phone)
    await sendOtp(payload, salon.id, normalised, code)
    return { ok: true, data: { phone: normalised } }
  } catch (err) {
    return fail(err)
  }
}

export async function verifyCode(
  slug: string,
  input: { phone: string; code: string; name?: string; marketingConsent?: boolean },
): Promise<Result<{ created: boolean }>> {
  try {
    const { salon, payload } = await ctx(slug)
    const phone = await verifyOtp(payload, salon.id, input.phone, input.code)
    const attribution = await getAttribution(slug)
    const { customer, created } = await findOrCreateCustomer(payload, salon.id, {
      phone,
      name: input.name?.trim() || undefined,
      source: attribution.src ?? 'direct',
      referralCode: attribution.ref,
      marketingConsent: input.marketingConsent,
    })
    await createCustomerSession(slug, { customerId: customer.id, tenant: salon.id, phone })
    return { ok: true, data: { created } }
  } catch (err) {
    return fail(err)
  }
}

export async function logout(slug: string) {
  // No redirect here: a redirect after changing cookies in a server action can drop the change.
  await clearCustomerSession(slug)
}

export async function setLanguage(slug: string, lang: 'en' | 'hi' | 'gu') {
  const jar = await cookies()
  jar.set('lang', lang, { path: '/', maxAge: 60 * 60 * 24 * 365 })
  const salon = await getSalonBySlug(slug)
  if (salon) {
    const session = await getCustomerSession(slug, salon.id)
    if (session) {
      const payload = await getPayloadClient()
      await forTenant(payload, salon.id).update('customers', session.customerId, { language: lang })
    }
  }
  revalidatePath(`/s/${slug}`, 'layout')
}

// ---------------------------------------------------------------------------
// Booking
// ---------------------------------------------------------------------------

export async function slotsFor(slug: string, input: { date: string; serviceIds: ID[]; staffId?: ID | null }) {
  try {
    const { salon, payload } = await ctx(slug)
    const { slots, durationMinutes } = await getAvailableSlots(payload, salon.id, input)
    return { ok: true as const, data: { durationMinutes, slots: slots.map((s) => ({ start: s.start.toISOString(), staffIds: s.staffIds })) } }
  } catch (err) {
    return fail(err)
  }
}

export async function uploadInspiration(slug: string, form: FormData): Promise<Result<{ id: ID; url: string }>> {
  try {
    const { salon, payload } = await ctx(slug)
    const file = form.get('file')
    if (!(file instanceof File) || !file.type.startsWith('image/')) return { ok: false, error: 'Please choose a photo' }
    if (file.size > 8 * 1024 * 1024) return { ok: false, error: 'That photo is too large (max 8 MB)' }
    const kind = String(form.get('kind') ?? 'inspiration')
    const media = (await payload.create({
      collection: 'media',
      overrideAccess: true,
      data: { alt: kind, kind: kind === 'hand' ? 'try-on' : 'inspiration', tenant: salon.id } as never,
      file: { data: Buffer.from(await file.arrayBuffer()), mimetype: file.type, name: file.name || 'photo.jpg', size: file.size },
    })) as unknown as { id: ID; url: string }
    return { ok: true, data: { id: media.id, url: media.url } }
  } catch (err) {
    return fail(err)
  }
}

export async function book(
  slug: string,
  input: {
    serviceIds: ID[]
    start: string
    staffId?: ID | null
    designId?: ID | null
    inspirationIds?: ID[]
    notes?: string
    preBooked?: boolean
    groupCode?: string
  },
): Promise<Result<{ appointmentId: ID; status: string; payUrl?: string }>> {
  try {
    const { salon, payload, repo, customerId } = await sessionCustomer(slug)
    const attribution = await getAttribution(slug)
    let groupId: ID | undefined
    if (input.groupCode) {
      const group = await repo.findOne<{ id: ID; size: number; status: string }>('group-bookings', { code: { equals: input.groupCode.toUpperCase() } })
      if (group && group.status === 'open') groupId = group.id
    }
    const { appointment, quote } = await requestBooking(payload, salon.id, {
      customerId,
      serviceIds: input.serviceIds,
      start: input.start,
      staffId: input.staffId,
      designId: input.designId,
      inspirationIds: input.inspirationIds,
      notes: input.notes,
      preBooked: input.preBooked,
      groupId,
      source: input.preBooked ? 'chair' : (attribution.src ?? 'app'),
    })
    let payUrl: string | undefined
    if (quote.deposit > 0 && salonFeatures(salon).has('deposits')) {
      const customer = await repo.findByID<{ name?: string; phone: string }>('customers', customerId)
      const { link } = await createPayment(payload, salon.id, {
        kind: 'deposit',
        amount: quote.deposit,
        customerId,
        appointmentId: appointment.id,
        description: `Deposit · ${salon.name}`,
        customer: { name: customer?.name ?? undefined, phone: customer?.phone },
        callbackUrl: `${process.env.PUBLIC_URL ?? ''}/s/${slug}/appointments/${appointment.id}?paid=1`,
      })
      payUrl = link.url
    }
    revalidatePath(`/s/${slug}`)
    return { ok: true, data: { appointmentId: appointment.id, status: appointment.status, payUrl } }
  } catch (err) {
    return fail(err)
  }
}

export async function cancelAppointment(slug: string, rawId: ID, reason?: string): Promise<Result> {
  const appointmentId = asId(rawId)
  try {
    const { salon, payload, repo, customerId } = await sessionCustomer(slug)
    const appt = await repo.findByID<{ customer: ID | { id: ID } }>('appointments', appointmentId)
    if (!appt || String(idOf(appt.customer)) !== String(customerId)) return { ok: false, error: 'Appointment not found' }
    await cancelBooking(payload, salon.id, appointmentId, reason, 'customer')
    revalidatePath(`/s/${slug}`)
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

export async function rescheduleAppointment(slug: string, rawId: ID, start: string): Promise<Result> {
  const appointmentId = asId(rawId)
  try {
    const { salon, payload, repo, customerId } = await sessionCustomer(slug)
    const appt = await repo.findByID<{ customer: ID | { id: ID } }>('appointments', appointmentId)
    if (!appt || String(idOf(appt.customer)) !== String(customerId)) return { ok: false, error: 'Appointment not found' }
    await rescheduleBooking(payload, salon.id, appointmentId, start)
    revalidatePath(`/s/${slug}`)
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

export async function addToWaitlist(slug: string, raw: { serviceIds: ID[]; date: string }): Promise<Result> {
  const input = { ...raw, serviceIds: raw.serviceIds.map(asId) }
  try {
    const { salon, payload, customerId } = await sessionCustomer(slug)
    await joinWaitlist(payload, salon.id, { customerId, serviceIds: input.serviceIds, date: input.date })
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

export async function startGroup(slug: string, input: { start: string; size: number; occasion?: string }): Promise<Result<{ code: string }>> {
  try {
    const { salon, payload, customerId } = await sessionCustomer(slug)
    const group = await createGroupBooking(payload, salon.id, { organiserId: customerId, ...input })
    return { ok: true, data: { code: group.code } }
  } catch (err) {
    return fail(err)
  }
}

// ---------------------------------------------------------------------------
// Rewards, gifts, referrals, offers
// ---------------------------------------------------------------------------

export async function scratch(slug: string, rawId: ID): Promise<Result<{ title: string; validTo?: string | null }>> {
  const rewardId = asId(rawId)
  try {
    const { salon, payload, customerId } = await sessionCustomer(slug)
    const reward = await revealScratchCard(payload, salon.id, rewardId, customerId)
    if (!reward) return { ok: false, error: 'Card not found' }
    revalidatePath(`/s/${slug}`)
    return { ok: true, data: { title: reward.title, validTo: reward.validTo } }
  } catch (err) {
    return fail(err)
  }
}

export async function logInvite(slug: string, channel: string, phone?: string): Promise<Result> {
  try {
    const { salon, payload, customerId } = await sessionCustomer(slug)
    await recordInvite(payload, salon.id, customerId, channel, phone)
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

export async function buyGiftCard(
  slug: string,
  input: { amount: number; recipientPhone: string; recipientName?: string; message?: string; occasion?: string },
): Promise<Result<{ payUrl: string }>> {
  try {
    const { salon, payload, repo, customerId } = await sessionCustomer(slug)
    const recipient = normalizePhone(input.recipientPhone)
    if (!recipient) return { ok: false, error: 'Please enter a valid phone number' }
    if (input.amount < 50000 || input.amount > 2000000) return { ok: false, error: 'Choose an amount between ₹500 and ₹20,000' }
    const card = await createGiftCard(payload, salon.id, {
      buyerId: customerId,
      value: input.amount,
      recipientPhone: recipient,
      recipientName: input.recipientName,
      message: input.message,
      occasion: input.occasion,
    })
    const buyer = await repo.findByID<{ name?: string; phone: string }>('customers', customerId)
    const { link } = await createPayment(payload, salon.id, {
      kind: 'gift-card',
      amount: input.amount,
      customerId,
      giftCardId: card.id,
      description: `Gift card · ${salon.name}`,
      customer: { name: buyer?.name ?? undefined, phone: buyer?.phone },
      callbackUrl: `${process.env.PUBLIC_URL ?? ''}/s/${slug}/invite?gift=sent`,
    })
    return { ok: true, data: { payUrl: link.url } }
  } catch (err) {
    return fail(err)
  }
}

export async function claimGift(slug: string, code: string): Promise<Result> {
  try {
    const { salon, payload, customerId } = await sessionCustomer(slug)
    await redeemGiftCard(payload, salon.id, code, customerId)
    revalidatePath(`/s/${slug}`)
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

export async function claim(slug: string, rawId: ID): Promise<Result> {
  const offerId = asId(rawId)
  try {
    const { salon, payload, customerId } = await sessionCustomer(slug)
    await claimOffer(payload, salon.id, offerId, customerId)
    revalidatePath(`/s/${slug}`)
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

export async function buyPackage(slug: string, rawId: ID): Promise<Result<{ payUrl: string }>> {
  const packageId = asId(rawId)
  try {
    const { salon, payload, repo, customerId } = await sessionCustomer(slug)
    const pkg = await repo.findByID<{ id: ID; name: string; price: number; active: boolean }>('packages', packageId)
    if (!pkg?.active) return { ok: false, error: 'This package is not available' }
    const buyer = await repo.findByID<{ name?: string; phone: string }>('customers', customerId)
    const { link } = await createPayment(payload, salon.id, {
      kind: 'package',
      amount: pkg.price,
      customerId,
      packageId,
      description: `${pkg.name} · ${salon.name}`,
      customer: { name: buyer?.name ?? undefined, phone: buyer?.phone },
      callbackUrl: `${process.env.PUBLIC_URL ?? ''}/s/${slug}/rewards?package=1`,
    })
    return { ok: true, data: { payUrl: link.url } }
  } catch (err) {
    return fail(err)
  }
}

// ---------------------------------------------------------------------------
// After the visit: rating, sharing, gallery, contest
// ---------------------------------------------------------------------------

export async function rate(slug: string, raw: { visitId?: ID; score: number; comment?: string }): Promise<Result<{ googleUrl: string | null }>> {
  const input = { ...raw, visitId: raw.visitId ? asId(raw.visitId) : undefined }
  try {
    const { salon, payload, customerId } = await sessionCustomer(slug)
    await submitRating(payload, salon.id, { customerId, ...input })
    const settings = (salon.settings ?? {}) as { googleReviewUrl?: string }
    const googleUrl =
      settings.googleReviewUrl || (salon.contact?.googlePlaceId ? `https://search.google.com/local/writereview?placeid=${salon.contact.googlePlaceId}` : null)
    return { ok: true, data: { googleUrl } }
  } catch (err) {
    return fail(err)
  }
}

export async function shared(slug: string, rawId: ID, channel: string): Promise<Result> {
  const taskId = asId(rawId)
  try {
    const { salon, payload, customerId } = await sessionCustomer(slug)
    await recordShare(payload, salon.id, taskId, customerId, channel)
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

export async function featureMyNails(slug: string, rawId: ID): Promise<Result> {
  const taskId = asId(rawId)
  try {
    const { salon, payload, customerId } = await sessionCustomer(slug)
    await featureInGallery(payload, salon.id, taskId, customerId)
    revalidatePath(`/s/${slug}/designs`)
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

export async function enterMyNails(slug: string, raw: { contestId: ID; taskId: ID }): Promise<Result> {
  const input = { contestId: asId(raw.contestId), taskId: asId(raw.taskId) }
  try {
    const { salon, payload, repo, customerId } = await sessionCustomer(slug)
    const task = await repo.findByID<{ customer: ID | { id: ID }; photos?: ID[]; designName?: string; visit: ID | { id: ID } }>('photo-tasks', input.taskId)
    if (!task || String(idOf(task.customer)) !== String(customerId) || !task.photos?.length) return { ok: false, error: 'Photo not found' }
    await enterContest(payload, salon.id, {
      contestId: input.contestId,
      customerId,
      photoId: idOf(task.photos[0]) as ID,
      designName: task.designName,
      visitId: idOf(task.visit) as ID,
    })
    const c = await repo.findByID<{ consents?: Record<string, unknown> }>('customers', customerId)
    await repo.update('customers', customerId, { consents: { ...(c?.consents ?? {}), contest: true } })
    revalidatePath(`/s/${slug}/contest`)
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

export async function vote(slug: string, raw: { contestId: ID; entryId: ID }): Promise<Result> {
  const input = { contestId: asId(raw.contestId), entryId: asId(raw.entryId) }
  try {
    const { salon, payload, repo, customerId } = await sessionCustomer(slug)
    const voter = await repo.findByID<{ phone: string }>('customers', customerId)
    if (!voter) return { ok: false, error: 'Please log in to vote' }
    await castVote(payload, salon.id, { contestId: input.contestId, entryId: input.entryId, voterPhone: voter.phone, voterCustomerId: customerId })
    revalidatePath(`/s/${slug}/contest`)
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

export async function tryOnAi(slug: string, raw: { handMediaId: ID; designId: ID }): Promise<Result<{ imageUrl: string; remaining: number }>> {
  const input = { handMediaId: asId(raw.handMediaId), designId: asId(raw.designId) }
  try {
    const { salon, payload, customerId } = await sessionCustomer(slug)
    const result = await aiTryOn(payload, salon.id, { customerId, ...input })
    return { ok: true, data: { imageUrl: result.imageUrl, remaining: result.remaining } }
  } catch (err) {
    return fail(err)
  }
}

// ---------------------------------------------------------------------------
// Profile and feedback
// ---------------------------------------------------------------------------

export async function saveProfile(
  slug: string,
  input: {
    name?: string
    birthday?: string | null
    marketing?: boolean
    gallery?: boolean
    hand?: { shape?: string; length?: string; skinTone?: string; sensitivities?: string }
  },
): Promise<Result> {
  try {
    const { repo, customerId } = await sessionCustomer(slug)
    const c = await repo.findByID<{ consents?: Record<string, unknown>; handProfile?: Record<string, unknown> }>('customers', customerId)
    await repo.update('customers', customerId, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.birthday !== undefined ? { birthday: input.birthday || null } : {}),
      consents: {
        ...(c?.consents ?? {}),
        ...(input.marketing !== undefined ? { marketing: input.marketing, marketingAt: input.marketing ? new Date().toISOString() : null } : {}),
        ...(input.gallery !== undefined ? { gallery: input.gallery } : {}),
      },
      ...(input.hand ? { handProfile: { ...(c?.handProfile ?? {}), ...input.hand } } : {}),
    })
    revalidatePath(`/s/${slug}`, 'layout')
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

export async function deleteMyData(slug: string): Promise<Result> {
  try {
    const { repo, customerId } = await sessionCustomer(slug)
    // Anonymise rather than hard delete so the salon's financial records stay intact.
    await repo.update('customers', customerId, {
      name: 'Deleted customer',
      phone: `+000000${String(customerId).padStart(8, '0')}`.slice(0, 16),
      birthday: null,
      notes: null,
      handProfile: {},
      consents: { marketing: false, gallery: false, contest: false },
      tags: ['deleted'],
    })
    await clearCustomerSession(slug)
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

export async function sendFeedback(slug: string, input: { reason: string; comment?: string }): Promise<Result> {
  try {
    const { salon, payload } = await ctx(slug)
    const session = await getCustomerSession(slug, salon.id)
    await forTenant(payload, salon.id).create('feedback', { customer: session?.customerId, reason: input.reason, comment: input.comment })
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}
