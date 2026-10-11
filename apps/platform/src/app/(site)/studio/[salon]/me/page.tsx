import { DAY_MS, formatINR, forTenant, type ID } from '@salon/core'
import { Stat } from '@salon/ui'
import Link from 'next/link'
import { mediaUrl } from '@/lib/media'
import { getPayloadClient } from '@/lib/payload'
import { requireStaff } from '@/lib/staff'

export const metadata = { title: 'My stats' }

/** An artist's own month: visits, revenue, ratings, rebooking and their photo portfolio. */
export default async function MyStatsPage({ params, searchParams }: { params: Promise<{ salon: string }>; searchParams: Promise<{ staff?: string }> }) {
  const { salon: slug } = await params
  const { staff } = await searchParams
  const { salon, user } = await requireStaff(slug)
  // Managers can open any artist's page from the team list; artists only see their own.
  const staffId = (user.role === 'artist' || !staff ? user.id : staff) as ID
  const payload = await getPayloadClient()
  const repo = forTenant(payload, salon.id)
  const since = new Date(Date.now() - 30 * DAY_MS).toISOString()
  const mine = { staff: { equals: staffId } }
  const [visits, ratings, tasks, preBooked, upcoming] = await Promise.all([
    repo.find<{ id: ID; total: number; subtotal: number; tip?: number | null }>('visits', {
      where: { and: [mine, { createdAt: { greater_than: since } }] },
      limit: 2000,
      depth: 0,
    }),
    repo.find<{ score: number; comment?: string | null }>('ratings', {
      where: { and: [mine, { createdAt: { greater_than: since } }] },
      limit: 2000,
      depth: 0,
      sort: '-createdAt',
    }),
    repo.find<{ id: ID; photos?: unknown[]; status: string; designName?: string | null }>('photo-tasks', {
      where: mine,
      limit: 24,
      depth: 1,
      sort: '-createdAt',
    }),
    repo.count('appointments', { and: [mine, { preBooked: { equals: true } }, { createdAt: { greater_than: since } }] }),
    repo.count('appointments', { and: [mine, { start: { greater_than: new Date().toISOString() } }, { status: { in: ['requested', 'confirmed'] } }] }),
  ])
  const revenue = visits.docs.reduce((n, v) => n + (v.subtotal ?? v.total ?? 0), 0)
  const tips = visits.docs.reduce((n, v) => n + (v.tip ?? 0), 0)
  const avg = ratings.docs.length ? ratings.docs.reduce((n, r) => n + r.score, 0) / ratings.docs.length : null
  const shared = tasks.docs.filter((t) => ['shared', 'verified'].includes(t.status)).length
  const comments = ratings.docs.filter((r) => r.comment && r.score >= 4).slice(0, 3)
  return (
    <div>
      <h1 className='font-heading text-3xl'>{staffId === user.id ? 'My last 30 days' : 'Artist: last 30 days'}</h1>
      <div className='mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3'>
        <Stat label='Clients' value={visits.totalDocs} />
        <Stat label='Services done' value={formatINR(revenue)} />
        <Stat hint={`${ratings.totalDocs} ratings`} label='Average rating' value={avg ? `${avg.toFixed(1)} ★` : '—'} />
        <Stat
          hint='Booked their next visit in your chair'
          label='Pre-booked'
          value={visits.totalDocs ? `${Math.round((preBooked / visits.totalDocs) * 100)}%` : '—'}
        />
        <Stat label='Photos shared by clients' value={shared} />
        <Stat label='Upcoming bookings' value={upcoming} />
        <Stat hint='From customers, on top of the bill' label='Tips received' value={formatINR(tips)} />
      </div>

      {comments.length ? (
        <section className='mt-8'>
          <h2 className='mb-3 font-heading text-xl'>What clients said</h2>
          <div className='space-y-2'>
            {comments.map((c, i) => (
              <blockquote className='rounded-card bg-tint p-3 text-sm' key={i}>
                “{c.comment}” <span className='text-muted'>· {c.score}★</span>
              </blockquote>
            ))}
          </div>
        </section>
      ) : null}

      <section className='mt-8'>
        <div className='mb-3 flex items-center justify-between'>
          <h2 className='font-heading text-xl'>Portfolio</h2>
          <Link className='text-sm text-brand' href={`/studio/${slug}/settings/gallery`}>
            Add to gallery
          </Link>
        </div>
        <div className='grid grid-cols-3 gap-2 sm:grid-cols-4'>
          {tasks.docs
            .flatMap((t) => (t.photos ?? []).slice(0, 1).map((p) => ({ p, t })))
            .map(({ p, t }) => {
              const url = mediaUrl(p, 'thumb')
              return url ? (
                <img alt={t.designName ?? 'Nail photo'} className='aspect-square w-full rounded-lg object-cover' key={String(t.id)} src={url} />
              ) : null
            })}
        </div>
        {!tasks.docs.length ? <p className='text-sm text-muted'>Photos you take in the photo corner show up here.</p> : null}
      </section>
    </div>
  )
}
