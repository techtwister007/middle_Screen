import { chromium } from '@playwright/test'
export const OUT = '/tmp/claude-0/-home-user-middle-Screen/276897a0-a7bc-5fca-a8e1-8ebff523e993/scratchpad/audit-customer/shots'
export const BASE = 'http://localhost:3000'
export async function launch(vp = { width: 390, height: 844 }) {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
  const ctx = await browser.newContext({
    viewport: vp,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36',
  })
  const page = await ctx.newPage()
  const log = []
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') log.push(`[console.${m.type()}] ${page.url()} :: ${m.text().slice(0, 300)}`)
  })
  page.on('pageerror', (e) => log.push(`[pageerror] ${page.url()} :: ${e.message.slice(0, 300)}`))
  page.on('response', (r) => {
    if (r.status() >= 400) log.push(`[http ${r.status()}] ${r.url()}`)
  })
  return { browser, ctx, page, log }
}
export async function metrics(page) {
  return page.evaluate(() => {
    const vw = innerWidth
    const out = {
      url: location.pathname + location.search,
      scrollW: document.documentElement.scrollWidth,
      vw,
      small: [],
      tinyText: [],
      overflowEls: [],
      brokenImg: [],
    }
    const seen = new Set()
    for (const el of document.querySelectorAll('a,button,input,select,textarea,[role=button],summary,label[for]')) {
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      if (!r.width || !r.height || cs.visibility === 'hidden') continue
      if (el.type === 'hidden') continue
      if (r.height < 44 || r.width < 44) {
        const t = (el.innerText || el.getAttribute('aria-label') || el.value || el.name || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40)
        const k = t + Math.round(r.height)
        if (!seen.has(k)) {
          seen.add(k)
          out.small.push(`${el.tagName.toLowerCase()} "${t}" ${Math.round(r.width)}x${Math.round(r.height)}`)
        }
      }
      if (r.right > vw + 1) out.overflowEls.push(`${el.tagName} ${(el.innerText || '').slice(0, 30)} right=${Math.round(r.right)}`)
    }
    const tseen = new Set()
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) {
      const n = walker.currentNode
      const txt = n.textContent.trim()
      if (txt.length < 3) continue
      const el = n.parentElement
      const cs = getComputedStyle(el)
      const fs = parseFloat(cs.fontSize)
      const r = el.getBoundingClientRect()
      if (!r.width) continue
      if (fs < 13) {
        const k = txt.slice(0, 30)
        if (!tseen.has(k) && out.tinyText.length < 15) {
          tseen.add(k)
          out.tinyText.push(`${fs}px "${txt.slice(0, 40)}"`)
        }
      }
    }
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect()
      if (r.right > vw + 2 && r.width > 0 && getComputedStyle(el).position !== 'fixed') {
        out.overflowEls.push(`${el.tagName}.${(el.className + '').slice(0, 40)} right=${Math.round(r.right)}`)
        if (out.overflowEls.length > 6) break
      }
    }
    for (const img of document.images)
      if (img.complete && img.naturalWidth === 0 && img.getBoundingClientRect().width) out.brokenImg.push(img.src.slice(0, 100))
    out.h1 = [...document.querySelectorAll('h1')].map((h) => h.innerText.slice(0, 60))
    out.lang = document.documentElement.lang
    return out
  })
}
export async function shot(page, name, full = true) {
  const p = `${OUT}/${name}.png`
  await page.screenshot({ path: p, fullPage: full })
  return p
}
export const rnd = () => '9' + String(Math.floor(Math.random() * 1e9)).padStart(9, '0')
