'use server'

import { asId, forTenant, type ID, idOf, normalizePhone } from '@salon/core'
import {
  aiTryOn,
  BookingError,
  cancelBooking,
  castVote,
  claimOffer,
  createGiftCard,
  createGroupBooking,
  createOtp,
  createPayment,
  customerCanChange,
  enterContest,
  featureInGallery,
  findGroupBooking,
  findOrCreateCustomer,
  getAvailableSlots,
  joinWaitlist,
  OtpError,
  recordInvite,
  recordShare,
  redeemGiftCard,
  requestBooking,
  rescheduleBooking,
  revealScratchCard,
  sendOtp,
  setDesignSaved,
  submitRating,
  TryOnError,
  VoteError,
  verifyOtp,
} from '@salon/modules'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { type DictKey, t } from '@/lib/i18n'
import { getLang } from '@/lib/lang'
import { getPayloadClient } from '@/lib/payload'
import { getSalonBySlug, salonFeatures } from '@/lib/salon'
import { clearCustomerSession, createCustomerSession, getAttribution, getCustomerSession } from '@/lib/session'

type Result<T = unknown> = { ok: true; data?: T } | { ok: false; error: string; code?: string }

/** Known module/action messages mapped to translated strings. Anything else becomes a generic, translated error. */
const ERROR_KEYS: Record<string, DictKey> = {
  'Please log in first': 'err_login',
  'Sorry, that time was just taken. Please pick another slot.': 'err_slotTaken',
  'That time is not available.': 'err_timeNA',
  'Please choose a time in the future.': 'err_future',
  'Some selected services are not available': 'err_services',
  'Appointment not found': 'err_apptNotFound',
  'Please enter a valid mobile number': 'err_phone',
  'Too many codes requested. Try again in a while.': 'err_rateLimited',
  'This code has expired. Request a new one.': 'err_codeExpired',
  'Too many wrong attempts. Request a new code.': 'err_attempts',
  'That code is not right. Please check and try again.': 'err_wrongCode',
  'AI try-on is not available at this salon yet': 'err_aiOff',
  'AI try-on is taking a break. Try the free preview instead.': 'err_aiBreak',
  'You have used all your AI try-ons. Your artist can show you more in the salon!': 'err_aiCap',
  'Design not found': 'err_designNotFound',
  'Voting has closed': 'err_votingClosed',
  'Entry not found': 'err_entryNotFound',
  'You have already voted in this contest': 'err_alreadyVoted',
  'This gift card is not valid': 'err_giftInvalid',
  'This gift card has expired': 'err_giftExpired',
  'This offer is no longer available': 'err_offerGone',
  'This offer has ended': 'err_offerEnded',
  'Not your visit': 'err_notYourVisit',
}

const errorIn = async (key: DictKey) => t(await getLang(), key)

const fail = async (err: unknown): Promise<{ ok: false; error: string; code?: string }> => {
  const lang = await getLang()
  const code = (err as { code?: string })?.code
  if (err instanceof Error && ERROR_KEYS[err.message]) return { ok: false, error: t(lang, ERROR_KEYS[err.message]), code }
  if (err instanceof BookingError || err instanceof OtpError || err instanceof TryOnError || err instanceof VoteError)
    return { ok: false, error: err.message, code }
  if (err instanceof Error && /not valid|expired|no longer|already|Insufficient|Not your/i.test(err.message)) return { ok: false, error: err.message }
  const details = (err as { data?: { errors?: unknown } })?.data?.errors
  console.error(err instanceof Error ? err.message : err, details ? JSON.stringify(details) : '')
  return { ok: false, error: t(lang, 'err_generic') }
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
    if (!(file instanceof File) || !file.type.startsWith('image/')) return { ok: false, error: await errorIn('err_choosePhoto') }
    if (file.size > 8 * 1024 * 1024) return { ok: false, error: await errorIn('err_photoLarge') }
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
    if (input.groupCode && salonFeatures(salon).has('groupBooking')) {
      const group = await findGroupBooking(payload, salon.id, input.groupCode)
      if (group) groupId = group.id
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
    const appt = await repo.findByID<{ customer: ID | { id: ID }; start: string; status: string }>('appointments', appointmentId)
    if (!appt || String(idOf(appt.customer)) !== String(customerId)) return { ok: false, error: await errorIn('err_apptNotFound') }
    if (!customerCanChange(appt)) return { ok: false, error: await errorIn('err_cannotChange'), code: 'cannot-change' }
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
    const appt = await repo.findByID<{ customer: ID | { id: ID }; start: string; status: string }>('appointments', appointmentId)
    if (!appt || String(idOf(appt.customer)) !== String(customerId)) return { ok: false, error: await errorIn('err_apptNotFound') }
    // Same rules as cancelling: only upcoming, active appointments can be moved by the customer.
    if (!customerCanChange(appt)) return { ok: false, error: await errorIn('err_cannotChange'), code: 'cannot-change' }
    const when = new Date(start)
    if (Number.isNaN(when.getTime()) || when.getTime() <= Date.now()) return { ok: false, error: await errorIn('err_future') }
    const horizon = Number((salon.settings as { bookingHorizonDays?: number } | null)?.bookingHorizonDays ?? 30)
    if (when.getTime() > Date.now() + (horizon + 1) * 86_400_000) return { ok: false, error: await errorIn('err_timeNA') }
    await rescheduleBooking(payload, salon.id, appointmentId, when.toISOString())
    revalidatePath(`/s/${slug}`, 'layout')
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
    if (!salonFeatures(salon).has('groupBooking')) return { ok: false, error: await errorIn('err_groupOff') }
    const when = new Date(input.start)
    if (Number.isNaN(when.getTime()) || when.getTime() <= Date.now()) return { ok: false, error: await errorIn('err_future') }
    const size = Math.min(20, Math.max(2, Math.round(Number(input.size) || 2)))
    const occasion = input.occasion?.trim().slice(0, 80) || undefined
    const group = await createGroupBooking(payload, salon.id, { organiserId: customerId, start: when.toISOString(), size, occasion })
    return { ok: true, data: { code: group.code } }
  } catch (err) {
    return fail(err)
  }
}

// ---------------------------------------------------------------------------
// Moodboard
// ---------------------------------------------------------------------------

export async function saveDesign(slug: string, rawId: ID, save: boolean): Promise<Result<{ saved: boolean }>> {
  const designId = asId(rawId)
  try {
    const { salon, payload, repo, customerId } = await sessionCustomer(slug)
    const design = await repo.findByID<{ published?: boolean }>('designs', designId)
    if (!design?.published) return { ok: false, error: await errorIn('err_designNotFound') }
    const saved = await setDesignSaved(payload, salon.id, customerId, designId, save)
    revalidatePath(`/s/${slug}/me`)
    return { ok: true, data: { saved } }
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
    if (!reward) return { ok: false, error: await errorIn('err_cardNotFound') }
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
    if (!recipient) return { ok: false, error: await errorIn('err_validPhone') }
    if (input.amount < 50000 || input.amount > 2000000) return { ok: false, error: await errorIn('err_giftAmount') }
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
    if (!pkg?.active) return { ok: false, error: await errorIn('err_packageNA') }
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
    if (!task || String(idOf(task.customer)) !== String(customerId) || !task.photos?.length) return { ok: false, error: await errorIn('err_photoNotFound') }
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
    if (!voter) return { ok: false, error: await errorIn('err_loginToVote') }
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
