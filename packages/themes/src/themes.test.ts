import { describe, expect, it } from 'vitest'
import { contrast, fontsHref, getTheme, resolveTokens, tokensToCss } from './index'

describe('themes', () => {
  it('every theme has readable text and buttons', () => {
    for (const key of ['default', 'luxe', 'minimal']) {
      const t = getTheme(key).tokens
      expect(contrast(t.bg, t.text), `${key} text`).toBeGreaterThanOrEqual(4.5)
      expect(contrast(t.primary, t.onPrimary), `${key} button`).toBeGreaterThanOrEqual(4.5)
      expect(contrast(t.surface, t.text), `${key} cards`).toBeGreaterThanOrEqual(4.5)
    }
  })
  it('brand colours override the theme but keep button text readable', () => {
    const t = resolveTokens(getTheme('default'), { primaryColor: '#FFE066' })
    expect(t.primary).toBe('#FFE066')
    expect(t.onPrimary).toBe('#111111')
  })
  it('ignores invalid colours and unknown themes', () => {
    expect(resolveTokens(getTheme('nope'), { primaryColor: 'red' }).primary).toBe(getTheme('default').tokens.primary)
  })
  it('emits css variables and a fonts url', () => {
    const theme = getTheme('luxe')
    const css = tokensToCss(theme.tokens)
    expect(css).toContain('--t-primary:#C9A45C')
    expect(fontsHref(theme, theme.tokens)).toContain('Cormorant+Garamond')
  })
})
