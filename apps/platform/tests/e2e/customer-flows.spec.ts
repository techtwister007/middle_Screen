import { expect, type Page, test } from '@playwright/test'

/**
 * Customer app flows: language switch, saving designs, rescheduling and group booking.
 * Requires the demo seed (pnpm seed) and OTP_FIXED_CODE in a non-production environment.
 */
const SLUG = process.env.E2E_SALON ?? 'glamnails'
const CODE = process.env.OTP_FIXED_CODE ?? '123456'
const phone = () => `9${Math.floor(100000000 + Math.random() * 899999999)}`
const base = `/s/${SLUG}`

const login = async (page: Page, next = base) => {
  await page.goto(`${base}/login?next=${encodeURIComponent(next)}`)
  await page.getByLabel(/mobile number/i).fill(phone())
  await page.getByRole('button', { name: /send code/i }).click()
  await page.getByLabel(/enter the code/i).fill(CODE)
  await page.getByLabel(/your name/i).fill('E2E Flow')
  await page.getByRole('button', { name: /^continue$/i }).click()
  await page.waitForURL((url) => !url.pathname.endsWith('/login'))
}

/** On the time step: pick the first day from `from` onwards that has a free slot. Returns the day index. */
const pickSlot = async (page: Page, from = 1) => {
  const days = page.getByTestId('day')
  for (let i = from; i < from + 12; i++) {
    await days.nth(i).click()
    const slot = page.getByTestId('slot').first()
    await expect(slot.or(page.getByTestId('fully-booked'))).toBeVisible({ timeout: 60_000 })
    if (await slot.isVisible()) {
      await slot.click()
      return i
    }
  }
  throw new Error('No free slot found')
}

/** From a logged-in session: book the first design, return the appointment id. */
const bookFirstDesign = async (page: Page, beforeConfirm?: () => Promise<void>) => {
  await page.goto(`${base}/designs`)
  // A design with a priced service (Studio may have looks without one, which start on the service step).
  await page.locator(`a[href*="${base}/designs/"]`).filter({ hasText: /from ₹/ }).first().click()
  await page.getByRole('link', { name: /book this look/i }).click()
  await expect(page).toHaveURL(/\/book/)
  const anyone = page.getByRole('button', { name: /anyone available/i })
  if (await anyone.isVisible().catch(() => false)) await anyone.click()
  await pickSlot(page, 1)
  await page.getByRole('button', { name: /review booking/i }).click()
  if (beforeConfirm) await beforeConfirm()
  await page.getByRole('button', { name: /confirm booking|deposit/i }).click()
  await page.waitForURL(/\/(pay\/test|book)/)
  if (page.url().includes('/pay/test/')) {
    await page.getByRole('button', { name: /pay with upi/i }).click()
    await page.waitForURL(/\/appointments\/[^/?]+/)
    return page.url().match(/\/appointments\/([^/?]+)/)![1]
  }
  const ics = page.locator('a[href*="/ics"]').first()
  await expect(ics).toBeVisible()
  return (await ics.getAttribute('href'))!.match(/\/appointments\/([^/]+)\/ics/)![1]
}

test('switching to Gujarati changes the booking page and the nav', async ({ page }) => {
  await login(page, `${base}/me`)
  await page.goto(`${base}/me`)
  await page.getByTestId('language-switch').getByRole('button', { name: 'ગુજરાતી' }).click()
  await expect(page.getByRole('heading', { name: 'મારા નખ', level: 1 })).toBeVisible()
  await page.goto(`${base}/book`)
  await expect(page.getByRole('heading', { name: 'તમે શું કરાવવા માંગો છો?' })).toBeVisible()
  await expect(page.getByRole('navigation').getByText('ડિઝાઇન')).toBeVisible()
  await page.goto(`${base}/designs`)
  await expect(page.getByRole('heading', { name: 'ડિઝાઇન', level: 1 })).toBeVisible()
  // and back to English
  await page.goto(`${base}/me`)
  await page.getByTestId('language-switch').getByRole('button', { name: 'English' }).click()
  await expect(page.getByRole('heading', { name: 'My nails', level: 1 })).toBeVisible()
})

test('saving a design while logged out asks to log in, then shows it under Saved', async ({ page }) => {
  await page.goto(`${base}/designs`)
  await page.locator(`a[href*="${base}/designs/"]`).first().click()
  await page.waitForURL(/\/designs\/[^/?]+$/)
  const title = (await page.getByRole('heading', { level: 1 }).textContent())?.trim() ?? ''
  await page.getByTestId('save-design').click()
  await expect(page).toHaveURL(/\/login\?next=/)
  await page.getByLabel(/mobile number/i).fill(phone())
  await page.getByRole('button', { name: /send code/i }).click()
  await page.getByLabel(/enter the code/i).fill(CODE)
  await page.getByRole('button', { name: /^continue$/i }).click()
  // Back on the design, now saved.
  await expect(page).toHaveURL(/\/designs\/[^/?]+/)
  await expect(page.getByTestId('save-design')).toHaveAttribute('aria-pressed', 'true')
  await page.goto(`${base}/me`)
  const saved = page.getByTestId('saved-design')
  await expect(saved).toHaveCount(1)
  await expect(saved.first()).toContainText(title)
  // Unsave from the gallery card heart.
  await page.goto(`${base}/designs`)
  await page.getByRole('button', { name: 'Remove from saved' }).first().click()
  await expect(page.getByRole('button', { name: 'Remove from saved' })).toHaveCount(0)
  await expect(page.locator('[data-testid="save-design"]:disabled')).toHaveCount(0)
  await page.goto(`${base}/me`)
  await expect(page.getByTestId('saved-design')).toHaveCount(0)
})

test('reschedule moves the same appointment instead of creating a new one', async ({ page }) => {
  await login(page)
  const id = await bookFirstDesign(page)
  await page.goto(`${base}/appointments/${id}`)
  const before = await page.getByTestId('appt-date').textContent()
  await page.getByRole('link', { name: /reschedule/i }).click()
  await expect(page).toHaveURL(new RegExp(`/book\\?reschedule=${id}`))
  // Well past the first free day the booking landed on, so the date really changes.
  await pickSlot(page, 7)
  await page.getByRole('button', { name: /move my appointment/i }).click()
  await page.waitForURL(new RegExp(`/appointments/${id}\\?moved=1`))
  await expect(page.getByTestId('moved')).toBeVisible()
  await expect(page.getByTestId('appt-date')).not.toHaveText(before ?? '')
  await page.goto(`${base}/appointments`)
  await expect(page.getByTestId('upcoming').getByTestId('appointment-row')).toHaveCount(1)
})

test('book with friends creates a group link that a friend can join', async ({ page, browser }) => {
  await login(page)
  let link = ''
  const id = await bookFirstDesign(page, async () => {
    await page
      .getByRole('button', { name: /book with friends/i })
      .first()
      .click()
    await page.getByLabel(/occasion/i).fill('Sangeet')
    await page
      .getByRole('button', { name: /book with friends/i })
      .last()
      .click()
    await expect(page.getByTestId('group-link')).toBeVisible()
    link = (await page.getByTestId('group-link').textContent())?.trim() ?? ''
  })
  expect(link).toMatch(/\/book\?group=[A-Z0-9]+/)
  // The organiser's appointment carries the group link too.
  await page.goto(`${base}/appointments/${id}`)
  await expect(page.getByTestId('group-share')).toBeVisible()

  const friend = await browser.newPage()
  await friend.goto(link.replace(/^https?:\/\/[^/]+/, ''))
  await expect(friend.getByTestId('joining-group')).toContainText(/E2E|group/i)
  await friend.close()
})

test('seeded customer sees appointments, reward history and can download their data', async ({ page }) => {
  // Seeded customers with visit history. Login codes are rate-limited per phone, so try a few.
  const candidates = ['9811100004', '9811100034', '9811100040', '9811100006', '9811100020', '9811100011', '9811100060']
  let phone = ''
  for (const p of candidates.sort(() => Math.random() - 0.5)) {
    await page.goto(`${base}/login?next=${encodeURIComponent(`${base}/me`)}`)
    await page.getByLabel(/mobile number/i).fill(p)
    await page.getByRole('button', { name: /send code/i }).click()
    const code = page.getByLabel(/enter the code/i)
    await expect(code.or(page.getByRole('alert').filter({ hasText: /.+/ }))).toBeVisible()
    if (await code.isVisible()) {
      phone = p
      break
    }
  }
  expect(phone, 'every candidate is rate-limited').not.toBe('')
  await page.getByLabel(/enter the code/i).fill(CODE)
  await page.getByRole('button', { name: /^continue$/i }).click()
  await page.waitForURL(/\/me/)
  // This customer's saved language may not be English, so check structure rather than words.
  await page.goto(`${base}/appointments`)
  await expect(page.getByTestId('past').getByTestId('appointment-row').first()).toBeVisible()
  await page.goto(`${base}/rewards`)
  await expect(page.getByTestId('reward-history')).toBeVisible()
  const res = await page.request.get(`${base}/me/data`)
  expect(res.status()).toBe(200)
  const data = await res.json()
  expect(data.customer.phone).toContain(phone)
  expect(Array.isArray(data.visits)).toBe(true)
})

test('switched-off features are not reachable on a starter salon', async ({ page }) => {
  for (const path of ['/contest', '/invite', '/gift/NOPE']) {
    const res = await page.goto(`/s/riddhi${path}`)
    expect(res?.status()).toBe(404)
  }
  await page.goto('/s/riddhi')
  await expect(page.locator('a[href="/s/riddhi/invite"]')).toHaveCount(0)
})

test('the in-chair install link opens the install hint', async ({ page }) => {
  await page.goto(`${base}/chair`)
  await page.locator(`a[href="${base}?install=1"]`).click()
  await expect(page.getByTestId('install-sheet')).toBeVisible()
})
