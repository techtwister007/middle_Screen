import 'server-only'
import { cookies } from 'next/headers'
import type { Lang } from './i18n'

export const getLang = async (fallback?: string | null): Promise<Lang> => {
  const jar = await cookies()
  const v = jar.get('lang')?.value ?? fallback
  return v === 'hi' || v === 'gu' ? v : 'en'
}
