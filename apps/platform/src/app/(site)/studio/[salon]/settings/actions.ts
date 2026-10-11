'use server'

import { randomBytes } from 'node:crypto'
import { asId, forTenant, type ID, normalizePhone, rupees } from '@salon/core'
import { revalidatePath } from 'next/cache'
import { parseMenuText } from '@/lib/menuText'
import { getPayloadClient } from '@/lib/payload'
import { canManage, requireStaff } from '@/lib/staff'

/** Shape returned to `useActionState` forms. */
export type FormState = { ok?: boolean; message?: string; error?: string; secret?: string } | null

const ctx = async (slug: string, manager = true) => {
  const { salon, user } = await requireStaff(slug, { manager })
  const payload = await getPayloadClient()
  return { salon, user, payload, repo: forTenant(payload, salon.id) }
}

const str = (f: FormData, k: string) => {
  const v = f.get(k)
  return typeof v === 'string' ? v.trim() : ''
}
const optStr = (f: FormData, k: string) => str(f, k) || null
const num = (f: FormData, k: string, fallback?: number) => {
  const v = str(f, k)
  if (v === '') return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}
const bool = (f: FormData, k: string) => f.get(k) === 'on' || f.get(k) === 'true'
const HEX = /^#[0-9a-f]{6}$/i
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

const fail = (err: unknown): FormState => {
  const details = (err as { data?: { errors?: { message?: string; path?: string }[] } })?.data?.errors
  if (details?.length) return { ok: false, error: details.map((d) => `${d.path ?? ''} ${d.message ?? ''}`.trim()).join(', ') }
  if (err instanceof Error && /duplicate|unique|already/i.test(err.message)) return { ok: false, error: 'That already exists.' }
  if (err instanceof Error && err.message.startsWith('NEXT_')) throw err
  console.error(err)
  return { ok: false, error: err instanceof Error && err.message.length < 140 ? err.message : 'Could not save. Please try again.' }
}

const done = (slug: string, message = 'Saved') => {
  revalidatePath(`/studio/${slug}`, 'layout')
  revalidatePath(`/s/${slug}`, 'layout')
  return { ok: true, message }
}

const uploadImage = async (payload: Awaited<ReturnType<typeof getPayloadClient>>, tenant: ID, file: FormDataEntryValue | null, kind: string, alt: string) => {
  if (!(file instanceof File) || file.size === 0) return null
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file')
  if (file.size > 12 * 1024 * 1024) throw new Error('Image is too large (max 12 MB)')
  const media = (await payload.create({
    collection: 'media',
    overrideAccess: true,
    data: { alt, kind, tenant } as never,
    file: { data: Buffer.from(await file.arrayBuffer()), mimetype: file.type, name: file.name || `${kind}.jpg`, size: file.size },
  })) as unknown as { id: ID }
  return media.id
}

// ── Salon profile & brand ─────────────────────────────────────────────────────

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

export async function saveProfile(slug: string, _prev: FormState, f: FormData): Promise<FormState> {
  try {
    const { salon, payload } = await ctx(slug)
    const themeColors = bool(f, 'useThemeColors')
    const primary = themeColors ? '' : str(f, 'primaryColor')
    const accent = themeColors ? '' : str(f, 'accentColor')
    if (primary && !HEX.test(primary)) return { ok: false, error: 'Main colour must look like #B4637A' }
    if (accent && !HEX.test(accent)) return { ok: false, error: 'Accent colour must look like #C9A227' }
    const hours = DAYS.map((day) => ({
      day,
      open: str(f, `open_${day}`) || '10:00',
      close: str(f, `close_${day}`) || '20:00',
      closed: bool(f, `closed_${day}`),
    }))
    const badTime = hours.find((h) => !h.closed && (!TIME.test(h.open) || !TIME.test(h.close) || h.open >= h.close))
    if (badTime) return { ok: false, error: `Check the opening hours for ${badTime.day}` }
    const logo = await uploadImage(payload, salon.id, f.get('logo'), 'brand', `${salon.name} logo`)
    const cover = await uploadImage(payload, salon.id, f.get('cover'), 'brand', `${salon.name} cover`)
    const languages = ['en', 'hi', 'gu'].filter((l) => l === 'en' || bool(f, `lang_${l}`))
    const brand = (salon.brand ?? {}) as Record<string, unknown>
    const idOrSelf = (v: unknown) => (v && typeof v === 'object' && 'id' in v ? (v as { id: ID }).id : v)
    await payload.update({
      collection: 'salons',
      id: salon.id,
      overrideAccess: true,
      data: {
        name: str(f, 'name') || salon.name,
        tagline: optStr(f, 'tagline'),
        about: optStr(f, 'about'),
        theme: str(f, 'theme') || salon.theme || 'default',
        seasonalHighlight: optStr(f, 'seasonalHighlight'),
        languages,
        brand: {
          ...brand,
          logo: logo ?? idOrSelf(brand.logo) ?? null,
          cover: cover ?? idOrSelf(brand.cover) ?? null,
          primaryColor: primary || null,
          accentColor: accent || null,
        },
        contact: {
          ...(salon.contact ?? {}),
          phone: str(f, 'phone') ? normalizePhone(str(f, 'phone')) : null,
          whatsapp: str(f, 'whatsapp') ? normalizePhone(str(f, 'whatsapp')) : null,
          instagram: optStr(f, 'instagram')?.replace(/^@/, '') ?? null,
          address: optStr(f, 'address'),
          area: optStr(f, 'area'),
          city: optStr(f, 'city'),
          mapUrl: optStr(f, 'mapUrl'),
          parking: optStr(f, 'parking'),
        },
        hours,
        settings: { ...(salon.settings ?? {}), wifiName: optStr(f, 'wifiName'), wifiPassword: optStr(f, 'wifiPassword') },
      } as never,
    })
    return done(slug, 'Salon page updated')
  } catch (err) {
    return fail(err)
  }
}

// ── Rules & automatic messages ────────────────────────────────────────────────

const RULE_NUMBERS = [
  'slotStepMinutes',
  'bookingHorizonDays',
  'depositMinMinutes',
  'depositPercent',
  'changeCutoffHours',
  'depositRefundHours',
  'stampsForReward',
  'pointsPer100',
  'silverAfterVisits',
  'goldAfterVisits',
  'discountBudgetPercent',
  'promoPerWeek',
  'promoPerMonth',
  'reviewDelayHours',
  'aftercareDays',
  'refillHeadsUpDays',
  'nudgeDays',
  'winbackDays',
  'lastChanceDays',
  'dailySummaryHour',
] as const

export async function saveRules(slug: string, _prev: FormState, f: FormData): Promise<FormState> {
  try {
    const { salon, payload } = await ctx(slug)
    const next: Record<string, unknown> = { ...(salon.settings ?? {}) }
    for (const k of RULE_NUMBERS) {
      const v = num(f, k)
      if (v === undefined) continue
      if (v < 0) return { ok: false, error: `${k} can't be negative` }
      next[k] = v
    }
    if ((next.depositPercent as number) > 100) return { ok: false, error: 'Deposit can be at most 100%' }
    if ((next.promoPerWeek as number) > 3) return { ok: false, error: 'At most 3 offers a week: more than that and customers block the number' }
    if ((next.dailySummaryHour as number) > 23) return { ok: false, error: 'Daily summary hour must be 0–23' }
    next.autoConfirmBookings = bool(f, 'autoConfirmBookings')
    next.cancellationPolicy = str(f, 'cancellationPolicy') || next.cancellationPolicy
    next.googleReviewUrl = optStr(f, 'googleReviewUrl')
    await payload.update({ collection: 'salons', id: salon.id, overrideAccess: true, data: { settings: next } as never })
    return done(slug, 'Rules saved. New bookings and messages follow them from now.')
  } catch (err) {
    return fail(err)
  }
}

// ── Menu (services) ───────────────────────────────────────────────────────────

export async function saveService(slug: string, _prev: FormState, f: FormData): Promise<FormState> {
  try {
    const { repo } = await ctx(slug)
    const id = str(f, 'id')
    const name = str(f, 'name')
    const price = num(f, 'price')
    const duration = num(f, 'durationMinutes')
    if (!name) return { ok: false, error: 'Give the service a name' }
    if (price === undefined || price < 0) return { ok: false, error: 'Enter a price in rupees' }
    if (!duration || duration < 5) return { ok: false, error: 'Duration must be at least 5 minutes' }
    const data = {
      name,
      category: str(f, 'category') || 'gel',
      description: optStr(f, 'description'),
      price: rupees(price),
      durationMinutes: duration,
      isAddOn: bool(f, 'isAddOn'),
      cycleDays: num(f, 'cycleDays') ?? null,
      aftercare: optStr(f, 'aftercare'),
      active: id ? bool(f, 'active') : true,
    }
    if (id) await repo.update('services', asId(id), data)
    else await repo.create('services', data)
    return done(slug, id ? 'Service updated' : 'Service added to your menu')
  } catch (err) {
    return fail(err)
  }
}

export async function archiveService(slug: string, id: ID, active: boolean): Promise<FormState> {
  try {
    const { repo } = await ctx(slug)
    await repo.update('services', asId(id), { active })
    return done(slug, active ? 'Back on the menu' : 'Hidden from the menu')
  } catch (err) {
    return fail(err)
  }
}

/**
 * Bulk add from pasted text, one service per line: "Gel polish, 800, 45" or "Gel polish - ₹800 - 45 min".
 * Lines that can't be read are reported back instead of guessed.
 */
export async function importMenu(slug: string, _prev: FormState, f: FormData): Promise<FormState> {
  try {
    const { repo } = await ctx(slug)
    const { parsed, skipped } = parseMenuText(str(f, 'menu'))
    if (!parsed.length) return { ok: false, error: 'No lines could be read. Use: name, price, minutes' }
    const existing = new Set((await repo.find<{ name: string }>('services', { limit: 500, depth: 0 })).docs.map((s) => s.name.trim().toLowerCase()))
    let added = 0
    for (const s of parsed) {
      if (existing.has(s.name.toLowerCase())) continue
      await repo.create('services', { name: s.name, category: s.category, price: rupees(s.price), durationMinutes: s.minutes, active: true })
      added++
    }
    return {
      ...done(slug, `${added} service${added === 1 ? '' : 's'} added${parsed.length - added ? `, ${parsed.length - added} already on the menu` : ''}`),
      ...(skipped.length ? { error: `Couldn't read: ${skipped.slice(0, 5).join(' | ')}` } : {}),
    }
  } catch (err) {
    return fail(err)
  }
}

// ── Gallery ───────────────────────────────────────────────────────────────────

export async function addDesign(slug: string, _prev: FormState, f: FormData): Promise<FormState> {
  try {
    const { salon, user, payload, repo } = await ctx(slug, false)
    const title = str(f, 'title')
    if (!title) return { ok: false, error: 'Give the design a name' }
    const files = f.getAll('images').filter((x): x is File => x instanceof File && x.size > 0)
    if (!files.length) return { ok: false, error: 'Add at least one photo' }
    const images: ID[] = []
    for (const file of files.slice(0, 6)) {
      const id = await uploadImage(payload, salon.id, file, 'design', title)
      if (id) images.push(id)
    }
    const service = str(f, 'service')
    await repo.create('designs', {
      title,
      images,
      description: optStr(f, 'description'),
      service: service ? asId(service) : undefined,
      seasons: str(f, 'seasons')
        ? str(f, 'seasons')
            .split(',')
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean)
        : [],
      artist: user.role === 'artist' ? user.id : undefined,
      source: 'staff',
      featured: bool(f, 'featured'),
      // Artists' uploads wait for the owner; owners publish straight away.
      published: canManage(user),
    })
    return done(slug, canManage(user) ? 'Design is live in your gallery' : 'Sent to the owner for approval')
  } catch (err) {
    return fail(err)
  }
}

export async function setDesignFlags(slug: string, id: ID, patch: { published?: boolean; featured?: boolean }): Promise<FormState> {
  try {
    const { repo } = await ctx(slug)
    await repo.update('designs', asId(id), patch)
    return done(slug, patch.published === false ? 'Hidden from the gallery' : 'Updated')
  } catch (err) {
    return fail(err)
  }
}

export async function deleteDesign(slug: string, id: ID): Promise<FormState> {
  try {
    const { repo } = await ctx(slug)
    await repo.delete('designs', asId(id))
    return done(slug, 'Design deleted')
  } catch (err) {
    return fail(err)
  }
}

// ── Team & hours ──────────────────────────────────────────────────────────────

export async function addTeamMember(slug: string, _prev: FormState, f: FormData): Promise<FormState> {
  try {
    const { salon, user, payload } = await ctx(slug)
    const name = str(f, 'name')
    const email = str(f, 'email').toLowerCase()
    const role = str(f, 'role') || 'artist'
    if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: 'Enter a name and a valid email' }
    if (!['artist', 'manager'].includes(role) && !(role === 'owner' && user.role !== 'manager')) return { ok: false, error: 'Pick a role' }
    const password = randomBytes(6).toString('base64url')
    const created = (await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        name,
        email,
        password,
        role,
        phone: str(f, 'phone') ? normalizePhone(str(f, 'phone')) : undefined,
        bookable: role !== 'manager',
        active: true,
        tenants: [{ tenant: salon.id }],
      } as never,
    })) as unknown as { id: ID }
    await forTenant(payload, salon.id).create('availability', {
      staff: created.id,
      weekly: (salon.hours?.length ? salon.hours : DAYS.map((day) => ({ day, open: '10:00', close: '20:00', closed: false }))).map((h) => ({
        day: h.day,
        start: h.open ?? '10:00',
        end: h.close ?? '20:00',
        off: Boolean(h.closed),
      })),
    })
    await payload.create({
      collection: 'audit-log',
      overrideAccess: true,
      data: { actor: user.id, action: 'team.added', details: { slug: salon.slug, user: created.id, role } } as never,
    })
    revalidatePath(`/studio/${slug}/settings/team`)
    return { ok: true, message: `${name.split(' ')[0]} can now sign in at /studio/login`, secret: `${email} / ${password}` }
  } catch (err) {
    return fail(err)
  }
}

export async function setMemberFlags(slug: string, id: ID, patch: { bookable?: boolean; active?: boolean }): Promise<FormState> {
  try {
    const { salon, payload } = await ctx(slug)
    const member = (await payload.findByID({ collection: 'users', id: asId(id), overrideAccess: true, depth: 0 })) as unknown as {
      role: string
      tenants?: { tenant: ID }[]
    }
    if (!member.tenants?.some((t) => String(t.tenant) === String(salon.id))) return { ok: false, error: 'Not in your team' }
    if (member.role === 'owner' && patch.active === false) return { ok: false, error: "The owner can't be deactivated here" }
    await payload.update({ collection: 'users', id: asId(id), overrideAccess: true, data: patch as never })
    revalidatePath(`/studio/${slug}/settings/team`)
    return { ok: true, message: 'Updated' }
  } catch (err) {
    return fail(err)
  }
}

/** Weekly hours + one time-off range. Artists may edit their own; managers anyone's. */
export async function saveHours(slug: string, _prev: FormState, f: FormData): Promise<FormState> {
  try {
    const { user, repo } = await ctx(slug, false)
    const staffId = asId(str(f, 'staff'))
    if (!canManage(user) && String(staffId) !== String(user.id)) return { ok: false, error: 'You can only change your own hours' }
    const weekly = DAYS.map((day) => ({ day, start: str(f, `start_${day}`) || '10:00', end: str(f, `end_${day}`) || '20:00', off: bool(f, `off_${day}`) }))
    const bad = weekly.find((w) => !w.off && (!TIME.test(w.start) || !TIME.test(w.end) || w.start >= w.end))
    if (bad) return { ok: false, error: `Check the hours for ${bad.day}` }
    const existing = await repo.findOne<{ id: ID; timeOff?: { from: string; to: string; reason?: string }[] }>('availability', { staff: { equals: staffId } })
    let timeOff = (existing?.timeOff ?? []).filter((t) => new Date(t.to).getTime() >= Date.now() - 86_400_000)
    const from = str(f, 'offFrom')
    const to = str(f, 'offTo') || from
    if (from) {
      if (to < from) return { ok: false, error: 'Time off ends before it starts' }
      timeOff = [
        ...timeOff,
        {
          from: new Date(`${from}T00:00:00+05:30`).toISOString(),
          to: new Date(`${to}T23:59:00+05:30`).toISOString(),
          reason: optStr(f, 'offReason') ?? undefined,
        },
      ]
    }
    const removeIndex = num(f, 'removeOff')
    if (removeIndex !== undefined) timeOff = timeOff.filter((_, i) => i !== removeIndex)
    if (existing) await repo.update('availability', existing.id, { weekly, timeOff })
    else await repo.create('availability', { staff: staffId, weekly, timeOff })
    return done(slug, from ? 'Hours and time off saved. Customers can no longer book those days.' : 'Hours saved')
  } catch (err) {
    return fail(err)
  }
}
