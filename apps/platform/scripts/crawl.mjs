/**
 * Smoke crawler: logs in as each role, follows every internal link and reports
 * HTTP errors, runtime errors, console errors and broken links.
 *   node scripts/crawl.mjs [baseURL]     (needs the demo seed and OTP_FIXED_CODE)
 */
import { chromium, devices } from '@playwright/test'

const BASE = process.argv[2] ?? process.env.E2E_BASE_URL ?? 'http://localhost:3000'
const CODE = process.env.OTP_FIXED_CODE ?? '123456'
const SLUG = process.env.E2E_SALON ?? 'glamnails'
const LIMIT = Number(process.env.CRAWL_LIMIT ?? 120)
const ERROR_TEXT =
  /Application error|Unhandled Runtime Error|Internal Server Error|Something went wrong|could not be found|NaN|undefined|\[object Object\]|Invalid Date/

const staffLogin = (email, password) => async (page) => {
  await page.goto(`${BASE}/studio/login`)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL((u) => !u.pathname.endsWith('/login'), { timeout: 60_000 })
}
const customerLogin = (phone) => async (page) => {
  await page.goto(`${BASE}/s/${SLUG}/login`)
  await page.getByPlaceholder('98765 43210').fill(phone)
  await page.getByRole('button', { name: /send code/i }).click()
  await page.getByLabel(/enter the code/i).fill(CODE)
  const name = page.getByLabel(/your name/i)
  if (await name.isVisible().catch(() => false)) await name.fill('Crawler')
  await page.getByRole('button', { name: /^continue$/i }).click()
  await page.waitForURL((u) => !u.pathname.endsWith('/login'), { timeout: 60_000 })
}

const ROLES = [
  { name: 'visitor', seeds: ['/', `/s/${SLUG}`, `/s/aura`, `/s/riddhi`, '/discover/ahmedabad'], scope: /^\/(s\/|discover|$)/ },
  {
    name: 'customer',
    login: customerLogin(process.env.CRAWL_PHONE ?? ['9811100003', '9811100045', '9811100019', '9811100041', '9811100016'][Math.floor(Math.random() * 5)]),
    seeds: [`/s/${SLUG}`, `/s/${SLUG}/me`, `/s/${SLUG}/rewards`, `/s/${SLUG}/invite`],
    scope: new RegExp(`^/s/${SLUG}`),
  },
  {
    name: 'owner',
    login: staffLogin(`owner@${SLUG}.test`, 'owner-demo-123'),
    seeds: [
      '/studio',
      `/studio/${SLUG}/today`,
      `/studio/${SLUG}/today/close`,
      `/studio/${SLUG}/calendar`,
      `/studio/${SLUG}/appointments/new`,
      `/studio/${SLUG}/settings`,
      `/studio/${SLUG}/photos?tab=collage`,
    ],
    scope: /^\/studio/,
  },
  { name: 'admin', login: staffLogin('admin@platform.test', 'admin-demo-123'), seeds: ['/console', '/admin'], scope: /^\/(console|admin$)/ },
]
const SKIP = /logout|sign-?out|\.ics$|\/api\/|\/l\/|\/r\/|\/kiosk$|\/display$|^\/admin\/.|\/export$|\/open$|\/me\/data$/

const report = []
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH })
for (const role of ROLES) {
  const ctx = await browser.newContext({ ...devices['Pixel 7'] })
  const page = await ctx.newPage()
  let current = ''
  const consoleErrors = []
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(`${current}: ${m.text().slice(0, 300)}`))
  page.on('pageerror', (e) => consoleErrors.push(`${current}: PAGEERROR ${e.message.slice(0, 300)}`))
  if (role.login) {
    try {
      await role.login(page)
    } catch (e) {
      report.push({ role: role.name, url: 'LOGIN', problem: e.message.slice(0, 200) })
      continue
    }
  }
  const seen = new Set()
  const queue = role.seeds.map((u) => ({ url: u, from: 'seed' }))
  while (queue.length && seen.size < LIMIT) {
    const { url, from } = queue.shift()
    if (seen.has(url)) continue
    seen.add(url)
    current = url
    let res
    try {
      res = await page.goto(BASE + url, { waitUntil: 'domcontentloaded', timeout: 90_000 })
      await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {})
    } catch (e) {
      report.push({ role: role.name, url, from, problem: `navigation: ${e.message.split('\n')[0]}` })
      continue
    }
    const status = res?.status() ?? 0
    if (status >= 400) report.push({ role: role.name, url, from, problem: `HTTP ${status}` })
    const text = await page
      .locator('body')
      .innerText()
      .catch(() => '')
    const bad = text.match(ERROR_TEXT)
    if (bad)
      report.push({
        role: role.name,
        url,
        from,
        problem: `text "${bad[0]}": …${text.slice(Math.max(0, bad.index - 80), bad.index + 80).replace(/\s+/g, ' ')}…`,
      })
    const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href')))
    for (const h of hrefs) {
      if (!h || h.startsWith('#') || /^(mailto|tel|https?:\/\/(?!localhost)|whatsapp|upi|intent|sms)/.test(h)) continue
      let u
      try {
        u = new URL(h, BASE + url)
      } catch {
        continue
      }
      if (u.origin !== new URL(BASE).origin) continue
      const p = u.pathname + u.search
      if (SKIP.test(u.pathname) || !role.scope.test(u.pathname)) continue
      // Collapse id-like routes so we visit a couple per pattern.
      const pattern = u.pathname.replace(/\/\d+(?=\/|$)/g, '/:id')
      const sameType = [...seen, ...queue.map((q) => q.url)].filter((s) => s.split('?')[0].replace(/\/\d+(?=\/|$)/g, '/:id') === pattern).length
      if (sameType < 2 && !seen.has(p)) queue.push({ url: p, from: url })
    }
  }
  report.push(...consoleErrors.map((c) => ({ role: role.name, url: c.split(': ')[0], problem: `console: ${c.slice(c.indexOf(': ') + 2)}` })))
  console.log(`${role.name}: visited ${seen.size} pages`)
  await ctx.close()
}
await browser.close()
const seenProblems = new Set()
for (const r of report) {
  const k = `${r.role}|${r.url}|${r.problem}`
  if (seenProblems.has(k)) continue
  seenProblems.add(k)
  console.log(`[${r.role}] ${r.url}${r.from ? ` (from ${r.from})` : ''}\n    ${r.problem}`)
}
console.log(`\n${seenProblems.size} problems`)
process.exitCode = seenProblems.size ? 1 : 0
