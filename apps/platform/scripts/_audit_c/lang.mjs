import fs from 'fs'
import { BASE, launch, shot } from './lib.mjs'

const salon = process.argv[2] || 'glamnails'
const lang = process.argv[3] || 'gu'
const state = process.argv[4] ? JSON.parse(fs.readFileSync(process.argv[4])) : null
const { browser, page, ctx, log } = await launch()
if (state) await ctx.addCookies(state.cookies)
await ctx.addCookies([{ name: 'lang', value: lang, domain: 'localhost', path: '/' }])
const paths = (process.argv[5] || ',/designs,/designs/18,/menu,/care,/contest,/try-on,/chair,/book,/login').split(',')
for (const p of paths) {
  await page.goto(`${BASE}/s/${salon}${p}`, { waitUntil: 'networkidle', timeout: 90000 }).catch((e) => console.log('ERR', e.message))
  await page.waitForTimeout(500)
  const eng = await page.evaluate(() => {
    const out = new Set()
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    while (w.nextNode()) {
      const t = w.currentNode.textContent.trim()
      const el = w.currentNode.parentElement
      if (!el || el.closest('script,style,nav[aria-label=none]')) continue
      const r = el.getBoundingClientRect()
      if (!r.width) continue
      if (/[A-Za-z]{3,}(\s+[A-Za-z]{2,}){1,}/.test(t)) out.add(t.slice(0, 70))
    }
    return [...out].slice(0, 40)
  })
  const name = `lang_${salon}_${lang}_${(p || 'home').replace(/[^a-z0-9]/gi, '_')}`
  await shot(page, name, false)
  console.log(`\n## ${name} ${page.url().replace(BASE, '')} htmlLang=${await page.evaluate(() => document.documentElement.lang)}\n EN: ${eng.join(' | ')}`)
}
console.log(log.filter((l) => !l.includes('scroll-behavior')).join('\n'))
await browser.close()
