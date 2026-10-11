import { FollowUp, MessageButtons, NotesEditor } from '@/components/studio/CustomerTools'
import { getPayloadClient } from '@/lib/payload'
import { mediaUrl } from '@/lib/media'
import { requireStaff } from '@/lib/staff'
import { forTenant, formatINR, formatIST, formatPhone, salonLink } from '@salon/core'
import { walletBalance } from '@salon/modules'
import { Badge, Stat, buttonClass } from '@salon/ui'
import { Star } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const metadata = { title: 'Customer' }

export default async function CustomerPage({ params }: { params: Promise<{ salon: string; id: string }> }) {
  const { salon: slug, id } = await params
  const { salon } = await requireStaff(slug)
  const payload = await getPayloadClient()
  const repo = forTenant(payload, salon.id)
  const tz = salon.timezone ?? 'Asia/Kolkata'
  const c = await repo.findByID<{ id: string; name?: string; phone: string; segment?: string; isVip?: boolean; visitCount?: number; lifetimeSpend?: number; lastVisitAt?: string; nextDueDate?: string; notes?: string; source?: string; birthday?: string; consents?: { marketing?: boolean }; handProfile?: { shape?: string; length?: string; sensitivities?: string } }>('customers', id)
  if (!c) notFound()
  const [visits, upcoming, ratings, account, wallet] = await Promise.all([
    repo.find<{ id: string; createdAt: string; total: number; designName?: string; lines: { name: string }[]; staff?: { name: string } | null; photos?: unknown[] }>('visits', { where: { customer: { equals: c.id } }, sort: '-createdAt', depth: 1, limit: 20 }),
    repo.find<{ id: string; start: string; status: string }>('appointments', { where: { and: [{ customer: { equals: c.id } }, { start: { greater_than: new Date().toISOString() } }, { status: { in: ['requested', 'confirmed'] } }] }, sort: 'start', limit: 3 }),
    repo.find<{ id: string; score: number; comment?: string; followUp: string; createdAt: string }>('ratings', { where: { customer: { equals: c.id } }, sort: '-createdAt', limit: 5 }),
    repo.findOne<{ stamps: number; points: number; tier: string }>('loyalty-accounts', { customer: { equals: c.id } }),
    walletBalance(payload, salon.id, c.id),
  ])
  const base = `/studio/${slug}`
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="font-heading text-3xl">{c.name ?? 'Customer'}</h1>
        {c.isVip ? <Badge tone="warning">VIP</Badge> : null}
        {c.segment ? <Badge>{c.segment}</Badge> : null}
      </div>
      <p className="text-sm text-muted">
        <a href={`tel:${c.phone}`}>{formatPhone(c.phone)}</a> · came via {c.source ?? 'direct'}
        {c.consents?.marketing ? '' : ' · no marketing consent'}
      </p>
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Visits" value={c.visitCount ?? 0} />
        <Stat label="Spent" value={formatINR(c.lifetimeSpend ?? 0)} />
        <Stat label="Points" value={account?.points ?? 0} hint={`${account?.stamps ?? 0} stamps · ${account?.tier ?? 'member'}`} />
        <Stat label="Wallet" value={formatINR(wallet)} />
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link className={buttonClass('primary')} href={`${base}/checkout?customer=${c.id}`}>
          Check out
        </Link>
      </div>
      <section className="mt-8">
        <h2 className="mb-2 font-heading text-xl">Send a WhatsApp</h2>
        <MessageButtons customerId={c.id} link={salonLink(slug, `/book?repeat=${visits.docs[0]?.id ?? ''}`)} slug={slug} />
        {c.nextDueDate ? <p className="mt-2 text-xs text-muted">Next refill due {formatIST(c.nextDueDate, 'd MMM', tz)}</p> : null}
      </section>
      <section className="mt-8">
        <h2 className="mb-2 font-heading text-xl">Notes</h2>
        {c.handProfile?.shape || c.handProfile?.sensitivities ? (
          <p className="mb-2 text-sm text-muted">
            Prefers {c.handProfile.shape ?? '—'} {c.handProfile.length ?? ''}. {c.handProfile.sensitivities}
          </p>
        ) : null}
        <NotesEditor customerId={c.id} initial={c.notes ?? ''} slug={slug} />
      </section>
      {upcoming.docs.length ? (
        <section className="mt-8">
          <h2 className="mb-2 font-heading text-xl">Upcoming</h2>
          {upcoming.docs.map((a) => (
            <p className="text-sm" key={a.id}>
              {formatIST(a.start, 'EEE d MMM, h:mm a', tz)} · {a.status}
            </p>
          ))}
        </section>
      ) : null}
      {ratings.docs.length ? (
        <section className="mt-8">
          <h2 className="mb-2 font-heading text-xl">Ratings</h2>
          <div className="space-y-2">
            {ratings.docs.map((r) => (
              <div className="rounded-card border border-line bg-surface p-3" key={r.id}>
                <p className="flex items-center gap-1 text-sm">
                  {Array.from({ length: r.score }).map((_, i) => (
                    <Star className="text-accent" fill="currentColor" key={i} size={13} />
                  ))}
                  <span className="ml-2 text-xs text-muted">{formatIST(r.createdAt, 'd MMM', tz)}</span>
                </p>
                {r.comment ? <p className="mt-1 text-sm">{r.comment}</p> : null}
                {r.followUp === 'needed' ? <div className="mt-2"><FollowUp ratingId={r.id} slug={slug} /></div> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
      <section className="mt-8">
        <h2 className="mb-2 font-heading text-xl">History</h2>
        <div className="space-y-2">
          {visits.docs.map((v) => (
            <div className="flex items-center gap-3 rounded-card border border-line bg-surface p-3" key={v.id}>
              {v.photos?.[0] ? <img alt="" className="h-12 w-12 rounded-lg object-cover" src={mediaUrl(v.photos[0], 'thumb') ?? ''} /> : null}
              <div className="flex-1 text-sm">
                <p className="font-medium">{v.designName ?? v.lines.map((l) => l.name).join(', ')}</p>
                <p className="text-xs text-muted">
                  {formatIST(v.createdAt, 'd MMM yyyy', tz)} {v.staff ? `· ${v.staff.name.split(' ')[0]}` : ''}
                </p>
              </div>
              <span className="tabular-nums text-sm">{formatINR(v.total)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
