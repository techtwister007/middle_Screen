import { formatIST, forTenant } from '@salon/core'
import { Badge, buttonClass } from '@salon/ui'
import { CalendarHeart, Plus, Zap } from 'lucide-react'
import Link from 'next/link'
import { OfferRowActions } from '@/components/studio/OfferRowActions'
import { getPayloadClient } from '@/lib/payload'
import { requireStaff } from '@/lib/staff'

export const metadata = { title: 'Campaigns' }

export default async function CampaignsPage({ params, searchParams }: { params: Promise<{ salon: string }>; searchParams: Promise<{ launched?: string }> }) {
  const { salon: slug } = await params
  const sp = await searchParams
  const { salon } = await requireStaff(slug, { manager: true })
  const payload = await getPayloadClient()
  const repo = forTenant(payload, salon.id)
  const tz = salon.timezone ?? 'Asia/Kolkata'
  const offers = (
    await repo.find<{ id: string; title: string; kind: string; status: string; endsAt?: string; claims?: number; pack?: string }>('offers', {
      sort: '-createdAt',
      limit: 50,
    })
  ).docs
  const sent = await Promise.all(
    offers.map((o) => repo.count('messages', { and: [{ relatedEvent: { equals: `offer:${o.id}` } }, { status: { equals: 'sent' } }] })),
  )
  const packs = (
    await payload.find({
      collection: 'campaign-packs',
      overrideAccess: true,
      sort: 'startsOn',
      limit: 6,
      where: { endsOn: { greater_than: new Date().toISOString() } },
    })
  ).docs as unknown as { id: string; title: string; pitch?: string; startsOn: string; endsOn: string }[]
  const base = `/studio/${slug}`
  return (
    <div>
      {sp.launched ? <p className='mb-4 rounded-btn bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800'>Launched! Messages are going out now.</p> : null}
      <div className='flex items-center justify-between'>
        <h1 className='font-heading text-3xl'>Campaigns</h1>
        <Link className={buttonClass('primary', 'sm')} href={`${base}/campaigns/new`}>
          <Plus size={16} /> New offer
        </Link>
      </div>
      <Link className='mt-5 flex items-center gap-4 rounded-card border border-line bg-surface p-4' href={`${base}/campaigns/new?kind=slot-filler`}>
        <span className='flex h-12 w-12 items-center justify-center rounded-full bg-accent/20 text-brand'>
          <Zap />
        </span>
        <span>
          <span className='block font-medium'>Fill quiet slots</span>
          <span className='text-sm text-muted'>Send a time-limited deal to customers who are due.</span>
        </span>
      </Link>
      <h2 className='mb-3 mt-8 flex items-center gap-2 font-heading text-xl'>
        <CalendarHeart className='text-brand' size={18} /> Festival packs
      </h2>
      <div className='grid gap-3 sm:grid-cols-2'>
        {packs.map((p) => {
          const used = offers.some((o) => String(o.pack) === String(p.id))
          return (
            <div className='rounded-card border border-line bg-surface p-4' key={p.id}>
              <p className='font-medium'>{p.title}</p>
              <p className='text-xs text-muted'>
                {formatIST(p.startsOn, 'd MMM', tz)} – {formatIST(p.endsOn, 'd MMM', tz)}
              </p>
              {p.pitch ? <p className='mt-2 text-sm text-muted'>{p.pitch}</p> : null}
              {used ? (
                <Badge className='mt-3' tone='success'>
                  Launched
                </Badge>
              ) : (
                <Link className={buttonClass('outline', 'sm', 'mt-3')} href={`${base}/campaigns/new?pack=${p.id}`}>
                  Preview & launch
                </Link>
              )}
            </div>
          )
        })}
      </div>
      <h2 className='mb-3 mt-8 font-heading text-xl'>Your offers</h2>
      <div className='divide-y divide-line overflow-hidden rounded-card border border-line bg-surface'>
        {offers.map((o, i) => (
          <div className='flex items-center justify-between gap-3 px-4 py-3' key={o.id}>
            <div className='min-w-0'>
              <p className='truncate font-medium'>{o.title}</p>
              <p className='text-xs text-muted'>
                {o.kind} · {sent[i]} sent · {o.claims ?? 0} claimed
                {o.endsAt ? ` · ends ${formatIST(o.endsAt, 'd MMM', tz)}` : ''}
              </p>
            </div>
            <div className='flex items-center gap-2'>
              <Badge tone={o.status === 'live' ? 'success' : o.status === 'draft' ? 'warning' : 'muted'}>{o.status}</Badge>
              <OfferRowActions id={o.id} slug={slug} status={o.status} />
            </div>
          </div>
        ))}
        {offers.length === 0 ? <p className='p-6 text-center text-sm text-muted'>No offers yet.</p> : null}
      </div>
    </div>
  )
}
