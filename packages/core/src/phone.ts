import { parsePhoneNumberFromString } from 'libphonenumber-js'

/** Normalises a phone number to E.164, defaulting to India. Returns null when invalid. */
export const normalizePhone = (input: string, defaultCountry: 'IN' = 'IN'): string | null => {
  const parsed = parsePhoneNumberFromString(input.trim(), defaultCountry)
  if (!parsed || !parsed.isValid()) return null
  return parsed.number
}

/** +919876543210 -> 98765 43210 */
export const formatPhone = (e164: string): string => {
  const parsed = parsePhoneNumberFromString(e164)
  return parsed ? parsed.formatNational() : e164
}

/** wa.me expects digits only, without the plus. */
export const waDigits = (e164: string): string => e164.replace(/\D/g, '')

export const maskPhone = (e164: string): string =>
  e164.length > 6 ? `${e164.slice(0, 3)}•••••${e164.slice(-3)}` : e164
