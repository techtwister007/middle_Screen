import { expect, test } from '@playwright/test'
import sharp from 'sharp'

// Mutating tests run on a different demo salon so the other specs keep their data.
const SLUG = process.env.E2E_SETTINGS_SALON ?? 'riddhi'
const EMAIL = `owner@${SLUG}.test`
const PASSWORD = process.env.E2E_OWNER_PASSWORD ?? 'owner-demo-123'
const tag = () => Math.random().toString(36).slice(2, 7)

test.beforeEach(async ({ page }) => {
  await page.goto(`/studio/login?next=/studio/${SLUG}/settings`)
  await page.getByLabel('Email').fill(EMAIL)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page.getByRole('heading', { name: 'More' })).toBeVisible()
})

test('owner edits the salon page and it shows in the customer app', async ({ page }) => {
  await page.getByRole('link', { name: /salon page & brand/i }).click()
  const tagline = `Nail studio ${tag()}`
  await page.getByLabel('Tagline').fill(tagline)
  await page.getByRole('button', { name: 'Save salon page' }).click()
  await expect(page.getByText('Salon page updated')).toBeVisible()
  await page.goto(`/s/${SLUG}`)
  await expect(page.getByText(tagline)).toBeVisible()
})

test('owner adds services one by one and by pasting a menu', async ({ page }) => {
  await page.goto(`/studio/${SLUG}/settings/menu`)
  const name = `Chrome dip ${tag()}`
  await page.getByText('+ Add a service').click()
  const add = page.locator('details', { hasText: '+ Add a service' })
  await add.getByLabel('Name').fill(name)
  await add.getByLabel('Price (₹)').fill('950')
  await add.getByLabel('Minutes').fill('50')
  await add.getByRole('button', { name: 'Add to menu' }).click()
  await expect(page.getByText('Service added to your menu')).toBeVisible()
  await expect(page.getByText(name)).toBeVisible()

  const t = tag()
  await page.getByText('Paste your whole menu').click()
  await page.getByLabel('Menu', { exact: true }).fill(`Ombre ${t}, 1400, 75\nPedicure spa ${t} - ₹900 - 1 hr`)
  await page.getByRole('button', { name: 'Add these services' }).click()
  await expect(page.getByText('2 services added')).toBeVisible()
  await page.reload()
  await expect(page.getByText(`Pedicure spa ${t}`)).toBeVisible()
})

test('owner uploads a design, adds an artist and sets time off', async ({ page }) => {
  await page.goto(`/studio/${SLUG}/settings/gallery`)
  const photo = await sharp({ create: { width: 600, height: 600, channels: 3, background: '#d88aa0' } })
    .jpeg()
    .toBuffer()
  const title = `Pearl drops ${tag()}`
  await page.getByText('+ Add a design').click()
  await page.getByLabel('Photos').setInputFiles({ name: 'nails.jpg', mimeType: 'image/jpeg', buffer: photo })
  await page.getByLabel('Design name').fill(title)
  await page.getByRole('button', { name: 'Publish design' }).click()
  await expect(page.getByText('Design is live in your gallery')).toBeVisible()
  await page.goto(`/s/${SLUG}/designs`)
  await expect(page.getByText(title).first()).toBeVisible()

  await page.goto(`/studio/${SLUG}/settings/team`)
  const email = `artist-${tag()}@${SLUG}.test`
  await page.getByLabel('Name').fill('Test Artist')
  await page.getByLabel('Email (for sign-in)').fill(email)
  await page.getByRole('button', { name: 'Add to team' }).click()
  await expect(page.getByText(new RegExp(`${email} / `))).toBeVisible()

  await page.getByText('Test Artist').first().locator('xpath=ancestor::div[2]').getByRole('link', { name: 'Hours & time off' }).click()
  await expect(page.getByRole('heading', { name: /Test's hours/ })).toBeVisible()
  const d = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10)
  await page.getByLabel('Add time off from').fill(d)
  await page.getByLabel('Reason (optional)').fill('Holiday')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText(/time off saved/i)).toBeVisible()
})

test('rules, billing, QR posters and stats pages work', async ({ page }) => {
  await page.goto(`/studio/${SLUG}/settings/rules`)
  await page.getByLabel('Deposit (%)').fill('25')
  await page.getByRole('button', { name: 'Save rules' }).click()
  await expect(page.getByText(/rules saved/i)).toBeVisible()
  await page.getByLabel('Max offers per customer per week').fill('9')
  await page.getByRole('button', { name: 'Save rules' }).click()
  await expect(page.getByText(/at most 3 offers a week/i)).toBeVisible()

  for (const path of ['settings/billing', 'settings/qr', 'settings/qr/print', 'me']) {
    const res = await page.goto(`/studio/${SLUG}/${path}`)
    expect(res?.status(), path).toBe(200)
  }
  await page.goto(`/studio/${SLUG}/settings/billing`)
  await expect(page.getByText(/this month's usage/i)).toBeVisible()
})
