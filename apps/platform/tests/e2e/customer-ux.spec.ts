import { expect, type Page, test } from '@playwright/test'

/**
 * Phone ergonomics of the customer app: 404s on a phone, the back button inside booking,
 * cancelling with a deposit, the logged-out language switch and gallery filters that survive "back".
 * Requires the demo seed (pnpm seed) and OTP_FIXED_CODE in a non-production environment.
 */
const SLUG = process.env.E2E_SALON ?? 'glamnails'
const CODE = process.env.OTP_FIXED_CODE ?? '123456'
const phone = () => `9${Math.floor(100000000 + Math.random() * 899999999)}`
const base = `/s/${SLUG}`

test.use({ viewport: { width: 360, height: 740 } })

const login = async (page: Page, next = base) => {
  await page.goto(`${base}/login?next=${encodeURIComponent(next)}`)
  await page.getByLabel(/mobile number/i).fill(phone())
  await page.getByRole('button', { name: /send code/i }).click()
  await page.getByLabel(/enter the code/i).fill(CODE)
  await page.getByLabel(/your name/i).fill('E2E UX')
  await page.getByRole('button', { name: /^continue$/i }).click()
  await page.waitForURL((url) => !url.pathname.endsWith('/login'))
}

test('an unknown salon is a proper mobile 404', async ({ page }) => {
  const res = await page.goto('/s/doesnotexist-e2e')
  expect(res?.status()).toBe(404)
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute('content', /width=device-width/)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360)
})

test("the phone's back button walks back through the booking steps", async ({ page }) => {
  await page.goto(`${base}/book`)
  await expect(page.getByRole('heading', { name: 'What would you like?' })).toBeVisible()
  // Nothing picked yet: the bar asks for a service instead of offering "Continue · ₹0".
  await expect(page.getByTestId('services-bar')).toContainText('Pick a service')
  await page.locator('[data-step=services] button[aria-pressed]').first().click()
  await page
    .getByTestId('services-bar')
    .getByRole('button', { name: /continue/i })
    .click()
  await expect(page).toHaveURL(/step=(artist|time)/)
  await expect(page.getByRole('heading', { name: /choose your artist|pick a time/i })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'What would you like?' })).toBeVisible()
  // The picked service is still selected.
  await expect(page.locator('[data-step=services] button[aria-pressed="true"]')).toHaveCount(1)
})

test('a cancelled appointment says what happens to the deposit and offers Book again', async ({ page }) => {
  await login(page)
  await page.goto(`${base}/designs`)
  await page.locator(`a[href*="${base}/designs/"]`).filter({ hasText: /from ₹/ }).first().click()
  await page
    .getByTestId('design-book-bar')
    .getByRole('link', { name: /book this look/i })
    .click()
  await expect(page).toHaveURL(/\/book/)
  const anyone = page.getByRole('button', { name: /anyone available/i })
  if (await anyone.isVisible().catch(() => false)) await anyone.click()
  const days = page.getByTestId('day')
  let picked = false
  for (let i = 1; i < 12 && !picked; i++) {
    await days.nth(i).click()
    const slot = page.getByTestId('slot').first()
    await expect(slot.or(page.getByTestId('fully-booked'))).toBeVisible({ timeout: 60_000 })
    if (await slot.isVisible()) {
      await slot.click()
      picked = true
    }
  }
  expect(picked).toBe(true)
  await page.getByRole('button', { name: /review booking/i }).click()
  await page.getByRole('button', { name: /confirm booking|deposit/i }).click()
  await page.waitForURL(/\/(pay\/test|book)/)
  let id: string
  if (page.url().includes('/pay/test/')) {
    await page.getByRole('button', { name: /pay with upi/i }).click()
    await page.waitForURL(/\/appointments\/[^/?]+/)
    id = page.url().match(/\/appointments\/([^/?]+)/)![1]
  } else {
    const ics = page.locator('a[href*="/ics"]').first()
    await expect(ics).toBeVisible()
    id = (await ics.getAttribute('href'))!.match(/\/appointments\/([^/]+)\/ics/)![1]
  }
  await page.goto(`${base}/appointments/${id}`)
  const hasDeposit = (await page.getByTestId('deposit-line').count()) > 0
  await page
    .getByTestId('appt-actions')
    .getByRole('button', { name: /^cancel$/i })
    .click()
  if (hasDeposit) await expect(page.getByTestId('cancel-deposit')).toContainText(/refund/i)
  await expect(page.getByRole('button', { name: /keep my appointment/i })).toBeVisible()
  await page.getByRole('button', { name: /yes, cancel/i }).click()
  await expect(page.getByText('Cancelled', { exact: true })).toBeVisible()
  await expect(page.getByTestId('moved')).toHaveCount(0)
  if (hasDeposit) await expect(page.getByTestId('deposit-line')).toContainText(/refund/i)
  const again = page.getByTestId('book-again')
  await expect(again).toBeVisible()
  await again.click()
  await expect(page).toHaveURL(/\/book\?services=/)
})

test('a logged-out visitor can switch language from the header', async ({ page }) => {
  await page.goto(base)
  const sw = page.getByTestId('header-language')
  await sw.getByRole('button', { name: 'Language' }).click()
  await sw.getByRole('button', { name: 'ગુજરાતી' }).click()
  await expect(page.getByRole('navigation').getByText('ડિઝાઇન')).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'gu')
  await sw.getByRole('button', { name: 'ભાષા' }).click()
  await sw.getByRole('button', { name: 'English' }).click()
  await expect(page.getByRole('navigation').getByText('Designs')).toBeVisible()
})

test('a gallery filter is still applied after opening a design and going back', async ({ page }) => {
  await page.goto(`${base}/designs`)
  const styles = page.getByRole('group', { name: 'Filter by style' })
  const occasions = page.getByRole('group', { name: 'Filter by occasion' })
  const group = (await styles.count()) ? styles : occasions
  const chip = group.getByRole('button').nth(1)
  const name = (await chip.textContent())?.trim() ?? ''
  await chip.click()
  await expect(chip).toHaveAttribute('aria-pressed', 'true')
  await expect(page).toHaveURL(/[?&](style|occasion)=/)
  await page.locator(`a[href*="${base}/designs/"]`).first().click()
  await page.waitForURL(/\/designs\/[^/?]+$/)
  await page.goBack()
  await expect(page).toHaveURL(/[?&](style|occasion)=/)
  await expect(group.getByRole('button', { name, exact: true })).toHaveAttribute('aria-pressed', 'true')
})
