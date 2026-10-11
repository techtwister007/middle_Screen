import { formatINR, forTenant, type ID } from '@salon/core'
import { formatDuration, SERVICE_CATEGORIES } from '@salon/modules'
import Link from 'next/link'
import { ActionForm } from '@/components/studio/ActionForm'
import { Field, inputClass } from '@/components/studio/Field'
import { FlagButton } from '@/components/studio/FlagButton'
import { getPayloadClient } from '@/lib/payload'
import { requireStaff } from '@/lib/staff'
import { archiveService, importMenu, saveService } from '../actions'

export const metadata = { title: 'Menu & prices' }

interface Service {
  id: ID
  name: string
  category: string
  description?: string | null
  price: number
  durationMinutes: number
  isAddOn?: boolean | null
  cycleDays?: number | null
  aftercare?: string | null
  active?: boolean | null
}

const ServiceFields = ({ s }: { s?: Service }) => (
  <>
    {s ? <input name='id' type='hidden' value={String(s.id)} /> : null}
    <Field label='Name'>
      <input className={inputClass} defaultValue={s?.name} name='name' placeholder='Gel polish' required />
    </Field>
    <div className='grid grid-cols-3 gap-3'>
      <Field label='Price (₹)'>
        <input className={inputClass} defaultValue={s ? s.price / 100 : ''} inputMode='numeric' min={0} name='price' required type='number' />
      </Field>
      <Field label='Minutes'>
        <input className={inputClass} defaultValue={s?.durationMinutes ?? 60} min={5} name='durationMinutes' required step={5} type='number' />
      </Field>
      <Field hint='Refill reminder' label='Cycle (days)'>
        <input className={inputClass} defaultValue={s?.cycleDays ?? ''} min={0} name='cycleDays' type='number' />
      </Field>
    </div>
    <Field label='Category'>
      <select className={inputClass} defaultValue={s?.category ?? 'gel'} name='category'>
        {SERVICE_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c.replace('-', ' ')}
          </option>
        ))}
      </select>
    </Field>
    <Field label='Description'>
      <textarea className={`${inputClass} h-16 py-2`} defaultValue={s?.description ?? ''} name='description' />
    </Field>
    <Field hint='Sent with the aftercare message' label='Aftercare tips'>
      <textarea className={`${inputClass} h-16 py-2`} defaultValue={s?.aftercare ?? ''} name='aftercare' />
    </Field>
    <div className='flex gap-5 text-sm'>
      <label className='flex items-center gap-2'>
        <input defaultChecked={Boolean(s?.isAddOn)} name='isAddOn' type='checkbox' /> Add-on (only with another service)
      </label>
      {s ? (
        <label className='flex items-center gap-2'>
          <input defaultChecked={s.active !== false} name='active' type='checkbox' /> On the menu
        </label>
      ) : null}
    </div>
  </>
)

export default async function MenuPage({ params }: { params: Promise<{ salon: string }> }) {
  const { salon: slug } = await params
  const { salon } = await requireStaff(slug, { manager: true })
  const payload = await getPayloadClient()
  const services = (await forTenant(payload, salon.id).find<Service>('services', { sort: 'order', limit: 300, depth: 0 })).docs
  const groups = new Map<string, Service[]>()
  for (const s of services) groups.set(s.category, [...(groups.get(s.category) ?? []), s])
  return (
    <div>
      <Link className='text-sm text-brand' href={`/studio/${slug}/settings`}>
        ← More
      </Link>
      <h1 className='mt-3 font-heading text-3xl'>Menu & prices</h1>
      <p className='mt-1 text-sm text-muted'>
        {services.filter((s) => s.active !== false).length} services on the menu. Tap one to edit. Price changes apply to new bookings.
      </p>

      <div className='mt-6 grid gap-3 sm:grid-cols-2'>
        <details className='rounded-card border border-dashed border-brand bg-surface p-4'>
          <summary className='cursor-pointer font-medium text-brand'>+ Add a service</summary>
          <ActionForm action={saveService.bind(null, slug)} className='mt-4' resetOnSuccess submit='Add to menu'>
            <ServiceFields />
          </ActionForm>
        </details>
        <details className='rounded-card border border-dashed border-line bg-surface p-4'>
          <summary className='cursor-pointer font-medium'>Paste your whole menu</summary>
          <ActionForm action={importMenu.bind(null, slug)} className='mt-4' submit='Add these services'>
            <Field hint='One per line: name, price, minutes. E.g. "Gel polish, 800, 45" or "Acrylic extensions - ₹1800 - 2 hr"' label='Menu'>
              <textarea
                className={`${inputClass} h-40 py-2 font-mono text-sm`}
                name='menu'
                placeholder={'Gel polish, 800, 45\nFrench tips, 1200, 60'}
                required
              />
            </Field>
          </ActionForm>
        </details>
      </div>

      {[...groups].map(([category, list]) => (
        <section className='mt-8' key={category}>
          <h2 className='mb-2 font-heading text-xl capitalize'>{category.replace('-', ' ')}</h2>
          <div className='divide-y divide-line rounded-card border border-line bg-surface'>
            {list.map((s) => (
              <details className='group px-4 py-3' key={String(s.id)}>
                <summary className='flex cursor-pointer list-none items-center justify-between gap-3'>
                  <span className={s.active === false ? 'text-muted line-through' : ''}>
                    {s.name}
                    {s.isAddOn ? <span className='ml-2 text-xs text-muted'>add-on</span> : null}
                  </span>
                  <span className='shrink-0 text-sm text-muted'>
                    {formatINR(s.price)} · {formatDuration(s.durationMinutes)}
                  </span>
                </summary>
                <div className='mt-4'>
                  <ActionForm action={saveService.bind(null, slug)}>
                    <ServiceFields s={s} />
                  </ActionForm>
                  <div className='mt-3'>
                    <FlagButton run={archiveService.bind(null, slug, s.id, s.active === false)}>
                      {s.active === false ? 'Put back on menu' : 'Hide from menu'}
                    </FlagButton>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
