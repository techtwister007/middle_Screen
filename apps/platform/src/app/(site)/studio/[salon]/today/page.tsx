import { ApptActions } from '@/components/studio/ApptActions'
import { getPayloadClient } from '@/lib/payload'
import { mediaUrl } from '@/lib/media'
import { canManage, requireStaff } from '@/lib/staff'
import { DAY_MS, type ID, forTenant, formatINR, formatIST, localDate, zonedDateTime } from '@salon/core'
import { actionFeed, ownerSummaryText } from '@salon/modules'
import { Badge, Stat, buttonClass } from '@salon/ui'
import { ArrowRight, Sparkles } from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'Today' }

interface Appt {
  id: ID
  start: string
  end: string
  status: string
  source?: string
  notes?: string
  customer: { id: ID; name?: string; phone: string; visitCount?: number; segment?: string; notes?: string; isVip?: boolean } | null
  staff?: { name: string } | null
  services: { name: string }[]
  design?: { title: string; images?: unknown[] } | null
  inspiration?: unknown[]
}

export default async function TodayPage({ params }: { params: Promise<{ salon: string }> }) {
  const { salon: slug } = await params
  const { salon, user } = await requireStaff(slug)
  const payload = await getPayloadClient()
  const repo = forTenant(payload, salon.id)
  const tz = salon.timezone ?? 'Asia/Kolkata'
  const now = new Date()
  const dayStart = zonedDateTime(localDate(now, tz), '00:00', tz)
  const dayEnd = new Date(dayStart.getTime() + DAY_MS)
  const base = `/studio/${slug}`
  const staffFilter = user.role === 'artist' ? [{ staff: { equals: user.id } }] : []
  const [todayAppts, requests, cards, summary] = await Promise.all([
    repo.find<Appt>('appointments', {
      where: { and: [{ start: { greater_than_equal: dayStart.toISOString() } }, { start: { less_than: dayEnd.toISOString() } }, { status: { not_in: ['cancelled'] } }, ...staffFilter] },
      sort: 'start',
      depth: 1,
      limit: 100,
    }),
    repo.find<Appt>('appointments', {
      where: { and: [{ status: { equals: 'requested' } }, { start: { greater_than_equal: dayEnd.toISOString() } }] },
      sort: 'start',
      depth: 1,
      limit: 20,
    }),
    canManage(user) ? actionFeed(payload, salon.id, base, now) : Promise.resolve([]),
    canManage(user) ? ownerSummaryText(payload, salon.id, now) : Promise.resolve(''),
  ])
  const done = todayAppts.docs.filter((a) => a.status === 'completed').length
  const expected = todayAppts.docs.reduce((n, a) => n + ((a as unknown as { quotedTotal?: number }).quotedTotal ?? 0), 0)

  const Row = ({ a }: { a: Appt }) => {
    const past = new Date(a.end).getTime() < now.getTime()
    return (
      <div className="flex gap-3 rounded-card border border-line bg-surface p-3">
        <div className="w-16 shrink-0 text-center">
          <p className="font-heading text-lg leading-tight">{formatIST(a.start, 'h:mm', tz)}</p>
          <p className="text-[11px] text-muted">{formatIST(a.start, 'a', tz)}</p>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link className="font-medium" href={`${base}/customers/${a.customer?.id}`}>
              {a.customer?.name ?? a.customer?.phone}
            </Link>
            {a.customer?.isVip ? <Badge tone="warning">VIP</Badge> : null}
            {a.customer?.visitCount === 0 ? <Badge>First visit</Badge> : null}
            {a.status === 'completed' ? <Badge tone="success">Done</Badge> : a.status === 'requested' ? <Badge tone="warning">Request</Badge> : null}
          </div>
          <p className="truncate text-sm text-muted">
            {a.services.map((s) => s.name).join(', ')}
            {a.staff ? ` · ${a.staff.name.split(' ')[0]}` : ''}
          </p>
          {a.design ? (
            <p className="mt-1 flex items-center gap-2 text-xs">
              <img alt="" className="h-6 w-6 rounded object-cover" src={mediaUrl(a.design.images?.[0], 'thumb') ?? ''} /> {a.design.title}
            </p>
          ) : null}
          {a.inspiration?.length ? (
            <div className="mt-1 flex gap-1">
              {a.inspiration.map((m, i) => (
                <img alt="Inspiration" className="h-10 w-10 rounded object-cover" key={i} src={mediaUrl(m, 'thumb') ?? ''} />
              ))}
            </div>
          ) : null}
          {a.customer?.notes || a.notes ? <p className="mt-1 text-xs text-amber-800">Note: {a.notes ?? a.customer?.notes}</p> : null}
          <div className="mt-2">
            <ApptActions id={a.id} past={past} slug={slug} status={a.status} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <p className="text-sm text-muted">{formatIST(now, 'EEEE d MMMM', tz)}</p>
      <h1 className="font-heading text-3xl">Good {Number(formatIST(now, 'H', tz)) < 12 ? 'morning' : Number(formatIST(now, 'H', tz)) < 17 ? 'afternoon' : 'evening'}, {user.name.split(' ')[0]}</h1>
      {summary ? <p className="mt-1 text-sm text-muted">{summary}</p> : null}

      <div className="mt-5 grid grid-cols-3 gap-2">
        <Stat label="Today" value={todayAppts.docs.length} hint="appointments" />
        <Stat label="Done" value={done} />
        <Stat label="Expected" value={formatINR(expected)} />
      </div>

      {cards.length ? (
        <section className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 font-heading text-xl">
            <Sparkles className="text-brand" size={18} /> To do today
          </h2>
          <div className="space-y-2">
            {cards.map((c) => (
              <Link className="flex items-center gap-3 rounded-card border border-line bg-surface p-4 transition hover:border-brand/40" href={c.action.href} key={c.key}>
                <div className="flex-1">
                  <p className="font-medium">{c.title}</p>
                  {c.detail ? <p className="text-sm text-muted">{c.detail}</p> : null}
                </div>
                <span className="flex items-center gap-1 text-sm font-medium text-brand">
                  {c.action.label} <ArrowRight size={14} />
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-heading text-xl">Schedule</h2>
          <Link className={buttonClass('primary', 'sm')} href={`${base}/checkout`}>
            Walk-in checkout
          </Link>
        </div>
        {todayAppts.docs.length ? (
          <div className="space-y-2">
            {todayAppts.docs.map((a) => (
              <Row a={a} key={String(a.id)} />
            ))}
          </div>
        ) : (
          <p className="rounded-card border border-dashed border-line p-6 text-center text-sm text-muted">No appointments today yet.</p>
        )}
      </section>

      {requests.docs.length ? (
        <section className="mt-8" id="requests">
          <h2 className="mb-3 font-heading text-xl">Requests to confirm</h2>
          <div className="space-y-2">
            {requests.docs.map((a) => (
              <div key={String(a.id)}>
                <p className="mb-1 text-xs text-muted">{formatIST(a.start, 'EEE d MMM', tz)}</p>
                <Row a={a} />
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
