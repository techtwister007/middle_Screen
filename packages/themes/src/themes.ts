import type { ThemeDefinition } from './types'

export const defaultTheme: ThemeDefinition = {
  key: 'default',
  label: 'Blush',
  description: 'Warm, light and friendly. Rounded cards, soft shadows, a serif with personality.',
  tokens: {
    bg: '#FBF6F3',
    surface: '#FFFFFF',
    tint: '#F4EBE7',
    text: '#2A1E22',
    muted: '#7A6A6F',
    primary: '#B4537A',
    onPrimary: '#FFFFFF',
    accent: '#E8A87C',
    border: '#EADFDB',
    headingFont: 'Fraunces',
    bodyFont: 'Plus Jakarta Sans',
    radius: '24px',
    buttonRadius: '999px',
    headingTracking: '-0.01em',
    headingCase: 'none',
  },
  layout: { hero: 'split', cards: 'soft', gallery: 'masonry', motion: 'lively' },
  fonts: ['Fraunces:opsz,wght@9..144,400;9..144,600', 'Plus Jakarta Sans:wght@400;500;600'],
}

export const luxeTheme: ThemeDefinition = {
  key: 'luxe',
  label: 'Noir & Gold',
  description: 'Dark, slow and luxurious. Thin gold lines, high-contrast serif, full-bleed imagery.',
  tokens: {
    bg: '#0F0D0E',
    surface: '#181416',
    tint: '#221C1F',
    text: '#F3EADF',
    muted: '#A8998C',
    primary: '#C9A45C',
    onPrimary: '#140F0A',
    accent: '#8E6F3E',
    border: '#3A3029',
    headingFont: 'Cormorant Garamond',
    bodyFont: 'Jost',
    radius: '4px',
    buttonRadius: '2px',
    headingTracking: '0.01em',
    headingCase: 'none',
  },
  layout: { hero: 'full', cards: 'outline', gallery: 'editorial', motion: 'calm' },
  fonts: ['Cormorant Garamond:wght@400;500;600', 'Jost:wght@300;400;500'],
}

export const minimalTheme: ThemeDefinition = {
  key: 'minimal',
  label: 'Studio White',
  description: 'Editorial and image-first. Lots of white space, a crisp grid, almost no chrome.',
  tokens: {
    bg: '#FFFFFF',
    surface: '#FFFFFF',
    tint: '#F5F5F4',
    text: '#111111',
    muted: '#6B6B6B',
    primary: '#111111',
    onPrimary: '#FFFFFF',
    accent: '#D4C5B9',
    border: '#E7E5E4',
    headingFont: 'Instrument Serif',
    bodyFont: 'Inter',
    radius: '0px',
    buttonRadius: '0px',
    headingTracking: '-0.02em',
    headingCase: 'none',
  },
  layout: { hero: 'editorial', cards: 'flat', gallery: 'grid', motion: 'none' },
  fonts: ['Instrument Serif', 'Inter:wght@400;500;600'],
}

export const THEMES: Record<string, ThemeDefinition> = {
  default: defaultTheme,
  luxe: luxeTheme,
  minimal: minimalTheme,
}
