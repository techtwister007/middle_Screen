import fs from 'fs'
import { BASE, launch, rnd, shot } from './lib.mjs'

const salon = process.argv[2] || 'glamnails'
const { browser, page, ctx, log } = await launch()
const phone = rnd()
await page.goto(`${BASE}/s/${salon}/login`, { waitUntil: 'networkidle' })
await page.locator('#phone').fill(phone)
await page.getByRole('button', { name: /send code/i }).click()
await page.locator('#code').waitFor({ timeout: 30000 })
await page.locator('#code').fill('123456')
await page.locator('#name').fill('Priya')
await page.getByRole('button', { name: /^continue/i }).click()
await page.waitForTimeout(5000)
await shot(page, `login_${salon}_result`, false)
console.log(phone, page.url(), await page.locator('.text-red-700').allInnerTexts())
fs.writeFileSync(`state_${salon}.json`, JSON.stringify(await ctx.storageState()))
console.log(log.join('\n'))
await browser.close()
