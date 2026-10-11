import 'server-only'
import type { FeatureKey } from '@salon/core'
import { formatIST, localWeekday } from '@salon/core'
import { notFound } from 'next/navigation'
import { type DictKey, formatClockIn, type Translator } from '@/lib/i18n'
import { getPayloadClient } from '@/lib/payload'
import { type SalonRecord, salonFeatures } from '@/lib/salon'

/** A customer page for a switched-off feature is simply not there. */
export const requireFeature = (salon: SalonRecord, ...features: FeatureKey[]) => {
  const on = salonFeatures(salon)
  if (!features.some((f) => on.has(f))) notFound()
}

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

/** Same rules as `openStatus` in lib/salon, with a translated label. */
export const openStatusIn = (salon: SalonRecord, tr: Translator, now = new Date()) => {
  const tz = salon.timezone ?? 'Asia/Kolkata'
  const to12h = (hhmm: string) => formatClockIn(tr.lang, hhmm)
  if (!salon.hours?.length) return null
  const wd = localWeekday(now, tz)
  const hhmm = formatIST(now, 'HH:mm', tz)
  const today = salon.hours.find((h) => h.day === DAYS[wd])
  if (today && !today.closed && today.open && today.close && hhmm >= today.open && hhmm < today.close)
    return { open: true, label: tr('openNowCloses', { time: to12h(today.close) }) }
  if (today && !today.closed && today.open && hhmm < today.open) return { open: false, label: tr('opensToday', { time: to12h(today.open) }) }
  for (let i = 1; i <= 7; i++) {
    const day = DAYS[(wd + i) % 7]
    const d = salon.hours.find((h) => h.day === day)
    if (d && !d.closed && d.open)
      return {
        open: false,
        label: i === 1 ? tr('opensTomorrow', { time: to12h(d.open) }) : tr('opensOnDay', { time: to12h(d.open), day: tr(`day_${day}` as DictKey) }),
      }
  }
  return { open: false, label: tr('closed') }
}

export interface Season {
  festival: string
  label: string
  title: string
  image?: unknown
}

/**
 * The season the salon is highlighting (`seasonalHighlight`), matched to the platform festival pack
 * when one is running. Festival packs are platform-wide reference data, not salon data.
 */
export const currentSeason = async (salon: SalonRecord, tr: Translator): Promise<Season | null> => {
  const now = new Date().toISOString()
  const payload = await getPayloadClient()
  let festival = salon.seasonalHighlight?.trim().toLowerCase() || null
  let image: unknown
  const packs = await payload.find({
    collection: 'campaign-packs',
    overrideAccess: true,
    depth: 1,
    limit: 5,
    where: {
      and: [{ startsOn: { less_than_equal: now } }, { endsOn: { greater_than_equal: now } }, ...(festival ? [{ festival: { equals: festival } }] : [])],
    },
  })
  const pack = packs.docs[0] as unknown as { festival: string; galleryTag?: string | null; image?: unknown } | undefined
  if (pack) {
    festival = pack.galleryTag || pack.festival
    image = pack.image
  }
  if (!festival) return null
  const fallback = festival.replace(/(^|[-_ ])(\w)/g, (_, s: string, c: string) => `${s ? ' ' : ''}${c.toUpperCase()}`)
  const label = tr.or(`fest_${festival}`, fallback)
  return { festival, label, title: tr('seasonTitle', { festival: label }), image }
}
