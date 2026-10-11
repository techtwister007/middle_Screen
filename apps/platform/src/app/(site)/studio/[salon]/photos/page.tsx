import { formatIST, forTenant } from '@salon/core'
import { Badge, cn, EmptyState } from '@salon/ui'
import { Camera } from 'lucide-react'
import Link from 'next/link'
import { CollageButton } from '@/components/studio/CollageButton'
import { ShareRow } from '@/components/studio/ShareRow'
import { mediaUrl } from '@/lib/media'
import { getPayloadClient } from '@/lib/payload'
import { requireFeature } from '@/lib/salon'
import { requireStaff } from '@/lib/staff'

export const metadata = { title: 'Photo corner' }

export default async function PhotosPage({ params, searchParams }: { params: Promise<{ salon: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { salon: slug } = await params
  const { tab = 'pending' } = await searchParams
  const { salon } = await requireStaff(slug)
  requireFeature(salon, 'contentEngine')
  const payload = await getPayloadClient()
  const repo = forTenant(payload, salon.id)
  const tz = salon.timezone ?? 'Asia/Kolkata'
  const status = tab === 'verify' ? 'shared' : 'pending'
  const tasks = (
    await repo.find<{
      id: string
      createdAt: string
      designName?: string
      customer: { name?: string; phone: string }
      story?: unknown
      square?: unknown
      photos?: unknown[]
      sharedTo?: string[]
    }>('photo-tasks', {
      where: { status: { equals: status } },
      sort: '-createdAt',
      depth: 1,
      limit: 50,
    })
  ).docs
  const collages =
    tab === 'collage'
      ? (
          await repo.find<{ id: string; url?: string; createdAt: string }>('media', {
            where: { alt: { equals: 'Weekly collage' } },
            sort: '-createdAt',
            limit: 12,
          })
        ).docs
      : []
  const base = `/studio/${slug}`
  if (tab === 'collage')
    return (
      <div>
        <h1 className='font-heading text-3xl'>Photo corner</h1>
        <Tabs base={base} tab={tab} />
        <p className='mt-5 text-sm text-muted'>Every Monday the best sets of the week become one Instagram-ready collage. Download it and post.</p>
        <div className='mt-4'>
          <CollageButton slug={slug} />
        </div>
        <div className='mt-5 grid gap-4 sm:grid-cols-2'>
          {collages.map((c) => (
            <figure className='overflow-hidden rounded-card border border-line bg-surface' key={c.id}>
              <img alt='Weekly collage' className='w-full' src={mediaUrl(c, 'large') ?? c.url ?? undefined} />
              <figcaption className='flex items-center justify-between p-3 text-sm'>
                {formatIST(c.createdAt, 'd MMM', tz)}
                <a className='text-brand' download href={c.url ?? ''}>
                  Download
                </a>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    )
  return (
    <div>
      <h1 className='font-heading text-3xl'>Photo corner</h1>
      <Tabs base={base} tab={tab} />
      <div className='mt-5 space-y-2'>
        {tasks.length === 0 ? (
          <EmptyState
            icon={<Camera />}
            title={tab === 'verify' ? 'Nothing to verify' : 'All caught up'}
            body={tab === 'verify' ? 'When customers say they posted, they show up here.' : 'Finished sets appear here after checkout.'}
          />
        ) : (
          tasks.map((t) =>
            tab === 'verify' ? (
              <ShareRow
                channels={t.sharedTo ?? []}
                key={t.id}
                name={t.customer?.name ?? t.customer?.phone ?? 'Customer'}
                slug={slug}
                taskId={t.id}
                thumb={mediaUrl(t.story, 'thumb') ?? mediaUrl(t.square, 'thumb') ?? mediaUrl(t.photos?.[0], 'thumb')}
              />
            ) : (
              <Link className='flex min-h-16 items-center gap-3 rounded-card border border-line bg-surface p-4' href={`${base}/photos/${t.id}`} key={t.id}>
                <span className='flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand'>
                  <Camera size={20} />
                </span>
                <div className='flex-1'>
                  <p className='font-medium'>{t.customer?.name ?? t.customer?.phone}</p>
                  <p className='text-xs text-muted'>
                    {t.designName ?? 'New set'} · {formatIST(t.createdAt, 'h:mm a, d MMM', tz)}
                  </p>
                </div>
                <Badge>Take photos</Badge>
              </Link>
            ),
          )
        )}
      </div>
    </div>
  )
}

const Tabs = ({ base, tab }: { base: string; tab: string }) => (
  <div className='no-scrollbar mt-4 flex gap-2 overflow-x-auto'>
    {[
      ['pending', 'Waiting for photos'],
      ['verify', 'Shares to verify'],
      ['collage', 'Weekly collage'],
    ].map(([k, label]) => (
      <Link
        className={cn(
          'inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm',
          tab === k ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface',
        )}
        href={`${base}/photos?tab=${k}`}
        key={k}
      >
        {label}
      </Link>
    ))}
  </div>
)
