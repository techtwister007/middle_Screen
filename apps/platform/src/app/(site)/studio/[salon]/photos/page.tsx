import { formatIST, forTenant } from '@salon/core'
import { Badge, cn, EmptyState } from '@salon/ui'
import { Camera } from 'lucide-react'
import Link from 'next/link'
import { VerifyButton } from '@/components/studio/VerifyButton'
import { mediaUrl } from '@/lib/media'
import { getPayloadClient } from '@/lib/payload'
import { requireStaff } from '@/lib/staff'

export const metadata = { title: 'Photo corner' }

export default async function PhotosPage({ params, searchParams }: { params: Promise<{ salon: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { salon: slug } = await params
  const { tab = 'pending' } = await searchParams
  const { salon } = await requireStaff(slug)
  const repo = forTenant(await getPayloadClient(), salon.id)
  const tz = salon.timezone ?? 'Asia/Kolkata'
  const status = tab === 'verify' ? 'shared' : 'pending'
  const tasks = (
    await repo.find<{
      id: string
      createdAt: string
      designName?: string
      customer: { name?: string; phone: string }
      story?: unknown
      photos?: unknown[]
      sharedTo?: string[]
    }>('photo-tasks', {
      where: { status: { equals: status } },
      sort: '-createdAt',
      depth: 1,
      limit: 50,
    })
  ).docs
  const base = `/studio/${slug}`
  return (
    <div>
      <h1 className='font-heading text-3xl'>Photo corner</h1>
      <div className='mt-4 flex gap-2'>
        {[
          ['pending', 'Waiting for photos'],
          ['verify', 'Shares to verify'],
        ].map(([k, label]) => (
          <Link
            className={cn('rounded-full border px-4 py-2 text-sm', tab === k ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface')}
            href={`${base}/photos?tab=${k}`}
            key={k}
          >
            {label}
          </Link>
        ))}
      </div>
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
              <div className='flex items-center gap-3 rounded-card border border-line bg-surface p-3' key={t.id}>
                <img alt='' className='h-14 w-14 rounded-xl object-cover' src={mediaUrl(t.story ?? t.photos?.[0], 'thumb') ?? ''} />
                <div className='flex-1'>
                  <p className='font-medium'>{t.customer?.name ?? t.customer?.phone}</p>
                  <p className='text-xs text-muted'>Shared to {(t.sharedTo ?? []).join(', ')} · check the tag on Instagram</p>
                </div>
                <VerifyButton slug={slug} taskId={t.id} />
              </div>
            ) : (
              <Link className='flex items-center gap-3 rounded-card border border-line bg-surface p-4' href={`${base}/photos/${t.id}`} key={t.id}>
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
