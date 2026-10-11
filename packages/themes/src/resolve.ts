import { defaultTheme, THEMES } from './themes'
import type { BrandOverrides, ThemeDefinition, ThemeTokens } from './types'

const HEX = /^#[0-9a-f]{6}$/i

const hexToRgb = (hex: string) => {
  const n = Number.parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Relative luminance (WCAG). */
export const luminance = (hex: string) => {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export const contrast = (a: string, b: string) => {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}

/** Picks black or white text for a background colour. */
export const readableOn = (bg: string) => (contrast(bg, '#FFFFFF') >= contrast(bg, '#111111') ? '#FFFFFF' : '#111111')

export const getTheme = (key?: string | null, custom?: ThemeDefinition | null): ThemeDefinition =>
  (key === 'custom' && custom) || THEMES[key ?? 'default'] || defaultTheme

/** Merges a salon's brand overrides onto its theme, keeping text readable. */
export const resolveTokens = (theme: ThemeDefinition, brand?: BrandOverrides | null): ThemeTokens => {
  const t = { ...theme.tokens }
  if (brand?.primaryColor && HEX.test(brand.primaryColor)) {
    t.primary = brand.primaryColor
    t.onPrimary = readableOn(brand.primaryColor)
  }
  if (brand?.accentColor && HEX.test(brand.accentColor)) t.accent = brand.accentColor
  if (brand?.backgroundColor && HEX.test(brand.backgroundColor)) {
    t.bg = brand.backgroundColor
    if (contrast(t.bg, t.text) < 4.5) t.text = readableOn(t.bg)
  }
  if (brand?.headingFont) t.headingFont = brand.headingFont
  if (brand?.bodyFont) t.bodyFont = brand.bodyFont
  return t
}

const SCRIPT_FALLBACKS = "'Noto Sans Gujarati', 'Noto Sans Devanagari'"

/** CSS custom properties consumed by Tailwind's theme mapping. */
export const tokensToCss = (t: ThemeTokens) =>
  [
    `--t-bg:${t.bg}`,
    `--t-surface:${t.surface}`,
    `--t-tint:${t.tint}`,
    `--t-text:${t.text}`,
    `--t-muted:${t.muted}`,
    `--t-primary:${t.primary}`,
    `--t-on-primary:${t.onPrimary}`,
    `--t-accent:${t.accent}`,
    `--t-border:${t.border}`,
    `--t-font-heading:'${t.headingFont}', ${SCRIPT_FALLBACKS}, Georgia, serif`,
    `--t-font-body:'${t.bodyFont}', ${SCRIPT_FALLBACKS}, system-ui, sans-serif`,
    `--t-radius:${t.radius}`,
    `--t-btn-radius:${t.buttonRadius}`,
    `--t-heading-tracking:${t.headingTracking}`,
    `--t-heading-case:${t.headingCase}`,
  ].join(';')

/** Google Fonts stylesheet URL for a theme plus any brand font overrides and Indic fallbacks. */
export const fontsHref = (theme: ThemeDefinition, tokens: ThemeTokens) => {
  const families = new Set(theme.fonts)
  for (const f of [tokens.headingFont, tokens.bodyFont]) if (![...families].some((x) => x.startsWith(f))) families.add(f)
  families.add('Noto Sans Gujarati:wght@400;600')
  families.add('Noto Sans Devanagari:wght@400;600')
  const q = [...families]
    .map((f) => `family=${encodeURIComponent(f).replace(/%20/g, '+').replace(/%3A/g, ':').replace(/%3B/g, ';').replace(/%40/g, '@').replace(/%2C/g, ',')}`)
    .join('&')
  return `https://fonts.googleapis.com/css2?${q}&display=swap`
}
