import 'server-only'
import { cookies } from 'next/headers'
import { type Lang, translator } from './i18n'
import type { SalonRecord } from './salon'
import { currentCustomer } from './site'

export const getLang = async (fallback?: string | null): Promise<Lang> => {
  const jar = await cookies()
  const v = jar.get('lang')?.value ?? fallback
  return v === 'hi' || v === 'gu' ? v : 'en'
}

/** The language for a customer page: the `lang` cookie, else the logged-in customer's saved language, else English. */
export const salonLang = async (salon: SalonRecord): Promise<Lang> => getLang((await currentCustomer(salon))?.language)

/** Language plus a bound translator for server components. */
export const salonT = async (salon: SalonRecord) => {
  const lang = await salonLang(salon)
  return { lang, tr: translator(lang) }
}
