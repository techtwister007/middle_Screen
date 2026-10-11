import { forTenant, type ID } from '@salon/core'
import Link from 'next/link'
import { ActionForm } from '@/components/studio/ActionForm'
import { Field, inputClass } from '@/components/studio/Field'
import { FlagButton } from '@/components/studio/FlagButton'
import { mediaUrl } from '@/lib/media'
import { getPayloadClient } from '@/lib/payload'
import { canManage, requireStaff } from '@/lib/staff'
import { addDesign, deleteDesign, setDesignFlags } from '../actions'

export const metadata = { title: 'Gallery' }

interface Design {
  id: ID
  title: string
  images?: unknown[]
  published?: boolean | null
  featured?: boolean | null
  source?: string | null
  likes?: number | null
  artist?: { name?: string } | null
  customer?: { name?: string } | null
}

export default async function GalleryPage({ params, searchParams }: { params: Promise<{ salon: string }>; searchParams: Promise<{ show?: string }> }) {
  const { salon: slug } = await params
  const { show } = await searchParams
  const { salon, user } = await requireStaff(slug)
  const manager = canManage(user)
  const payload = await getPayloadClient()
  const repo = forTenant(payload, salon.id)
  const [designs, services] = await Promise.all([
    repo.find<Design>('designs', { sort: '-createdAt', limit: 200, depth: 1 }),
    repo.find<{ id: ID; name: string }>('services', { where: { active: { equals: true } }, sort: 'order', limit: 200, depth: 0 }),
  ])
  const waiting = designs.docs.filter((d) => !d.published)
  const live = designs.docs.filter((d) => d.published)
  const list = show === 'hidden' ? waiting : live
  return (
    <div>
      <Link className='text-sm text-brand' href={`/studio/${slug}/settings`}>
        ← More
      </Link>
      <h1 className='mt-3 font-heading text-3xl'>Gallery</h1>
      <p className='mt-1 text-sm text-muted'>{live.length} designs live. Customers pick a design and book it with the price already worked out.</p>

      <details className='mt-6 rounded-card border border-dashed border-brand bg-surface p-4' open={!manager}>
        <summary className='cursor-pointer font-medium text-brand'>+ Add a design</summary>
        <ActionForm action={addDesign.bind(null, slug)} className='mt-4' resetOnSuccess submit={manager ? 'Publish design' : 'Send for approval'}>
          <Field hint='Up to 6 photos. The first one is the cover.' label='Photos'>
            <input accept='image/*' className='w-full min-w-0 text-sm' multiple name='images' required type='file' />
          </Field>
          <Field label='Design name'>
            <input className={inputClass} name='title' placeholder='Mirror work French' required />
          </Field>
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
            <label className='flex items-center gap-2 text-sm'>
              <input name='featured' type='checkbox' /> Feature on the home page
            </label>
          ) : null}
        </ActionForm>
      </details>

      {manager ? (
        <div className='mt-6 flex gap-2 text-sm'>
          <Link className={`rounded-full border px-3 py-1.5 ${show !== 'hidden' ? 'border-brand bg-brand text-on-brand' : 'border-line'}`} href='?'>
            Live ({live.length})
          </Link>
          <Link className={`rounded-full border px-3 py-1.5 ${show === 'hidden' ? 'border-brand bg-brand text-on-brand' : 'border-line'}`} href='?show=hidden'>
            Waiting & hidden ({waiting.length})
          </Link>
        </div>
      ) : null}

      <div className='mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3'>
        {list.map((d) => {
          const img = mediaUrl(d.images?.[0], 'thumb')
          return (
            <div className='overflow-hidden rounded-card border border-line bg-surface' key={String(d.id)}>
              {img ? <img alt={d.title} className='aspect-square w-full object-cover' src={img} /> : <div className='aspect-square bg-tint' />}
              <div className='space-y-2 p-3'>
                <p className='truncate text-sm font-medium'>{d.title}</p>
                <p className='text-xs text-muted'>
                  {d.source === 'customer' ? `From ${d.customer?.name?.split(' ')[0] ?? 'a customer'} (with consent)` : (d.artist?.name ?? 'Salon')}
                  {d.likes ? ` · ♥ ${d.likes}` : ''}
                  {d.featured ? ' · ★ featured' : ''}
                </p>
                {manager ? (
                  <div className='flex flex-wrap gap-1.5'>
                    <FlagButton run={setDesignFlags.bind(null, slug, d.id, { published: !d.published })}>
                      {d.published ? 'Hide' : 'Approve & publish'}
                    </FlagButton>
                    {d.published ? (
                      <FlagButton run={setDesignFlags.bind(null, slug, d.id, { featured: !d.featured })}>{d.featured ? 'Unfeature' : 'Feature'}</FlagButton>
                    ) : null}
                    <FlagButton className='text-red-700' confirm={`Delete "${d.title}"? This can't be undone.`} run={deleteDesign.bind(null, slug, d.id)}>
                      Delete
                    </FlagButton>
                  </div>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
      {!list.length ? <p className='mt-6 text-sm text-muted'>{show === 'hidden' ? 'Nothing waiting for approval.' : 'No designs yet.'}</p> : null}
    </div>
  )
}
