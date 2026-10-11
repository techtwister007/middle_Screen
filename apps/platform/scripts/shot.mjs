// Usage: node scripts/shot.mjs <url> <out.png> [width] [height] [fullPage]
import { chromium } from '@playwright/test'

const [url, out, w = '390', h = '844', full = 'true'] = process.argv.slice(2)
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined })
const ctx = await browser.newContext({ viewport: { width: Number(w), height: Number(h) }, deviceScaleFactor: 1 })
if (process.env.COOKIE) {
  const [name, value] = process.env.COOKIE.split('=')
  await ctx.addCookies([{ name, value, url }])
}
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})
await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
// Hide fixed bars so full-page shots read top to bottom.
if (full === 'true') await page.addStyleTag({ content: 'nav.fixed{position:static!important}' })
await page.waitForTimeout(900)
await page.screenshot({ path: out, fullPage: full === 'true' })
if (errors.length) console.log('console errors:', errors.slice(0, 5).join(' | '))
await browser.close()
