import { normalizePhone } from '@salon/core'

/**
 * Reads customer contacts from pasted text, CSV or vCard: "Name, phone", "phone name", tab-separated cells, or VCARD blocks.
 * Returns E.164 phones, de-duplicated, plus the lines that had no usable number.
 */
export function parseContacts(text: string) {
  const contacts = new Map<string, { name?: string; phone: string }>()
  const skipped: string[] = []
  const add = (rawPhone: string, rawName?: string) => {
    const phone = normalizePhone(rawPhone)
    if (!phone) return false
    const name = rawName?.replace(/["']/g, '').replace(/\s+/g, ' ').trim() || undefined
    if (!contacts.has(phone) || (name && !contacts.get(phone)?.name)) contacts.set(phone, { phone, name })
    return true
  }
  if (/BEGIN:VCARD/i.test(text)) {
    for (const card of text.split(/END:VCARD/i)) {
      const name = card.match(/^FN[^:]*:(.+)$/im)?.[1]
      const phone = card.match(/^TEL[^:]*:(.+)$/im)?.[1]
      if (phone) add(phone, name)
    }
    return { contacts: [...contacts.values()], skipped }
  }
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || /^(name|customer)\b.*(phone|mobile|number)/i.test(line)) continue
    const phoneMatch = line.match(/(\+?\d[\d\s\-()]{8,}\d)/)
    if (
      !phoneMatch ||
      !add(
        phoneMatch[1],
        line
          .replace(phoneMatch[1], '')
          .split(/[,;\t]/)
          .find((p) => /[a-zऀ-૿]/i.test(p)),
      )
    )
      skipped.push(line)
  }
  return { contacts: [...contacts.values()], skipped }
}
