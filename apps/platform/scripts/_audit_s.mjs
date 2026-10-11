import { open } from './_lib.mjs'
const { browser, page, go, errs, shot } = await open()
for (const p of ['settings/gallery','display','insights','customers/7']) { const r = await go('/studio/glamnails/'+p); console.log(p, r.status()) }
await go('/studio/glamnails/settings/team')
const card = page.locator('main p.font-medium', {hasText:'Audit Artist'}).locator('xpath=../..')
await card.locator('button:has-text("Bookable")').click(); await page.waitForTimeout(4000)
console.log('bookable alerts', await page.locator('[role=alert]').allInnerTexts(), await card.locator('button').allInnerTexts())
await browser.close()
