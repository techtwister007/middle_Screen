const CATEGORY_HINTS: [RegExp, string][] = [
  [/per nail|add[- ]?on|extra|each nail/i, 'add-on'],
  [/extension|acrylic|overlay|tips?\b/i, 'extensions'],
  [/art|design|chrome|french|ombre|3d|stone/i, 'nail-art'],
  [/bridal|wedding/i, 'bridal'],
  [/pedi/i, 'pedicure'],
  [/mani/i, 'manicure'],
  [/refill|repair/i, 'refill'],
  [/remov/i, 'removal'],
  [/lash/i, 'lashes'],
  [/brow/i, 'brows'],
  [/gel/i, 'gel'],
]

/** Reads a pasted menu: one service per line, e.g. "Gel polish, 800, 45" or "Gel polish - ₹800 - 45 min". */
export function parseMenuText(text: string) {
  const parsed: { name: string; price: number; minutes: number; category: string }[] = []
  const skipped: string[] = []
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    // Name is everything before the first separator ("Gel polish, 800, 45"), or before the trailing numbers ("Gel 2.0 800 45").
    const sep = line.search(/\s*(?:[,|–:₹\t]|\s-\s|\s-₹|\sRs\.?\s)/i)
    const name = (sep > 0 ? line.slice(0, sep) : line.replace(/(\s+(?:rs\.?\s*)?\d[\d,]*\s*(?:min|mins|minutes|m|hr|hrs|hour|hours|h)?\.?)+\s*$/i, '')).trim()
    const rest = sep > 0 ? line.slice(sep) : line.slice(name.length)
    const nums = [...rest.matchAll(/(\d[\d,]*)\s*(min|mins|minutes|m\b|hr|hrs|hour|hours|h\b)?/gi)]
    if (!name || !nums.length) {
      skipped.push(line)
      continue
    }
    let price: number | undefined
    let minutes: number | undefined
    for (const m of nums) {
      const value = Number(m[1].replace(/,/g, ''))
      const unit = m[2]?.toLowerCase()
      if (unit?.startsWith('h')) minutes = value * 60
      else if (unit) minutes = value
      else if (price === undefined) price = value
      else if (minutes === undefined) minutes = value
    }
    if (price === undefined) {
      skipped.push(line)
      continue
    }
    const category = CATEGORY_HINTS.find(([re]) => re.test(name))?.[1] ?? 'gel'
    parsed.push({ name, price, minutes: minutes ?? 60, category })
  }
  return { parsed, skipped }
}
