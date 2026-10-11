import { expect, test } from '@playwright/test'
import sharp from 'sharp'

// Gallery management on a demo salon that the other specs don't edit.
const SLUG = process.env.E2E_GALLERY_SALON ?? 'aura'
const tag = () => Math.random().toString(36).slice(2, 7)

test.beforeEach(async ({ page }) => {
  await page.goto(`/studio/login?next=/studio/${SLUG}/settings/gallery`)
  await page.getByLabel('Email').fill(`owner@${SLUG}.test`)
  await page.getByLabel('Password').fill(process.env.E2E_OWNER_PASSWORD ?? 'owner-demo-123')
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page.getByRole('heading', { name: 'Gallery' })).toBeVisible()
})

test('owner adds a style, edits a design into it and customers can filter by it', async ({ page }) => {
  const style = `Marble ${tag()}`
  await page.getByRole('link', { name: 'Styles' }).click()
  await page.getByLabel('New style').fill(style)
  await page.getByRole('button', { name: 'Add style' }).click()
  await expect(page.getByLabel(`Name of style ${style}`)).toBeVisible()

  await page.getByRole('link', { name: 'Live' }).click()
  await page.getByTestId('design-card').first().getByRole('link', { name: 'Edit', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Photos' })).toBeVisible()
  const title = `Marble Dream ${tag()}`
  await page.getByLabel('Name', { exact: true }).fill(title)
  await page.getByText(style, { exact: true }).click()
  await page.getByLabel('"From" price (₹)').fill('1499')
  await page.getByRole('button', { name: 'Save design' }).click()
  await expect(page.getByText('Design saved')).toBeVisible()

  await page.goto(`/s/${SLUG}/designs`)
  await page.getByRole('group', { name: /style/i }).getByRole('button', { name: style }).click()
  await expect(page.getByText(title)).toBeVisible()
  await expect(page.getByText('₹1,499').first()).toBeVisible()
})

test('owner copies a look from the design library and can delete it again', async ({ page }) => {
  await page.getByRole('link', { name: 'Design library' }).click()
  await expect(page).toHaveURL(/show=library/)
  // Wait for hydration: a click before React attaches handlers is lost in dev mode.
  await page.waitForLoadState('networkidle')
  const card = page
    .getByTestId('library-card')
    .filter({ has: page.getByRole('button', { name: '+ Add to my gallery' }) })
    .first()
  const title = (await card.locator('p').first().textContent())?.trim() ?? ''
  await card.getByRole('button', { name: '+ Add to my gallery' }).click()
  await expect(page.getByTestId('library-card').filter({ hasText: title }).getByText('✓ In your gallery')).toBeVisible()

  await page.goto(`/s/${SLUG}/designs`)
  await expect(page.getByText(title).first()).toBeVisible()

  await page.goto(`/studio/${SLUG}/settings/gallery`)
  await page.getByTestId('design-card').filter({ hasText: title }).getByRole('link', { name: 'Edit', exact: true }).click()
  page.once('dialog', (d) => d.accept())
  await page.getByRole('button', { name: 'Delete this design' }).click()
  await expect(page).toHaveURL(new RegExp(`/studio/${SLUG}/settings/gallery$`))
  await expect(page.getByTestId('design-card').filter({ hasText: title })).toHaveCount(0)
})

test('platform admin adds a look to the library', async ({ page, context }) => {
  await context.clearCookies()
  await page.goto('/studio/login?next=/console/library')
  await page.getByLabel('Email').fill('admin@platform.test')
  await page.getByLabel('Password').fill(process.env.E2E_ADMIN_PASSWORD ?? 'admin-demo-123')
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page.getByRole('heading', { name: 'Design library' })).toBeVisible()
  const title = `Ombre Sunset ${tag()}`
  const photo = await sharp({ create: { width: 500, height: 500, channels: 3, background: '#f08a5d' } })
    .jpeg()
    .toBuffer()
  await page.getByText('+ Add a look').click()
  const form = page.locator('details', { hasText: '+ Add a look' })
  await form.getByLabel('Name').fill(title)
  await form.getByLabel('Styles').fill('Ombré')
  await form.getByLabel('Photo credit').fill('Own photo')
  await form.getByLabel('Photos').setInputFiles({ name: 'look.jpg', mimeType: 'image/jpeg', buffer: photo })
  await form.getByRole('button', { name: 'Add to library' }).click()
  await expect(page.getByText('Added to the library')).toBeVisible()
  await page.reload()
  await expect(page.getByTestId('library-look').filter({ hasText: title })).toBeVisible()
})
