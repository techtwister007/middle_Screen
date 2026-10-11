export interface MediaLike {
  id?: string | number
  url?: string | null
  alt?: string | null
  width?: number | null
  height?: number | null
  sizes?: Record<string, { url?: string | null; width?: number | null } | undefined> | null
}

export const isMedia = (v: unknown): v is MediaLike => Boolean(v && typeof v === 'object' && 'url' in (v as object))

/** Best URL for a media document at a given size. */
export const mediaUrl = (m: unknown, size: 'thumb' | 'card' | 'large' | 'original' = 'card'): string | null => {
  if (!isMedia(m)) return null
  if (size !== 'original') {
    const s = m.sizes?.[size]?.url
    if (s) return s
  }
  return m.url ?? null
}

export const srcSet = (m: unknown) => {
  if (!isMedia(m)) return undefined
  const parts = (['thumb', 'card', 'large'] as const)
    .map((k) => m.sizes?.[k])
    .filter((s): s is { url: string; width: number } => Boolean(s?.url && s?.width))
    .map((s) => `${s.url} ${s.width}w`)
  return parts.length ? parts.join(', ') : undefined
}
