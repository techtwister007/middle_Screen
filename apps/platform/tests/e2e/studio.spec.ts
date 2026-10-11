import { expect, test } from '@playwright/test'
import sharp from 'sharp'

const SLUG = process.env.E2E_SALON ?? 'glamnails'
const EMAIL = process.env.E2E_OWNER_EMAIL ?? 'owner@glamnails.test'
const PASSWORD = process.env.E2E_OWNER_PASSWORD ?? 'owner-demo-123'

test.beforeEach(async ({ page }) => {
  await page.goto(`/studio/login?next=/studio/${SLUG}/today`)
  await page.getByLabel('Email').fill(EMAIL)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page).toHaveURL(new RegExp(`/studio/${SLUG}/today`))
  await expect(page.getByRole('heading', { name: 'Schedule' })).toBeVisible()
  await page.waitForLoadState('networkidle')
})

test('owner sees the action feed and schedule', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /good (morning|afternoon|evening)/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Schedule' })).toBeVisible()
  await expect(page.getByText(/to do today/i)).toBeVisible()
})

test('walk-in checkout, pre-book and photo corner', async ({ page }) => {
  await page.goto(`/studio/${SLUG}/checkout`)
  const phone = `8${Math.floor(100000000 + Math.random() * 899999999)}`
  await page.getByPlaceholder('Phone number or name').fill(phone)
  await page.getByPlaceholder('Name (optional)').fill('Walk In')
  await page.getByRole('radiogroup', { name: 'Artist' }).getByRole('radio').first().click()
  await page
    .getByRole('button', { name: /\+ Gel polish/ })
    .first()
    .click()
  await page.getByRole('button', { name: 'Cash' }).click()
  await page.getByRole('button', { name: /complete/i }).click()
  await expect(page.getByText('Visit complete')).toBeVisible()

  // Pre-book: pick the first slot offered, confirm, and let the undo window pass.
  const slot = page.locator('button[data-slot]').first()
  await expect(slot).toBeVisible()
  await slot.click()
  await page.getByRole('button', { name: 'Book it' }).click()
  await expect(page.getByRole('button', { name: /undo/i })).toBeVisible()
  await expect(page.getByText(/booked for/i)).toBeVisible({ timeout: 20_000 })

  // Photo corner
  await page.getByRole('link', { name: /photo corner/i }).click()
  const image = await sharp({ create: { width: 800, height: 1000, channels: 3, background: '#c77d9e' } })
    .jpeg()
    .toBuffer()
  await page.locator('input[type=file]').setInputFiles({ name: 'nails.jpg', mimeType: 'image/jpeg', buffer: image })
  await expect(page.locator('img[src*="/api/media/file/"]').first()).toBeVisible()
  await page.getByLabel('Design name').fill('E2E Chrome')
  await page.getByRole('button', { name: /send to/i }).click()
  await expect(page.getByText(/sent to/i)).toBeVisible({ timeout: 60_000 })
})

test('owner pages load', async ({ page }) => {
  for (const path of ['customers', 'customers?segment=due', 'campaigns', 'campaigns/new?kind=slot-filler', 'insights', 'photos', 'settings']) {
    const res = await page.goto(`/studio/${SLUG}/${path}`)
    expect(res?.status(), path).toBe(200)
  }
})
