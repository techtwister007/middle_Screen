import 'server-only'
import { enabledFeatures, type FeatureKey, formatIST, type ID, localWeekday } from '@salon/core'
import { fontsHref, getTheme, resolveTokens, tokensToCss } from '@salon/themes'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { mediaUrl } from './media'
import { getPayloadClient } from './payload'

export interface SalonRecord {
  id: ID
  name: string
  slug: string
  plan: 'starter' | 'studio' | 'growth'
  status: string
  tagline?: string | null
  about?: string | null
  theme?: string | null
  brand?: {
    logo?: unknown
    cover?: unknown
    primaryColor?: string | null
    accentColor?: string | null
    backgroundColor?: string | null
    headingFont?: string | null
    bodyFont?: string | null
  } | null
  homeSections?: { section: string; visible?: boolean | null }[] | null
  languages?: string[] | null
  seasonalHighlight?: string | null
  contact?: {
    phone?: string | null
    whatsapp?: string | null
    email?: string | null
    instagram?: string | null
    address?: string | null
    area?: string | null
    city?: string | null
    mapUrl?: string | null
    googlePlaceId?: string | null
    parking?: string | null
  } | null
  hours?: { day: string; open?: string | null; close?: string | null; closed?: boolean | null }[] | null
  timezone?: string | null
  upiVpa?: string | null
  featureOverrides?: { feature: FeatureKey; enabled: boolean }[] | null
  settings?: Record<string, unknown> | null
  createdAt: string
}

export const getSalonBySlug = cache(async (slug: string): Promise<SalonRecord | null> => {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'salons',
    overrideAccess: true,
    depth: 1,
    limit: 1,
    where: { slug: { equals: slug } },
  })
  const salon = res.docs[0] as unknown as SalonRecord | undefined
  if (!salon || salon.status === 'suspended') return null
  return salon
})

export const salonFeatures = (salon: SalonRecord) => enabledFeatures({ plan: salon.plan, featureOverrides: salon.featureOverrides })

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

const to12h = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  const suffix = h >= 12 ? 'pm' : 'am'
  const hour = h % 12 || 12
  return m ? `${hour}:${String(m).padStart(2, '0')} ${suffix}` : `${hour} ${suffix}`
}

/** "Open now · closes 8 pm" / "Closed · opens 10 am tomorrow" */
export const openStatus = (salon: SalonRecord, now = new Date()) => {
  const tz = salon.timezone ?? 'Asia/Kolkata'
  if (!salon.hours?.length) return null
  const day = DAYS[localWeekday(now, tz)]
  const hhmm = formatIST(now, 'HH:mm', tz)
  const today = salon.hours.find((h) => h.day === day)
  if (today && !today.closed && today.open && today.close && hhmm >= today.open && hhmm < today.close)
    return { open: true, label: `Open now · closes ${to12h(today.close)}` }
  if (today && !today.closed && today.open && hhmm < today.open) return { open: false, label: `Opens ${to12h(today.open)} today` }
  for (let i = 1; i <= 7; i++) {
    const d = salon.hours.find((h) => h.day === DAYS[(localWeekday(now, tz) + i) % 7])
    if (d && !d.closed && d.open)
      return {
        open: false,
        label: `Closed · opens ${to12h(d.open)} ${i === 1 ? 'tomorrow' : DAYS[(localWeekday(now, tz) + i) % 7].replace(/^\w/, (c) => c.toUpperCase())}`,
      }
  }
  return { open: false, label: 'Closed' }
}

export const salonTheme = (salon: SalonRecord) => {
  const theme = getTheme(salon.theme)
  const tokens = resolveTokens(theme, salon.brand)
  return { theme, tokens, css: tokensToCss(tokens), fontsHref: fontsHref(theme, tokens) }
}

export const sectionSalon = (salon: SalonRecord) => ({
  name: salon.name,
  slug: salon.slug,
  tagline: salon.tagline,
  about: salon.about,
  logoUrl: mediaUrl(salon.brand?.logo, 'thumb'),
  coverUrl: mediaUrl(salon.brand?.cover, 'large'),
  area: salon.contact?.area,
  city: salon.contact?.city,
  openNow: openStatus(salon),
  instagram: salon.contact?.instagram,
})

export const DEFAULT_SECTIONS = ['hero', 'nextVisit', 'offers', 'newDesigns', 'services', 'loyalty', 'invite', 'contest', 'artists', 'reviews', 'visit']

export const homeSectionOrder = (salon: SalonRecord) =>
  salon.homeSections?.length ? salon.homeSections.filter((s) => s.visible !== false).map((s) => s.section) : DEFAULT_SECTIONS

/** 404s a page whose feature is switched off for this salon (plan or override). */
export const requireFeature = (salon: SalonRecord, feature: FeatureKey) => {
  if (!salonFeatures(salon).has(feature)) notFound()
}
