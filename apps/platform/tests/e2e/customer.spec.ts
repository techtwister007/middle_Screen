import { expect, test } from '@playwright/test'

/**
 * The money path: a new customer browses, logs in with a phone code and books.
 * Requires the demo seed (pnpm seed) and OTP_FIXED_CODE in a non-production environment.
 */
const SLUG = process.env.E2E_SALON ?? 'glamnails'
const CODE = process.env.OTP_FIXED_CODE ?? '123456'
const phone = () => `9${Math.floor(100000000 + Math.random() * 899999999)}`

test('browse a design, log in with a phone code and book it', async ({ page }) => {
  await page.goto(`/s/${SLUG}/designs`)
  await page
    .locator('a[href*="/designs/"]')
    .filter({ hasText: /from ₹/ })
    .first()
    .click()
  await expect(page.getByText('Total', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: /book this look/i }).click()

  await expect(page).toHaveURL(/\/book/)
  const anyone = page.getByRole('button', { name: /anyone available/i })
  if (await anyone.isVisible().catch(() => false)) await anyone.click()

  // Pick the first day (from tomorrow) that has a free slot.
  const days = page.getByTestId('day')
  let picked = false
  for (let i = 1; i < 10 && !picked; i++) {
    await days.nth(i).click()
    const slot = page.getByTestId('slot').first()
    await expect(slot.or(page.getByText('Fully booked on this day'))).toBeVisible({ timeout: 60_000 })
    if (await slot.isVisible()) {
      await slot.click()
      picked = true
    }
  }
  expect(picked).toBe(true)

  await page.getByRole('button', { name: /review booking/i }).click()
  await page.getByLabel(/mobile number/i).fill(phone())
  await page.getByRole('button', { name: /send code/i }).click()
  await page.getByLabel(/enter the code/i).fill(CODE)
  await page.getByLabel(/your name/i).fill('E2E Tester')
  await page.getByRole('button', { name: /^continue$/i }).click()

  const confirm = page.getByRole('button', { name: /confirm booking|deposit/i })
  await expect(confirm).toBeVisible()
  await confirm.click()

  await page.waitForURL(/\/pay\/test\/|step=done/)
  if (page.url().includes('/pay/test/')) {
    await page.getByRole('button', { name: /pay with upi/i }).click()
    await expect(page.getByText(/deposit received/i)).toBeVisible()
  } else {
    await expect(page.getByText(/booked|request sent/i).first()).toBeVisible()
  }
})

test('the home page renders in every theme', async ({ page }) => {
  for (const slug of ['glamnails', 'aura', 'riddhi']) {
    const res = await page.goto(`/s/${slug}`)
    expect(res?.status()).toBe(200)
    await expect(page.getByRole('link', { name: /book/i }).first()).toBeVisible()
  }
})
