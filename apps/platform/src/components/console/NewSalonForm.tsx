'use client'
import { formatINR, rupees } from '@salon/core'
import { Button, buttonClass, Input, Label, Textarea } from '@salon/ui'
import Link from 'next/link'
import { type FormEvent, useMemo, useState, useTransition } from 'react'
import { createSalonFromForm } from '@/app/(site)/console/actions'
import { parseMenuText } from '@/lib/menuText'

const DAYS: [string, string][] = [
  ['mon', 'Mon'],
  ['tue', 'Tue'],
  ['wed', 'Wed'],
  ['thu', 'Thu'],
  ['fri', 'Fri'],
  ['sat', 'Sat'],
  ['sun', 'Sun'],
]
const select = 'h-12 w-full rounded-btn border border-line bg-surface px-3'

export const NewSalonForm = ({ defaultDemo }: { defaultDemo: boolean }) => {
  const [demo, setDemo] = useState(defaultDemo)
  const [menu, setMenu] = useState('')
  const [pending, start] = useTransition()
  const [result, setResult] = useState<Awaited<ReturnType<typeof createSalonFromForm>> | null>(null)
  const preview = useMemo(() => parseMenuText(menu), [menu])

  // Submitting manually (not via form action) keeps every typed value and chosen file if something fails.
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    if (demo) data.set('demo', 'on')
    else data.delete('demo')
    setResult(null)
    start(async () => setResult(await createSalonFromForm(data)))
  }

  if (result?.ok && result.data) {
    const slug = result.data.slug
    return (
      <div className='rounded-card bg-emerald-500/10 p-6' role='status'>
        <p className='font-heading text-2xl'>{result.data.demo ? 'Demo ready 🎉' : 'Salon is live 🎉'}</p>
        <p className='mt-1 text-sm text-muted'>
          {result.data.demo
            ? 'Sample customers and 90 days of history are in place. The demo pauses itself in 7 days.'
            : 'Nothing was invented: add photos, check prices and share the owner login. The go-live checklist is on the salon page.'}
        </p>
        <div className='mt-4 flex flex-wrap gap-3'>
          {result.data.demo ? (
            <Link className={buttonClass('primary')} href={`/console/demo/${slug}`}>
              Open presenter
            </Link>
          ) : (
            <Link className={buttonClass('primary')} href={`/console/salons/${slug}`}>
              Salon page & checklist
            </Link>
          )}
          <Link className={buttonClass('secondary')} href={`/s/${slug}`} target='_blank'>
            Customer app ↗
          </Link>
          <Link className={buttonClass('secondary')} href={`/console/salons/${slug}/open`}>
            Studio
          </Link>
          <button className={buttonClass('ghost')} onClick={() => setResult(null)} type='button'>
            Create another
          </button>
        </div>
      </div>
    )
  }

  return (
    <form className='grid gap-6 md:grid-cols-2' onSubmit={onSubmit}>
      <div className='md:col-span-2'>
        <div className='inline-flex rounded-full border border-line bg-surface p-1' role='radiogroup' aria-label='What are you creating?'>
          {[
            [true, 'Sales demo'],
            [false, 'Real salon'],
          ].map(([v, label]) => (
            <button
              aria-checked={demo === v}
              className={`min-h-11 rounded-full px-5 text-sm ${demo === v ? 'bg-brand text-on-brand' : ''}`}
              key={String(v)}
              onClick={() => setDemo(v as boolean)}
              role='radio'
              type='button'
            >
              {label as string}
            </button>
          ))}
        </div>
        <p className='mt-2 text-sm text-muted'>
          {demo
            ? 'A private copy for a sales meeting: their name, menu and photos, plus clearly-labelled sample customers. Pauses itself after 7 days.'
            : 'A paying salon: only what you enter here. No sample customers, offers or invented details.'}
        </p>
      </div>

      <div className='space-y-4'>
        <div>
          <Label htmlFor='name'>Salon name</Label>
          <Input id='name' name='name' placeholder='Glam Nails Studio' required />
        </div>
        <div>
          <Label htmlFor='slug'>Link (optional)</Label>
          <Input id='slug' name='slug' placeholder='glamnails → glamnails.yourdomain.in' />
        </div>
        <div className='grid grid-cols-2 gap-3'>
          <div>
            <Label htmlFor='instagram'>Instagram</Label>
            <Input id='instagram' name='instagram' placeholder='@handle' />
          </div>
          <div>
            <Label htmlFor='phone'>Salon WhatsApp</Label>
            <Input id='phone' inputMode='tel' name='phone' placeholder='98250 12345' />
          </div>
          <div>
            <Label htmlFor='area'>Area</Label>
            <Input id='area' name='area' placeholder='Alkapuri' />
          </div>
          <div>
            <Label htmlFor='city'>City</Label>
            <Input defaultValue='Vadodara' id='city' name='city' />
          </div>
        </div>
        {!demo ? (
          <div>
            <Label htmlFor='address'>Address</Label>
            <Textarea id='address' name='address' rows={2} />
          </div>
        ) : null}
        <div>
          <Label htmlFor='tagline'>Tagline</Label>
          <Input id='tagline' name='tagline' placeholder='Nail art that gets you noticed' />
        </div>
        <div>
          <Label htmlFor='artists'>Artists (comma separated)</Label>
          <Input id='artists' name='artists' placeholder='Riya Shah, Meera Patel' />
        </div>
        <div>
          <Label htmlFor='menu'>Menu {demo ? '(their price list)' : ''}</Label>
          <Textarea
            id='menu'
            name='menu'
            onChange={(e) => setMenu(e.target.value)}
            placeholder={'Gel polish, 800, 45\nAcrylic extensions - ₹1800 - 2 hr\nNail art per nail, 100, 10'}
            rows={5}
            value={menu}
          />
          {menu.trim() ? (
            <div className='mt-2 rounded-card border border-line bg-surface p-3 text-sm' data-testid='menu-preview'>
              <p className='mb-1 font-medium'>{preview.parsed.length} services will be added</p>
              <ul className='max-h-40 space-y-0.5 overflow-auto text-muted'>
                {preview.parsed.map((m) => (
                  <li key={m.name}>
                    {m.name} · {formatINR(rupees(m.price))} · {m.minutes} min {m.category === 'add-on' ? '· add-on' : ''}
                  </li>
                ))}
              </ul>
              {preview.skipped.length ? <p className='mt-2 text-red-700'>Couldn't read: {preview.skipped.join(' | ')}</p> : null}
            </div>
          ) : (
            <p className='mt-1 text-xs text-muted'>Empty uses a standard nail menu you can edit later.</p>
          )}
        </div>
      </div>

      <div className='space-y-4'>
        <div className='grid grid-cols-3 gap-3'>
          <div>
            <Label htmlFor='theme'>Theme</Label>
            <select className={select} id='theme' name='theme'>
              <option value='default'>Blush</option>
              <option value='luxe'>Noir & Gold</option>
              <option value='minimal'>Studio White</option>
            </select>
          </div>
          <div>
            <Label htmlFor='plan'>Plan</Label>
            <select className={select} defaultValue='studio' id='plan' name='plan'>
              <option value='starter'>Starter</option>
              <option value='studio'>Studio</option>
              <option value='growth'>Growth</option>
            </select>
          </div>
          <div>
            <Label htmlFor='primary'>Brand colour</Label>
            <Input className='h-12 p-1' defaultValue='#B4537A' id='primary' name='primary' type='color' />
          </div>
        </div>
        <div>
          <Label htmlFor='logo'>Logo</Label>
          <Input accept='image/*' className='h-auto py-3' id='logo' name='logo' type='file' />
        </div>
        <div>
          <Label htmlFor='photos'>Their work photos (up to 24)</Label>
          <Input accept='image/*' className='h-auto py-3' id='photos' multiple name='photos' type='file' />
          <p className='mt-1 text-xs text-muted'>
            {demo ? 'Without photos the demo uses licensed sample photos.' : 'Only photos of their own work. You can also start from the design library below.'}
          </p>
        </div>
        {!demo ? (
          <>
            <label className='flex min-h-11 items-center gap-3 text-sm'>
              <input className='h-5 w-5' name='libraryLooks' type='checkbox' /> Start the gallery with 8 looks from the design library
            </label>
            <fieldset className='rounded-card border border-line bg-surface p-3'>
              <legend className='px-1 text-sm font-medium'>Opening hours</legend>
              {DAYS.map(([d, label]) => (
                <div className='grid grid-cols-[2.5rem_1fr_1fr_auto] items-center gap-2 py-1 text-sm' key={d}>
                  <span>{label}</span>
                  <input aria-label={`${label} opens`} className='h-10 min-w-0 rounded-btn border border-line px-2' defaultValue='10:30' name={`open_${d}`} type='time' />
                  <input aria-label={`${label} closes`} className='h-10 min-w-0 rounded-btn border border-line px-2' defaultValue='20:00' name={`close_${d}`} type='time' />
                  <label className='flex min-h-10 items-center gap-1 text-xs text-muted'>
                    <input name={`closed_${d}`} type='checkbox' /> Shut
                  </label>
                </div>
              ))}
            </fieldset>
          </>
        ) : null}
        <div className='grid grid-cols-2 gap-3'>
          <div>
            <Label htmlFor='ownerName'>Owner name</Label>
            <Input id='ownerName' name='ownerName' />
          </div>
          <div>
            <Label htmlFor='ownerEmail'>Owner login email {demo ? '(optional)' : ''}</Label>
            <Input id='ownerEmail' name='ownerEmail' required={!demo} type='email' />
          </div>
        </div>
        <div>
          <Label htmlFor='ownerPassword'>Temporary password</Label>
          <Input id='ownerPassword' minLength={8} name='ownerPassword' required type='text' />
        </div>
        <Button className='w-full' disabled={pending} size='lg' type='submit'>
          {pending ? (demo ? 'Building the demo… (about a minute)' : 'Creating the salon…') : demo ? 'Build demo' : 'Create salon'}
        </Button>
        {pending ? <p className='text-center text-xs text-muted'>Keep this tab open. Everything is undone if a step fails.</p> : null}
        {result && !result.ok ? (
          <p className='rounded-card bg-red-500/10 p-3 text-sm text-red-800' role='alert'>
            {result.error}
          </p>
        ) : null}
      </div>
    </form>
  )
}
