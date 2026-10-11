import { BASE, launch, metrics, shot } from './lib.mjs'

const salons = process.argv[2]?.split(',') ?? ['glamnails']
const vps = [
  { width: 390, height: 844 },
  { width: 360, height: 740 },
]
const paths = [
  '',
  '/designs',
  '/menu',
  '/care',
  '/contest',
  '/rewards',
  '/invite',
  '/try-on',
  '/chair',
  '/login',
  '/book',
  '/me',
  '/appointments',
  '?install=1',
]
for (const s of salons)
  for (const vp of vps) {
    const { browser, page, log } = await launch(vp)
    for (const p of paths) {
      const url = `${BASE}/s/${s}${p}`
      let st
      try {
        const r = await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
        st = r?.status()
      } catch (e) {
        console.log('ERR', url, e.message)
        continue
      }
      await page.waitForTimeout(500)
      const m = await metrics(page)
      const name = `crawl_${s}_${vp.width}_${(p || 'home').replace(/[^a-z0-9]/gi, '_')}`
      await shot(page, name)
      console.log(JSON.stringify({ name, st, final: page.url().replace(BASE, ''), ...m }))
    }
    console.log(log.join('\n'))
    await browser.close()
  }
