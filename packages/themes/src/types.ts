import type { ComponentType } from 'react'

export interface ThemeTokens {
  bg: string
  surface: string
  tint: string
  text: string
  muted: string
  primary: string
  onPrimary: string
  accent: string
  border: string
  headingFont: string
  bodyFont: string
  /** Card radius, e.g. 22px */
  radius: string
  /** Button radius */
  buttonRadius: string
  /** Letter-spacing for headings */
  headingTracking: string
  /** Uppercase small labels? */
  headingCase: 'none' | 'uppercase'
}

export interface ThemeLayout {
  /** split: photo beside text; full: full-bleed photo with overlay; editorial: big type over a mosaic */
  hero: 'split' | 'full' | 'editorial'
  /** soft: shadowed rounded cards; outline: hairline cards; flat: borderless image-first */
  cards: 'soft' | 'outline' | 'flat'
  /** grid: even squares; masonry: staggered; editorial: one large then pairs */
  gallery: 'grid' | 'masonry' | 'editorial'
  /** Motion personality */
  motion: 'lively' | 'calm' | 'none'
}

/** Everything a section component receives. Themes render data, they never fetch it. */
export interface SectionProps {
  salon: {
    name: string
    slug: string
    tagline?: string | null
    about?: string | null
    logoUrl?: string | null
    coverUrl?: string | null
    area?: string | null
    city?: string | null
    openNow?: { open: boolean; label: string } | null
    instagram?: string | null
  }
  base: string
  customer?: { firstName: string } | null
  // biome-ignore lint/suspicious/noExplicitAny: section-specific payloads
  data?: any
}

export type SectionKey =
  | 'hero'
  | 'nextVisit'
  | 'offers'
  | 'newDesigns'
  | 'services'
  | 'gallery'
  | 'loyalty'
  | 'invite'
  | 'contest'
  | 'artists'
  | 'reviews'
  | 'visit'

export interface ThemeDefinition {
  key: string
  label: string
  description: string
  tokens: ThemeTokens
  layout: ThemeLayout
  /** Optional section overrides. Missing sections fall back to the default implementation. */
  components?: Partial<Record<SectionKey, ComponentType<SectionProps>>>
  /** Google Fonts families to load */
  fonts: string[]
}

export interface BrandOverrides {
  primaryColor?: string | null
  accentColor?: string | null
  backgroundColor?: string | null
  headingFont?: string | null
  bodyFont?: string | null
}
