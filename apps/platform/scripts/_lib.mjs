import { chromium } from '@playwright/test'
export const S = process.env.S, BASE='http://localhost:3000'
export async function open(email='owner@glamnails.test', vp='phone') {
  const vps = { phone:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}, tablet:{viewport:{width:820,height:1180},isMobile:true,hasTouch:true}, laptop:{viewport:{width:1366,height:768}} }
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
  const ctx = await browser.newContext(vps[vp])
  const r = await ctx.request.post(BASE+'/api/users/login',{data:{email,password:'owner-demo-123'}}); console.log('login',email,r.status())
  const page = await ctx.newPage()
  const errs=[]; page.on('console',m=>{ if(m.type()==='error') errs.push('CONSOLE '+m.text().slice(0,200))}); page.on('response',r=>{ if(r.status()>=400) errs.push(r.status()+' '+r.url())}); page.on('pageerror',e=>errs.push('PAGEERR '+e.message.slice(0,200)))
  page.on('dialog', d => { console.log('DIALOG', d.type(), d.message()); d.accept() })
  let n=0
  const shot = async (name, full=false) => { await page.waitForTimeout(400); await page.screenshot({path:`${S}/${name}.png`, fullPage:full}); console.log('SHOT', name, page.url().replace(BASE,''), errs.length? JSON.stringify(errs.splice(0)):'') }
  const go = (p) => page.goto(BASE+p,{waitUntil:'networkidle',timeout:60000})
  return { browser, ctx, page, shot, go, errs }
}
