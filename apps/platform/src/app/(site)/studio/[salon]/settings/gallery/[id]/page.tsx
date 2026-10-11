import { formatINR, forTenant, type ID } from '@salon/core'
import { formatDuration, LENGTHS, OCCASIONS, SHAPES, salonStyles } from '@salon/modules'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ActionForm } from '@/components/studio/ActionForm'
import { Field, inputClass } from '@/components/studio/Field'
import { FlagButton } from '@/components/studio/FlagButton'
import { mediaUrl } from '@/lib/media'
import { getPayloadClient } from '@/lib/payload'
import { requireStaff } from '@/lib/staff'
import { deleteDesign, saveDesign } from '../../actions'

export const metadata = { title: 'Edit design' }

const idOf = (v: unknown) => (v && typeof v === 'object' && 'id' in v ? String((v as { id: ID }).id) : v == null ? '' : String(v))
const chip =
  'inline-flex min-h-11 cursor-pointer items-center rounded-full border border-line px-4 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand/10 has-[:checked]:text-brand'

export default async function EditDesignPage({ params }: { params: Promise<{ salon: string; id: string }> }) {
  const { salon: slug, id } = await params
  const { salon } = await requireStaff(slug, { manager: true })
  const payload = await getPayloadClient()
  const repo = forTenant(payload, salon.id)
  const d = await repo.findByID<{
    id: ID
    title: string
    description?: string | null
    images?: unknown[]
    styles?: unknown[]
    service?: unknown
    addOns?: unknown[]
    priceFrom?: number | null
    durationMinutes?: number | null
    shape?: string | null
    length?: string | null
    occasions?: string[] | null
    seasons?: string[] | null
    colors?: string[] | null
    artist?: unknown
    featured?: boolean | null
    published?: boolean | null
    source?: string | null
  }>('designs', id, 1)
  if (!d) notFound()
  const [styles, services, team] = await Promise.all([
    salonStyles(payload, salon.id, { includeHidden: true }),
    repo.find<{ id: ID; name: string; price: number; durationMinutes: number; isAddOn?: boolean }>('services', {
      where: { active: { equals: true } },
      sort: 'order',
      limit: 200,
      depth: 0,
    }),
    payload.find({
      collection: 'users',
      overrideAccess: true,
      depth: 0,
      limit: 50,
      where: { and: [{ 'tenants.tenant': { equals: salon.id } }, { bookable: { equals: true } }] },
    }),
  ])
  const selectedStyles = new Set((d.styles ?? []).map(idOf))
  const selectedAddOns = new Set((d.addOns ?? []).map(idOf))
  const occasions = new Set(d.occasions ?? [])
  const main = services.docs.find((s) => String(s.id) === idOf(d.service))
  const computed = (main?.price ?? 0) + services.docs.filter((s) => selectedAddOns.has(String(s.id))).reduce((n, s) => n + s.price, 0)
  const back = `/studio/${slug}/settings/gallery`
  return (
    <div>
      <Link className='text-sm text-brand' href={back}>
        ← Gallery
      </Link>
      <div className='mt-3 flex items-start justify-between gap-3'>
        <h1 className='font-heading text-3xl'>{d.title}</h1>
        {d.published ? (
          <Link className='shrink-0 text-sm text-brand' href={`/s/${slug}/designs/${d.id}`} target='_blank'>
            View ↗
          </Link>
        ) : null}
      </div>

      <ActionForm action={saveDesign.bind(null, slug)} className='mt-6' submit='Save design'>
        <input name='id' type='hidden' value={String(d.id)} />
        <section className='space-y-3 rounded-card border border-line bg-surface p-4'>
          <h2 className='font-heading text-xl'>Photos</h2>
          <p className='text-sm text-muted'>Untick to remove. Choose which one is the cover customers see first.</p>
          <div className='grid grid-cols-3 gap-2'>
            {(d.images ?? []).map((img) => {
              const url = mediaUrl(img, 'thumb')
              const mid = idOf(img)
              return (
                <div className='space-y-1' key={mid}>
                  {url ? (
                    <img alt='' className='aspect-square w-full rounded-lg object-cover' src={url} />
                  ) : (
                    <div className='aspect-square rounded-lg bg-tint' />
                  )}
                  <label className='flex min-h-9 items-center gap-1.5 text-xs'>
                    <input className='h-4 w-4' defaultChecked name='keepImage' type='checkbox' value={mid} /> Keep
                  </label>
                  <label className='flex min-h-9 items-center gap-1.5 text-xs'>
                    <input className='h-4 w-4' defaultChecked={mid === idOf(d.images?.[0])} name='coverImage' type='radio' value={mid} /> Cover
                  </label>
                </div>
              )
            })}
          </div>
          <Field hint='Add up to 6 more' label='Add photos'>
            <input accept='image/*' className='w-full min-w-0 text-sm' multiple name='newImages' type='file' />
          </Field>
        </section>

        <section className='space-y-4 rounded-card border border-line bg-surface p-4'>
          <h2 className='font-heading text-xl'>Details</h2>
          <Field label='Name'>
            <input className={inputClass} defaultValue={d.title} name='title' required />
          </Field>
          <Field label='Description'>
            <textarea className={`${inputClass} h-24 py-2`} defaultValue={d.description ?? ''} name='description' />
          </Field>
          <fieldset>
            <legend className='mb-2 text-sm font-medium'>Styles</legend>
            <div className='flex flex-wrap gap-2'>
              {styles.map((s) => (
                <label className={chip} key={String(s.id)}>
                  <input className='sr-only' defaultChecked={selectedStyles.has(String(s.id))} name='styles' type='checkbox' value={String(s.id)} />
                  {s.name}
                  {s.active === false ? ' (hidden)' : ''}
                </label>
              ))}
            </div>
            <Link className='mt-2 inline-block text-xs text-brand' href={`${back}?show=styles`}>
              Manage styles
            </Link>
          </fieldset>
        </section>

        <section className='space-y-4 rounded-card border border-line bg-surface p-4'>
          <h2 className='font-heading text-xl'>Price & time</h2>
          <Field hint='What customers book when they choose this design' label='Main service'>
            <select className={inputClass} defaultValue={idOf(d.service)} name='service'>
              <option value=''>None</option>
              {services.docs
                .filter((s) => !s.isAddOn)
                .map((s) => (
                  <option key={String(s.id)} value={String(s.id)}>
                    {s.name} · {formatINR(s.price)}
                  </option>
                ))}
            </select>
          </Field>
          {services.docs.some((s) => s.isAddOn) ? (
            <fieldset>
              <legend className='mb-2 text-sm font-medium'>Included add-ons</legend>
              <div className='flex flex-wrap gap-2'>
                {services.docs
                  .filter((s) => s.isAddOn)
                  .map((s) => (
                    <label className={chip} key={String(s.id)}>
                      <input className='sr-only' defaultChecked={selectedAddOns.has(String(s.id))} name='addOns' type='checkbox' value={String(s.id)} />
                      {s.name} +{formatINR(s.price)}
                    </label>
                  ))}
              </div>
            </fieldset>
          ) : null}
          <div className='grid grid-cols-2 gap-3'>
            <Field hint={computed ? `Services add up to ${formatINR(computed)}` : undefined} label='"From" price (₹)'>
              <input
                className={inputClass}
                defaultValue={d.priceFrom ? d.priceFrom / 100 : ''}
                inputMode='numeric'
                min={0}
                name='priceFrom'
                placeholder={computed ? String(computed / 100) : ''}
                type='number'
              />
            </Field>
            <Field hint={main ? `Service takes ${formatDuration(main.durationMinutes)}` : undefined} label='Time (minutes)'>
              <input className={inputClass} defaultValue={d.durationMinutes ?? ''} inputMode='numeric' min={5} name='durationMinutes' step={5} type='number' />
            </Field>
          </div>
        </section>

        <section className='space-y-4 rounded-card border border-line bg-surface p-4'>
          <h2 className='font-heading text-xl'>Help customers find it</h2>
          <div className='grid grid-cols-2 gap-3'>
            <Field label='Shape'>
              <select className={inputClass} defaultValue={d.shape ?? ''} name='shape'>
                <option value=''>Any</option>
                {SHAPES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label='Length'>
              <select className={inputClass} defaultValue={d.length ?? ''} name='length'>
                <option value=''>Any</option>
                {LENGTHS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <fieldset>
            <legend className='mb-2 text-sm font-medium'>Occasions</legend>
            <div className='flex flex-wrap gap-2'>
              {OCCASIONS.map((o) => (
                <label className={chip} key={o}>
                  <input className='sr-only' defaultChecked={occasions.has(o)} name='occasions' type='checkbox' value={o} />
                  {o.replace('-', ' ')}
                </label>
              ))}
            </div>
          </fieldset>
          <Field hint='Comma separated: navratri, diwali, wedding, summer' label='Seasons & festivals'>
            <input className={inputClass} defaultValue={(d.seasons ?? []).join(', ')} name='seasons' />
          </Field>
          <Field hint='Comma separated: red, nude, gold' label='Colours'>
            <input className={inputClass} defaultValue={(d.colors ?? []).join(', ')} name='colors' />
          </Field>
          <Field label='Artist'>
            <select className={inputClass} defaultValue={idOf(d.artist)} name='artist'>
              <option value=''>Salon</option>
              {(team.docs as unknown as { id: ID; name: string }[]).map((t) => (
                <option key={String(t.id)} value={String(t.id)}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
        </section>

        <section className='space-y-1 rounded-card border border-line bg-surface p-4'>
          <label className='flex min-h-11 items-center gap-3 text-sm'>
            <input className='h-5 w-5' defaultChecked={d.published !== false} name='published' type='checkbox' /> Show in the gallery
          </label>
          <label className='flex min-h-11 items-center gap-3 text-sm'>
            <input className='h-5 w-5' defaultChecked={Boolean(d.featured)} name='featured' type='checkbox' /> Feature on the home page
          </label>
        </section>
      </ActionForm>

      <div className='mt-8 border-t border-line pt-6'>
        <FlagButton className='text-red-700' confirm={`Delete "${d.title}"? This can't be undone.`} run={deleteDesign.bind(null, slug, d.id)} then={back}>
          Delete this design
        </FlagButton>
      </div>
    </div>
  )
}
