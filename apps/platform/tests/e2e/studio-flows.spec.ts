import { expect, type Page, test } from '@playwright/test'

const SLUG = process.env.E2E_SALON ?? 'glamnails'
const EMAIL = process.env.E2E_OWNER_EMAIL ?? 'owner@glamnails.test'
const PASSWORD = process.env.E2E_OWNER_PASSWORD ?? 'owner-demo-123'
const tag = () => Math.random().toString(36).slice(2, 7)
const newPhone = () => `7${Math.floor(100000000 + Math.random() * 899999999)}`

const login = async (page: Page) => {
  await page.goto(`/studio/login?next=/studio/${SLUG}/today`)
  await page.getByLabel('Email').fill(EMAIL)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page.getByRole('heading', { name: 'Schedule' })).toBeVisible()
}

test.beforeEach(async ({ page }) => login(page))

test('checkout finds customers by name, not everyone', async ({ page }) => {
  await page.goto(`/studio/${SLUG}/checkout`)
  await page.getByPlaceholder('Phone number or name').fill('PRIYA')
  const rows = page.getByRole('button').filter({ hasText: /\+91/ })
  await expect(rows.first()).toBeVisible()
  const texts = await rows.allInnerTexts()
  expect(texts.length).toBeGreaterThan(0)
  for (const t of texts) expect(t.toLowerCase()).toContain('priya')
})

test('mass sends ask for confirmation with count and cost', async ({ page }) => {
  await page.goto(`/studio/${SLUG}/customers?segment=due`)
  await page.getByRole('button', { name: /remind all \d+ on whatsapp/i }).click()
  const sheet = page.getByRole('dialog')
  await expect(sheet.getByText('Send refill reminders?')).toBeVisible()
  await expect(sheet.getByText(/estimated cost/i)).toBeVisible()
  await sheet.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByText('Send refill reminders?')).toBeHidden()

  await page.goto(`/studio/${SLUG}/campaigns/new`)
  await page.getByLabel('Offer headline').fill(`E2E offer ${tag()}`)
  await page.getByRole('button', { name: 'Launch & send' }).click()
  const launch = page.getByRole('dialog')
  await expect(launch.getByText('Launch this offer?')).toBeVisible()
  await expect(launch.getByText(/estimated cost/i)).toBeVisible()
  await launch.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByText('Launch this offer?')).toBeHidden()
})

test('walk-in checkout with artist, tip, split payment, first-visit gift and WhatsApp receipt', async ({ page }) => {
  await page.goto(`/studio/${SLUG}/checkout`)
  await page.getByPlaceholder('Phone number or name').fill(newPhone())
  await page.getByPlaceholder('Name (optional)').fill(`Walk In ${tag()}`)
  const artist = page.getByRole('radiogroup', { name: 'Artist' }).getByRole('radio').first()
  await artist.click()
  await expect(artist).toHaveAttribute('aria-checked', 'true')
  await page
    .getByRole('button', { name: /\+ Gel polish/ })
    .first()
    .click()
  // A brand-new customer gets the first-visit gift on this very bill.
  const gift = page.getByRole('switch', { name: /first-visit gift/i })
  const hasGift = (await gift.count()) > 0
  if (hasGift) await expect(gift).toHaveAttribute('aria-checked', 'true')
  await page.getByLabel('Tip for the artist (₹)').fill('100')
  await page.getByRole('button', { name: /split between two modes/i }).click()
  await page.getByLabel('Payment 1 amount (₹)').fill('200')
  await expect(page.getByLabel('Payment 2 amount (₹)')).not.toHaveValue('')
  await page.getByRole('button', { name: /complete/i }).click()
  await expect(page.getByText('Visit complete')).toBeVisible()
  if (hasGift) await expect(page.getByText(/applied/i)).toBeVisible()
  await page.getByRole('button', { name: /send receipt on whatsapp/i }).click()
  await expect(page.getByText(/receipt sent/i).first()).toBeVisible()
  await page.getByRole('button', { name: /new checkout/i }).click()
  await expect(page.getByPlaceholder('Phone number or name')).toHaveValue('')
})

test('today: confirm with undo, and decline with a reason', async ({ page }) => {
  await page.goto(`/studio/${SLUG}/today`)
  await page.waitForLoadState('networkidle')
  // Cards still waiting for a decision (just-confirmed ones stay listed, without a Confirm button).
  const open = page.locator('#requests [data-testid=appt-card]').filter({ has: page.getByRole('button', { name: 'Confirm' }) })
  test.skip((await open.count()) < 2, 'needs two booking requests in the seed')
  const id = await open.first().getAttribute('data-appt')
  const first = page.locator(`[data-appt="${id}"]`)
  await first.getByRole('button', { name: 'Confirm' }).click()
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByText('Not confirmed')).toBeVisible()
  await expect(first.getByRole('button', { name: 'Confirm' })).toBeVisible()

  await first.getByRole('button', { name: 'Confirm' }).click()
  await expect(first.getByText('Confirming…')).toBeVisible()
  await expect(first.getByRole('link', { name: 'Check out' })).toBeVisible({ timeout: 20_000 })

  const second = page
    .locator('#requests [data-testid=appt-card]')
    .filter({ has: page.getByRole('button', { name: 'Decline' }) })
    .first()
  await second.getByRole('button', { name: 'Decline' }).click()
  const sheet = page.getByRole('dialog')
  await sheet.getByRole('button', { name: 'Fully booked at that time' }).click()
  await sheet.getByRole('button', { name: 'Decline and tell them' }).click()
  await expect(page.getByText(/declined\. .* was told on whatsapp/i)).toBeVisible()
})

test('calendar shows appointments and opens one', async ({ page }) => {
  await page.goto(`/studio/${SLUG}/calendar`)
  await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible()
  const block = page.getByTestId('cal-block').first()
  test.skip((await block.count()) === 0, 'no appointments this week')
  await block.click()
  const panel = page.getByRole('dialog').first()
  await expect(panel.getByRole('button', { name: 'More actions' })).toBeVisible()
  await panel.getByRole('button', { name: 'Close' }).click()
  await page.getByRole('tab', { name: 'week' }).click()
  await expect(page.getByTestId('cal-block').first()).toBeVisible()
})

test('add an appointment from Studio, reschedule it, then cancel it', async ({ page }) => {
  const name = `E2E Cal ${tag()}`
  await page.goto(`/studio/${SLUG}/appointments/new`)
  await page.getByLabel('Find customer').fill(newPhone())
  await page.getByLabel('New customer name').fill(name)
  await page
    .getByRole('button', { name: /gel polish/i })
    .first()
    .click()
  // Tomorrow, first free time.
  await page.locator('section', { hasText: 'When' }).getByRole('button').nth(1).click()
  const slot = page
    .locator('section', { hasText: 'When' })
    .getByRole('button', { name: /\d:\d\d (am|pm)/i })
    .first()
  await slot.click()
  await page.getByRole('button', { name: /^book /i }).click()
  await expect(page).toHaveURL(/calendar\?date=/)
  const block = page.getByTestId('cal-block').filter({ hasText: name })
  await block.click()
  await page.getByRole('button', { name: 'More actions' }).click()
  await page.getByRole('button', { name: 'Reschedule' }).click()
  const move = page.getByRole('dialog', { name: 'Move to another time' })
  await move
    .getByRole('button', { name: /\d:\d\d (am|pm)/i })
    .last()
    .click()
  await move.getByRole('button', { name: /^move to /i }).click()
  await expect(page.getByText(/moved to .* customer told on whatsapp/i)).toBeVisible()

  await page.reload()
  await page.getByTestId('cal-block').filter({ hasText: name }).click()
  await page.getByRole('button', { name: 'More actions' }).click()
  await page.getByRole('button', { name: /cancel appointment/i }).click()
  await page.getByRole('button', { name: 'Cancel and tell them' }).click()
  await expect(page.getByText(/cancelled\. .* was told on whatsapp/i)).toBeVisible()
})

test('day-end summary shows cash to count', async ({ page }) => {
  await page.goto(`/studio/${SLUG}/today/close`)
  await expect(page.getByRole('heading', { name: 'Close the day' })).toBeVisible()
  await expect(page.getByTestId('cash-to-count')).toBeVisible()
  await expect(page.getByText('By payment mode')).toBeVisible()
  await expect(page.getByText('By artist')).toBeVisible()
})
