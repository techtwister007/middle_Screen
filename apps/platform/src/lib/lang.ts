import 'server-only'
import { cookies, headers } from 'next/headers'
import { type Lang, translator } from './i18n'
import type { SalonRecord } from './salon'
import { currentCustomer } from './site'

const LANGS: Lang[] = ['en', 'hi', 'gu']
const isLang = (v: unknown): v is Lang => v === 'en' || v === 'hi' || v === 'gu'

/** The salon's enabled languages (English when none are set). */
export const salonLanguages = (salon?: Pick<SalonRecord, 'languages'> | null): Lang[] => {
  const list = (salon?.languages ?? []).filter(isLang)
  return list.length ? LANGS.filter((l) => list.includes(l)) : ['en']
}

/** The best match from an Accept-Language header ("gu-IN,gu;q=0.9,en;q=0.8"), or null. */
const fromAcceptLanguage = (header: string | null, allowed: Lang[]): Lang | null => {
  if (!header) return null
  const ranked = header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';')
      const q = params.find((p) => p.trim().startsWith('q='))
      return { lang: tag.trim().toLowerCase().split('-')[0], q: q ? Number(q.trim().slice(2)) || 0 : 1 }
    })
    .filter((x) => x.q > 0)
    .sort((a, b) => b.q - a.q)
  for (const { lang } of ranked) if (isLang(lang) && allowed.includes(lang)) return lang
  return null
}

/**
 * The customer's language: the `lang` cookie (set by the language switch), else the logged-in customer's
 * saved language, else the browser's Accept-Language. With `allowed` (the salon's languages), only those are used.
 */
export const getLang = async (fallback?: string | null, allowed?: Lang[]): Promise<Lang> => {
  const jar = await cookies()
  const ok = (v: unknown): v is Lang => isLang(v) && (!allowed || allowed.includes(v))
  const cookie = jar.get('lang')?.value
  if (ok(cookie)) return cookie
  if (ok(fallback)) return fallback
  if (allowed) {
    const accepted = fromAcceptLanguage((await headers()).get('accept-language'), allowed)
    if (accepted) return accepted
    return allowed.includes('en') ? 'en' : (allowed[0] ?? 'en')
  }
  return 'en'
}

/** The language for a customer page: cookie, saved language, then Accept-Language, limited to the salon's languages. */
export const salonLang = async (salon: SalonRecord): Promise<Lang> => getLang((await currentCustomer(salon))?.language, salonLanguages(salon))

/** Language plus a bound translator for server components. */
export const salonT = async (salon: SalonRecord) => {
  const lang = await salonLang(salon)
  return { lang, tr: translator(lang) }
}
