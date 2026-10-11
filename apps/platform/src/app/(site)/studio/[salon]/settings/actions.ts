'use server'

import { randomBytes } from 'node:crypto'
import { asId, forTenant, type ID, normalizePhone, rupees, slugify } from '@salon/core'
import { copyLibraryDesign, salonStyles } from '@salon/modules'
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

/** Thrown by our own checks: the message is meant for the owner. */
class UserError extends Error {}

const fail = (err: unknown): FormState => {
  if (err instanceof Error && err.message.startsWith('NEXT_')) throw err
  if (err instanceof UserError) return { ok: false, error: err.message }
  // Payload validation errors: show what was wrong with which field.
  const details = (err as { data?: { errors?: { message?: string; path?: string }[] } })?.data?.errors
  if (details?.length) return { ok: false, error: details.map((d) => (d.path ? `${d.path}: ${d.message ?? 'invalid'}` : (d.message ?? 'invalid'))).join(', ') }
  if (err instanceof Error && /duplicate|unique|already/i.test(err.message)) return { ok: false, error: 'That already exists.' }
  const ref = randomBytes(2).toString('hex').toUpperCase()
  console.error(`[studio settings ref ${ref}]`, err)
  return { ok: false, error: `Something went wrong (ref ${ref}). Please try again, or send this ref to support.` }
}

const done = (slug: string, message = 'Saved') => {
  revalidatePath(`/studio/${slug}`, 'layout')
  revalidatePath(`/s/${slug}`, 'layout')
  return { ok: true, message }
}

const uploadImage = async (payload: Awaited<ReturnType<typeof getPayloadClient>>, tenant: ID, file: FormDataEntryValue | null, kind: string, alt: string) => {
  if (!(file instanceof File) || file.size === 0) return null
  if (!file.type.startsWith('image/')) throw new UserError('Please choose an image file')
  if (file.size > 12 * 1024 * 1024) throw new UserError('Image is too large (max 12 MB)')
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
      // New forms send an "open" switch; older ones a "closed" checkbox.
      closed: f.has(`isopen_${day}`) || f.has('hours_v2') ? !bool(f, `isopen_${day}`) : bool(f, `closed_${day}`),
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
      styles: f.getAll('styles').map((v) => asId(String(v))),
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
    const weekly = DAYS.map((day) => ({
      day,
      start: str(f, `start_${day}`) || '10:00',
      end: str(f, `end_${day}`) || '20:00',
      off: f.has('hours_v2') ? !bool(f, `working_${day}`) : bool(f, `off_${day}`),
    }))
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

// ── Design editor ─────────────────────────────────────────────────────────────

const list = (f: FormData, k: string) =>
  f
    .getAll(k)
    .map((v) => String(v).trim())
    .filter(Boolean)
const csv = (f: FormData, k: string) =>
  str(f, k)
    .split(',')
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean)

export async function saveDesign(slug: string, _prev: FormState, f: FormData): Promise<FormState> {
  try {
    const { salon, payload, repo } = await ctx(slug)
    const id = asId(str(f, 'id'))
    const design = await repo.findByID<{ id: ID; images?: (ID | { id: ID })[] }>('designs', id)
    if (!design) return { ok: false, error: 'Design not found' }
    const title = str(f, 'title')
    if (!title) return { ok: false, error: 'Give the design a name' }
    // Photos: keep the ones still ticked, in the chosen order (cover first), then add new uploads.
    const keep = list(f, 'keepImage')
    const cover = str(f, 'coverImage')
    const ordered = cover && keep.includes(cover) ? [cover, ...keep.filter((k) => k !== cover)] : keep
    const added: ID[] = []
    for (const file of f
      .getAll('newImages')
      .filter((x): x is File => x instanceof File && x.size > 0)
      .slice(0, 6)) {
      const mid = await uploadImage(payload, salon.id, file, 'design', title)
      if (mid) added.push(mid)
    }
    const images = [...ordered.map(asId), ...added]
    if (!images.length) return { ok: false, error: 'A design needs at least one photo' }
    const price = num(f, 'priceFrom')
    const service = str(f, 'service')
    await repo.update('designs', id, {
      title,
      description: optStr(f, 'description'),
      images,
      styles: list(f, 'styles').map(asId),
      service: service ? asId(service) : null,
      addOns: list(f, 'addOns').map(asId),
      priceFrom: price === undefined ? null : rupees(price),
      durationMinutes: num(f, 'durationMinutes') ?? null,
      shape: optStr(f, 'shape'),
      length: optStr(f, 'length'),
      occasions: list(f, 'occasions'),
      seasons: csv(f, 'seasons'),
      colors: csv(f, 'colors'),
      artist: str(f, 'artist') ? asId(str(f, 'artist')) : null,
      featured: bool(f, 'featured'),
      published: bool(f, 'published'),
    })
    return done(slug, 'Design saved')
  } catch (err) {
    return fail(err)
  }
}

/** Moves a design one place up or down in the gallery order. */
export async function moveDesign(slug: string, id: ID, direction: 'up' | 'down'): Promise<FormState> {
  try {
    const { repo } = await ctx(slug)
    const all = (await repo.find<{ id: ID; order?: number | null }>('designs', { where: { published: { equals: true } }, sort: 'order', limit: 500, depth: 0 }))
      .docs
    const i = all.findIndex((d) => String(d.id) === String(id))
    const j = direction === 'up' ? i - 1 : i + 1
    if (i < 0 || j < 0 || j >= all.length) return { ok: true }
    const next = [...all]
    ;[next[i], next[j]] = [next[j], next[i]]
    // Renumber everything so orders stay unique and gaps don't accumulate.
    for (const [k, d] of next.entries()) if ((d.order ?? null) !== k * 10) await repo.update('designs', d.id, { order: k * 10 })
    return done(slug, 'Order saved')
  } catch (err) {
    return fail(err)
  }
}

// ── Styles ────────────────────────────────────────────────────────────────────

export async function saveStyle(slug: string, _prev: FormState, f: FormData): Promise<FormState> {
  try {
    const { salon, payload, repo } = await ctx(slug)
    const name = str(f, 'name')
    if (!name) return { ok: false, error: 'Name the style' }
    if (name.length > 30) return { ok: false, error: 'Keep it short (30 letters max)' }
    const id = str(f, 'id')
    const existing = await salonStyles(payload, salon.id, { includeHidden: true })
    if (existing.some((s) => s.name.toLowerCase() === name.toLowerCase() && String(s.id) !== id)) return { ok: false, error: 'You already have that style' }
    if (id) await repo.update('styles', asId(id), { name, slug: slugify(name) })
    else await repo.create('styles', { name, slug: slugify(name), order: (existing.at(-1)?.order ?? 0) + 10, active: true })
    return done(slug, id ? 'Renamed' : 'Style added')
  } catch (err) {
    return fail(err)
  }
}

export async function updateStyle(slug: string, id: ID, action: 'up' | 'down' | 'hide' | 'show' | 'delete'): Promise<FormState> {
  try {
    const { salon, payload, repo } = await ctx(slug)
    if (action === 'delete') {
      // Designs keep working: the style is simply removed from them.
      const using = (await repo.find<{ id: ID; styles?: (ID | { id: ID })[] }>('designs', { where: { styles: { in: [asId(id)] } }, limit: 1000, depth: 0 }))
        .docs
      for (const d of using)
        await repo.update('designs', d.id, { styles: (d.styles ?? []).map((x) => (typeof x === 'object' ? x.id : x)).filter((x) => String(x) !== String(id)) })
      await repo.delete('styles', asId(id))
      return done(slug, 'Style deleted')
    }
    if (action === 'hide' || action === 'show') {
      await repo.update('styles', asId(id), { active: action === 'show' })
      return done(slug, action === 'hide' ? 'Hidden from customers' : 'Visible to customers')
    }
    const all = await salonStyles(payload, salon.id, { includeHidden: true })
    const i = all.findIndex((s) => String(s.id) === String(id))
    const j = action === 'up' ? i - 1 : i + 1
    if (i < 0 || j < 0 || j >= all.length) return { ok: true }
    const next = [...all]
    ;[next[i], next[j]] = [next[j], next[i]]
    for (const [k, s] of next.entries()) if ((s.order ?? null) !== k * 10) await repo.update('styles', s.id, { order: k * 10 })
    return done(slug, 'Order saved')
  } catch (err) {
    return fail(err)
  }
}

// ── Design library ────────────────────────────────────────────────────────────

export async function copyFromLibrary(slug: string, libraryId: ID): Promise<FormState> {
  try {
    const { salon, payload } = await ctx(slug)
    const r = await copyLibraryDesign(payload, salon.id, asId(libraryId))
    return done(slug, r.created ? 'Added to your gallery' : 'Already in your gallery')
  } catch (err) {
    return fail(err)
  }
}
