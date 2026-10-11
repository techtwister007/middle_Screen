const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'

/** Human-friendly code without ambiguous characters (no 0/O, 1/I). */
export const shortCode = (length = 6): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  let out = ''
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length]
  return out
}

export const slugify = (input: string): string =>
  input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
