import { expect, test } from '@playwright/test'

const ADMIN = process.env.E2E_ADMIN_EMAIL ?? 'admin@platform.test'
const PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'admin-demo-123'
const SLUG = process.env.E2E_SALON ?? 'glamnails'

test('platform admin runs the sales demo time machine', async ({ page }) => {
  await page.goto('/studio/login?next=/console')
  await page.getByLabel('Email').fill(ADMIN)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page.getByRole('heading', { name: 'Salons' })).toBeVisible()
  await expect(page.getByText('Glam Nails Studio')).toBeVisible()

  await page.goto(`/console/demo/${SLUG}`)
  await page.getByPlaceholder('98250 12345').fill(`9${Math.floor(100000000 + Math.random() * 899999999)}`)
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText(/demo customer ready/i)).toBeVisible()

  for (const [button, expected] of [
    ['Complete visit', /visit completed/i],
    ['Send nail reveal', /reveal sent/i],
    ['Ask for rating', /rating request sent/i],
    ['Fast-forward 3 weeks', /three weeks later/i],
    ['Friend accepts invite', /both rewards issued/i],
    ['Low rating arrives', /owner alerted/i],
  ] as const) {
    await page.getByRole('button', { name: new RegExp(`^${button}`) }).click()
    await expect(page.getByText(expected).first()).toBeVisible({ timeout: 60_000 })
  }
  // The on-screen phone shows what was sent.
  await expect(page.getByText(/photos are ready/i).first()).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText(/rated their visit 2\/5/i).first()).toBeVisible()

  await page.getByRole('button', { name: /^Reset demo/ }).click()
  await expect(page.getByText(/demo customer reset/i)).toBeVisible()

  await page.goto(`/console/demo/${SLUG}/roi`)
  await expect(page.getByText(/one refill at/i)).toBeVisible()
})
