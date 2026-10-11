import { formatINR, forTenant, type ID } from '@salon/core'
import { salonStyles } from '@salon/modules'
import { cn } from '@salon/ui'
import { ArrowDown, ArrowUp, Pencil } from 'lucide-react'
import Link from 'next/link'
import { ActionForm } from '@/components/studio/ActionForm'
import { Field, inputClass } from '@/components/studio/Field'
import { FlagButton } from '@/components/studio/FlagButton'
import { mediaUrl } from '@/lib/media'
import { getPayloadClient } from '@/lib/payload'
import { canManage, requireStaff } from '@/lib/staff'
import { addDesign, copyFromLibrary, deleteDesign, moveDesign, saveStyle, setDesignFlags, updateStyle } from '../actions'

// Building a demo salon or copying photos can take a minute.
export const maxDuration = 300

export const metadata = { title: 'Gallery' }

interface Design {
  id: ID
  title: string
  images?: unknown[]
  published?: boolean | null
  featured?: boolean | null
  source?: string | null
  likes?: number | null
  priceFrom?: number | null
  styles?: { id: ID; name: string }[] | null
  artist?: { id?: ID; name?: string } | null
  customer?: { name?: string } | null
  libraryDesign?: ID | { id: ID } | null
}

const TABS = [
  ['live', 'Live'],
  ['waiting', 'Waiting & hidden'],
  ['styles', 'Styles'],
  ['library', 'Design library'],
] as const

export default async function GalleryPage({ params, searchParams }: { params: Promise<{ salon: string }>; searchParams: Promise<{ show?: string }> }) {
  const { salon: slug } = await params
  const sp = await searchParams
  // Older links used ?show=hidden.
  const tab = sp.show === 'hidden' ? 'waiting' : (TABS.find(([k]) => k === sp.show)?.[0] ?? 'live')
  const { salon, user } = await requireStaff(slug)
  const manager = canManage(user)
  const payload = await getPayloadClient()
  const repo = forTenant(payload, salon.id)
  const [designs, services, styles] = await Promise.all([
    repo.find<Design>('designs', { sort: 'order', limit: 300, depth: 1 }),
    repo.find<{ id: ID; name: string }>('services', { where: { active: { equals: true } }, sort: 'order', limit: 200, depth: 0 }),
    salonStyles(payload, salon.id, { includeHidden: true }),
  ])
  const waiting = designs.docs.filter((d) => !d.published)
  const live = designs.docs.filter((d) => d.published)
  // Artists see their own uploads waiting for approval.
  const mine = waiting.filter((d) => String(d.artist?.id ?? '') === String(user.id))
  const base = `/studio/${slug}/settings/gallery`
  const library =
    manager && tab === 'library'
      ? ((
          await payload.find({
            collection: 'library-designs',
            overrideAccess: true,
            depth: 1,
            limit: 200,
            where: { published: { equals: true } },
            sort: '-timesCopied',
          })
        ).docs as unknown as { id: ID; title: string; images?: unknown[]; styleNames?: string[] }[])
      : []
  const copied = new Set(designs.docs.map((d) => String(typeof d.libraryDesign === 'object' ? d.libraryDesign?.id : (d.libraryDesign ?? ''))))
  const usage = new Map<string, number>()
  for (const d of designs.docs) for (const s of d.styles ?? []) usage.set(String(s.id), (usage.get(String(s.id)) ?? 0) + 1)
  const shown = tab === 'waiting' ? waiting : live

  return (
    <div>
      <Link className='text-sm text-brand' href={`/studio/${slug}/settings`}>
        ← More
      </Link>
      <h1 className='mt-3 font-heading text-3xl'>Gallery</h1>
      <p className='mt-1 text-sm text-muted'>{live.length} designs live. Customers pick one and book it with the price already worked out.</p>

      {manager ? (
        <nav aria-label='Gallery sections' className='no-scrollbar mt-5 flex gap-2 overflow-x-auto'>
          {TABS.map(([k, label]) => (
            <Link
              aria-current={tab === k ? 'page' : undefined}
              className={cn(
                'inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm',
                tab === k ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface',
              )}
              href={`${base}?show=${k}`}
              key={k}
            >
              {label}
              {k === 'waiting' && waiting.length ? <span className='ml-1.5 rounded-full bg-black/10 px-1.5 text-xs'>{waiting.length}</span> : null}
            </Link>
          ))}
        </nav>
      ) : null}

      {tab === 'live' || tab === 'waiting' || !manager ? (
        <>
          <details className='mt-5 rounded-card border border-dashed border-brand bg-surface p-4' open={!manager}>
            <summary className='cursor-pointer py-1 font-medium text-brand'>+ Add a design</summary>
            <ActionForm action={addDesign.bind(null, slug)} className='mt-4' resetOnSuccess submit={manager ? 'Publish design' : 'Send for approval'}>
              <Field hint='Up to 6 photos. The first one is the cover.' label='Photos'>
                <input accept='image/*' className='w-full min-w-0 text-sm' multiple name='images' required type='file' />
              </Field>
              <Field label='Design name'>
                <input className={inputClass} name='title' placeholder='Mirror work French' required />
              </Field>
              <fieldset>
                <legend className='mb-2 text-sm font-medium'>Styles</legend>
                <div className='flex flex-wrap gap-2'>
                  {styles
                    .filter((s) => s.active !== false)
                    .map((s) => (
                      <label
                        className='inline-flex min-h-11 cursor-pointer items-center rounded-full border border-line px-4 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand/10 has-[:checked]:text-brand'
                        key={String(s.id)}
                      >
                        <input className='sr-only' name='styles' type='checkbox' value={String(s.id)} />
                        {s.name}
                      </label>
                    ))}
                </div>
              </fieldset>
              <Field hint='Sets the price and time customers see' label='Main service'>
                <select className={inputClass} name='service'>
                  <option value=''>Choose…</option>
                  {services.docs.map((s) => (
                    <option key={String(s.id)} value={String(s.id)}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field hint='Comma separated, e.g. navratri, wedding' label='Season / occasion'>
                <input className={inputClass} name='seasons' />
              </Field>
              {manager ? (
                <label className='flex min-h-11 items-center gap-2 text-sm'>
                  <input className='h-5 w-5' name='featured' type='checkbox' /> Feature on the home page
                </label>
              ) : null}
            </ActionForm>
          </details>

          {!manager && mine.length ? (
            <p className='mt-4 rounded-card bg-tint p-3 text-sm'>
              {mine.length} of your design{mine.length > 1 ? 's are' : ' is'} waiting for the owner to approve.
            </p>
          ) : null}

          <div className='mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3'>
            {shown.map((d, i) => {
              const img = mediaUrl(d.images?.[0], 'thumb')
              return (
                <div className='overflow-hidden rounded-card border border-line bg-surface' data-testid='design-card' key={String(d.id)}>
                  <div className='relative'>
                    {manager ? (
                      <Link aria-label={`Edit ${d.title}`} href={`${base}/${d.id}`}>
                        {img ? <img alt='' className='aspect-square w-full object-cover' src={img} /> : <div className='aspect-square bg-tint' />}
                      </Link>
                    ) : img ? (
                      <img alt='' className='aspect-square w-full object-cover' src={img} />
                    ) : (
                      <div className='aspect-square bg-tint' />
                    )}
                    {d.featured ? <span className='absolute top-2 left-2 rounded-full bg-black/65 px-2 py-0.5 text-xs text-white'>★ Featured</span> : null}
                  </div>
                  <div className='space-y-2 p-3'>
                    <p className='truncate text-sm font-medium'>{d.title}</p>
                    {!d.priceFrom && manager ? (
                      <Link className='inline-flex min-h-8 items-center text-xs font-medium text-amber-800 underline' href={`${base}/${d.id}`}>
                        Set a price
                      </Link>
                    ) : null}
                    <p className='truncate text-xs text-muted'>
                      {d.priceFrom ? `${formatINR(d.priceFrom)} · ` : ''}
                      {(d.styles ?? []).map((s) => s.name).join(', ') ||
                        (d.source === 'customer'
                          ? `From ${d.customer?.name?.split(' ')[0] ?? 'a customer'} (with consent)`
                          : (d.artist?.name ?? 'By the salon'))}
                      {d.likes ? ` · ♥ ${d.likes}` : ''}
                    </p>
                    {manager ? (
                      <div className={cn('flex items-center gap-1.5', tab === 'waiting' ? 'flex-wrap' : 'flex-nowrap')}>
                        <Link
                          className={cn(
                            'inline-flex min-h-11 items-center justify-center gap-1 rounded-btn border border-line bg-surface text-xs hover:border-brand',
                            tab === 'waiting' ? 'px-3' : 'w-11 sm:w-auto sm:px-3',
                          )}
                          href={`${base}/${d.id}`}
                        >
                          <Pencil size={14} /> <span className={tab === 'waiting' ? '' : 'sr-only sm:not-sr-only'}>Edit</span>
                        </Link>
                        {tab === 'waiting' ? (
                          <>
                            <FlagButton run={setDesignFlags.bind(null, slug, d.id, { published: true })}>Approve</FlagButton>
                            <FlagButton
                              className='text-red-700'
                              confirm={`Delete "${d.title}"? This can't be undone.`}
                              run={deleteDesign.bind(null, slug, d.id)}
                            >
                              Delete
                            </FlagButton>
                          </>
                        ) : (
                          <>
                            <FlagButton
                              className='w-11 px-0'
                              disabled={i === 0}
                              label={`Move ${d.title} earlier`}
                              run={moveDesign.bind(null, slug, d.id, 'up')}
                            >
                              <ArrowUp size={16} />
                            </FlagButton>
                            <FlagButton
                              className='w-11 px-0'
                              disabled={i === shown.length - 1}
                              label={`Move ${d.title} later`}
                              run={moveDesign.bind(null, slug, d.id, 'down')}
                            >
                              <ArrowDown size={16} />
                            </FlagButton>
                          </>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
          {!shown.length ? (
            <p className='mt-6 text-sm text-muted'>
              {tab === 'waiting' ? 'Nothing waiting for approval.' : 'No designs yet. Add one above or copy from the design library.'}
            </p>
          ) : null}
        </>
      ) : null}

      {manager && tab === 'styles' ? (
        <section className='mt-5'>
          <p className='mb-4 text-sm text-muted'>
            Styles are the filters customers tap in your gallery (French, Chrome, Bridal…). Rename, reorder, hide or add your own.
          </p>
          <div className='divide-y divide-line rounded-card border border-line bg-surface'>
            {styles.map((s, i) => (
              <div className='space-y-2 px-4 py-3' data-testid='style-row' key={String(s.id)}>
                <ActionForm action={saveStyle.bind(null, slug)} className='flex items-center gap-2 space-y-0' compact submit='Rename'>
                  <input name='id' type='hidden' value={String(s.id)} />
                  <input
                    aria-label={`Name of style ${s.name}`}
                    className={`${inputClass} min-w-0 flex-1 ${s.active === false ? 'text-muted line-through' : ''}`}
                    defaultValue={s.name}
                    maxLength={30}
                    name='name'
                  />
                </ActionForm>
                <div className='flex flex-wrap items-center gap-1.5'>
                  <span className='mr-auto text-xs text-muted'>
                    {usage.get(String(s.id)) ?? 0} designs{s.active === false ? ' · hidden' : ''}
                  </span>
                  <FlagButton className='w-11 px-0' disabled={i === 0} label={`Move ${s.name} up`} run={updateStyle.bind(null, slug, s.id, 'up')}>
                    <ArrowUp size={16} />
                  </FlagButton>
                  <FlagButton
                    className='w-11 px-0'
                    disabled={i === styles.length - 1}
                    label={`Move ${s.name} down`}
                    run={updateStyle.bind(null, slug, s.id, 'down')}
                  >
                    <ArrowDown size={16} />
                  </FlagButton>
                  <FlagButton run={updateStyle.bind(null, slug, s.id, s.active === false ? 'show' : 'hide')}>{s.active === false ? 'Show' : 'Hide'}</FlagButton>
                  <FlagButton
                    className='text-red-700'
                    confirm={`Delete "${s.name}"?${usage.get(String(s.id)) ? ' Designs stay; they just lose this tag.' : ''}`}
                    run={updateStyle.bind(null, slug, s.id, 'delete')}
                  >
                    Delete
                  </FlagButton>
                </div>
              </div>
            ))}
          </div>
          <div className='mt-4 rounded-card border border-dashed border-brand bg-surface p-4'>
            <ActionForm action={saveStyle.bind(null, slug)} resetOnSuccess submit='Add style'>
              <Field label='New style'>
                <input className={inputClass} maxLength={30} name='name' placeholder='Korean jelly, Marble, Mehendi…' required />
              </Field>
            </ActionForm>
          </div>
        </section>
      ) : null}

      {manager && tab === 'library' ? (
        <section className='mt-5'>
          <p className='mb-4 text-sm text-muted'>
            Ready-made looks with licensed photos. Copy one into your gallery, then set your price or swap in a photo of your own work.
          </p>
          <div className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
            {library.map((l) => {
              const img = mediaUrl(l.images?.[0], 'thumb')
              return (
                <div className='overflow-hidden rounded-card border border-line bg-surface' data-testid='library-card' key={String(l.id)}>
                  {img ? <img alt='' className='aspect-square w-full object-cover' src={img} /> : <div className='aspect-square bg-tint' />}
                  <div className='space-y-2 p-3'>
                    <p className='truncate text-sm font-medium'>{l.title}</p>
                    <p className='truncate text-xs text-muted'>{(l.styleNames ?? []).join(', ')}</p>
                    {copied.has(String(l.id)) ? (
                      <p className='flex min-h-11 items-center text-xs text-green-700'>✓ In your gallery</p>
                    ) : (
                      <FlagButton className='w-full' run={copyFromLibrary.bind(null, slug, l.id)}>
                        + Add to my gallery
                      </FlagButton>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          {!library.length ? <p className='text-sm text-muted'>The library is empty for now.</p> : null}
        </section>
      ) : null}
    </div>
  )
}
