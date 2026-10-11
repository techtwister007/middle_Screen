import { BASE, launch, metrics, rnd, shot } from './lib.mjs'

const salon = process.argv[2] || 'glamnails'
const vp = process.argv[3] === '360' ? { width: 360, height: 740 } : { width: 390, height: 844 }
const tag = `j1_${salon}_${vp.width}`
const { browser, page, log } = await launch(vp)
let n = 0
const S = async (label) => {
  await page.waitForTimeout(400)
  const m = await metrics(page)
  const p = await shot(page, `${tag}_${String(++n).padStart(2, '0')}_${label}`, false)
  const acts = await page.evaluate(() =>
    [...document.querySelectorAll('a,button')]
      .filter((e) => {
        const r = e.getBoundingClientRect()
        return r.width && r.height
      })
      .map(
        (e) => `${(e.innerText || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 30)}@${Math.round(e.getBoundingClientRect().top)}`,
      )
      .slice(0, 60)
      .join(' | '),
  )
  console.log(`\n## ${p}\n url=${m.url} scrollW=${m.scrollW}/${m.vw} h1=${m.h1}\n small=${m.small.slice(0, 12).join('; ')}\n acts=${acts}`)
}
const T = async (fn, label) => {
  try {
    await fn()
  } catch (e) {
    console.log(`!! ${label}: ${e.message.split('\n')[0]}`)
  }
}
await page.goto(`${BASE}/s/${salon}/designs`, { waitUntil: 'networkidle' })
await S('designs')
await T(
  () =>
    page
      .getByRole('button', { name: /Garba|Wedding/ })
      .first()
      .click(),
  'filter',
)
await S('filtered')
await T(() => page.locator('select').first().selectOption({ index: 1 }), 'budget')
await S('budget')
await page.goto(`${BASE}/s/${salon}/designs`, { waitUntil: 'networkidle' })
const href = await page.locator(`a[href*="/designs/"]`).first().getAttribute('href')
await page.goto(BASE + href, { waitUntil: 'networkidle' })
await S('design')
await page.screenshot({ path: `${process.cwd()}/x.png` }).catch(() => {})
await shot(page, `${tag}_design_full`, true)
await T(async () => {
  const b = page.locator('main button, button').filter({ hasText: /\+₹/ }).first()
  await b.click()
}, 'addon')
await S('addon')
await T(() => page.getByRole('button', { name: /save/i }).first().click(), 'save')
await page.waitForTimeout(1200)
await S('save_anon')
await page.goto(BASE + href, { waitUntil: 'networkidle' })
await T(async () => {
  await page
    .getByRole('link', { name: /book this look/i })
    .first()
    .click()
  await page.waitForURL(/\/book/, { timeout: 90000 })
  await page.waitForLoadState('networkidle')
}, 'bookthis')
await S('book_start')
await T(async () => {
  await page
    .locator('main button, button')
    .filter({ hasText: /Anyone/i })
    .first()
    .click({ timeout: 10000 })
}, 'artist')
await page.waitForTimeout(800)
await S('time_loading')
await page.waitForTimeout(4000)
await S('time')
for (let i = 0; i < 6; i++) {
  const slot = page.getByTestId('slot')
  if (await slot.count()) {
    await slot.nth(Math.min(4, (await slot.count()) - 1)).click()
    break
  }
  await T(
    () =>
      page
        .getByTestId('day')
        .nth(i + 1)
        .click({ timeout: 5000 }),
    'date',
  )
  await page.waitForTimeout(3500)
}
await S('details')
await T(
  () =>
    page
      .getByRole('button', { name: /review/i })
      .first()
      .click(),
  'details->confirm',
)
await S('confirm')
const phone = rnd()
console.log('PHONE', phone)
await T(() => page.locator('#phone').fill(phone), 'phone')
await S('phone_filled')
await T(() => page.getByRole('button', { name: /send code/i }).click(), 'send')
await page.waitForTimeout(2000)
await S('code')
await T(() => page.locator('#code').fill('123456'), 'code')
await T(() => page.locator('#name').fill('Priya'), 'name')
await T(() => page.getByRole('button', { name: /^continue/i }).click(), 'verify')
await page.waitForTimeout(2500)
await S('after_login')
await shot(page, `${tag}_after_login_full`, true)
await T(
  () =>
    page
      .getByRole('button', { name: /pay|confirm booking/i })
      .last()
      .click(),
  'pay/confirm',
)
await page.waitForTimeout(4000)
await S('after_submit')
if (page.url().includes('/pay/test')) {
  await T(() => page.getByRole('button', { name: /pay with upi/i }).click(), 'paytest')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1500)
  await S('paid_appt')
  await shot(page, `${tag}_paid_appt_full`, true)
}
console.log('APPT_URL', page.url())
console.log('\nLOG\n' + log.join('\n'))
const cookies = await page.context().cookies()
;(await import('fs')).writeFileSync(
  `/tmp/claude-0/-home-user-middle-Screen/276897a0-a7bc-5fca-a8e1-8ebff523e993/scratchpad/audit-customer/state_${salon}.json`,
  JSON.stringify({ cookies, phone, appt: page.url() }),
)
await browser.close()
