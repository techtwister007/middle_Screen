import { DAY_MS, formatINR, formatIST, forTenant, idOf, localDate, zonedDateTime } from '@salon/core'
import { Stat } from '@salon/ui'
import { Banknote } from 'lucide-react'
import Link from 'next/link'
import { PAY_LABEL, plural } from '@/components/studio/format'
import { PrintButton } from '@/components/studio/PrintButton'
import { getPayloadClient } from '@/lib/payload'
import { requireStaff } from '@/lib/staff'
import { teamOf } from '../../_lib/team'

export const metadata = { title: 'Close the day' }

interface VisitRow {
  id: string
  createdAt: string
  total: number
  tip?: number | null
  paymentMode?: string | null
  paymentSplit?: { mode: string; amount: number }[] | null
  paidStatus?: string | null
  isFirstVisit?: boolean | null
  staff?: string | number | { id: string | number } | null
  customer?: { name?: string; phone: string } | null
  notes?: string | null
}

export default async function ClosePage({ params, searchParams }: { params: Promise<{ salon: string }>; searchParams: Promise<{ date?: string }> }) {
  const { salon: slug } = await params
  const sp = await searchParams
  const { salon } = await requireStaff(slug, { manager: true })
  const payload = await getPayloadClient()
  const repo = forTenant(payload, salon.id)
  const tz = salon.timezone ?? 'Asia/Kolkata'
  const today = localDate(new Date(), tz)
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) && sp.date <= today ? sp.date : today
  const from = zonedDateTime(date, '00:00', tz)
  const to = new Date(from.getTime() + DAY_MS)
  const [visits, noShows, team] = await Promise.all([
    repo.find<VisitRow>('visits', {
      where: { and: [{ createdAt: { greater_than_equal: from.toISOString() } }, { createdAt: { less_than: to.toISOString() } }] },
      sort: 'createdAt',
      depth: 1,
      limit: 1000,
    }),
    repo.count('appointments', {
      and: [{ start: { greater_than_equal: from.toISOString() } }, { start: { less_than: to.toISOString() } }, { status: { equals: 'no-show' } }],
    }),
    teamOf(payload, salon.id),
  ])
  const name = new Map(team.map((t) => [String(t.id), t.name.split(' ')[0]]))
  const live = visits.docs.filter((v) => !((v as { voidedAt?: string | null }).voidedAt || v.notes?.includes('VOID:')))
  const voided = visits.docs.length - live.length
  const byMode = new Map<string, number>()
  const pending: VisitRow[] = []
  const byArtist = new Map<string, { revenue: number; tips: number; visits: number }>()
  let revenue = 0
  let tips = 0
  for (const v of live) {
    const tip = v.tip ?? 0
    revenue += v.total
    tips += tip
    const artist = idOf(v.staff) ? String(idOf(v.staff)) : 'none'
    const a = byArtist.get(artist) ?? { revenue: 0, tips: 0, visits: 0 }
    a.revenue += v.total
    a.tips += tip
    a.visits += 1
    byArtist.set(artist, a)
    if (v.paidStatus === 'pending') {
      pending.push(v)
      continue
    }
    const parts = v.paymentSplit?.length ? v.paymentSplit : [{ mode: v.paymentMode ?? 'upi', amount: v.total + tip }]
    for (const p of parts) byMode.set(p.mode, (byMode.get(p.mode) ?? 0) + p.amount)
  }
  const cash = byMode.get('cash') ?? 0
  const prev = new Date(from.getTime() - DAY_MS / 2)
  return (
    <div>
      <Link className='inline-flex min-h-11 items-center text-sm text-brand print:hidden' href={`/studio/${slug}/today`}>
        ← Today
      </Link>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <h1 className='font-heading text-3xl'>Close the day</h1>
        <PrintButton />
      </div>
      <div className='mt-1 flex flex-wrap items-center gap-3 text-sm text-muted print:hidden'>
        <span>{formatIST(from, 'EEEE d MMMM', tz)}</span>
        <Link className='inline-flex min-h-11 items-center text-brand' href={`?date=${localDate(prev, tz)}`}>
          ← Previous day
        </Link>
        {date !== today ? (
          <Link className='inline-flex min-h-11 items-center text-brand' href='?'>
            Today
          </Link>
        ) : null}
      </div>

      <div className='mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4'>
        <Stat label='Visits' value={live.length} hint={`${live.filter((v) => v.isFirstVisit).length} new customers`} />
        <Stat label='Revenue' value={formatINR(revenue)} hint='after discounts' />
        <Stat label='Tips' value={formatINR(tips)} />
        <Stat label='No-shows' value={noShows} />
      </div>

      <section className='mt-6 rounded-card border-2 border-brand bg-surface p-4'>
        <p className='flex items-center gap-2 text-sm font-medium'>
          <Banknote className='text-brand' size={18} /> Cash to count in the drawer
        </p>
        <p className='mt-1 font-heading text-4xl tabular-nums' data-testid='cash-to-count'>
          {formatINR(cash)}
        </p>
        <p className='text-xs text-muted'>Includes cash tips and the cash part of split payments.</p>
      </section>

      <section className='mt-6'>
        <h2 className='mb-2 font-heading text-xl'>By payment mode</h2>
        <div className='divide-y divide-line rounded-card border border-line bg-surface text-sm'>
          {[...byMode].map(([mode, amount]) => (
            <div className='flex justify-between px-4 py-3' key={mode}>
              <span>{PAY_LABEL[mode] ?? mode}</span>
              <span className='tabular-nums'>{formatINR(amount)}</span>
            </div>
          ))}
          {pending.length ? (
            <div className='flex justify-between px-4 py-3 text-amber-800'>
              <span>Not paid yet ({plural(pending.length, 'bill')})</span>
              <span className='tabular-nums'>{formatINR(pending.reduce((n, v) => n + v.total + (v.tip ?? 0), 0))}</span>
            </div>
          ) : null}
          {!byMode.size && !pending.length ? <p className='px-4 py-3 text-muted'>No bills yet today.</p> : null}
        </div>
        {voided ? <p className='mt-2 text-xs text-muted'>{plural(voided, 'void bill')} not counted.</p> : null}
      </section>

      <section className='mt-6'>
        <h2 className='mb-2 font-heading text-xl'>By artist</h2>
        <div className='overflow-hidden rounded-card border border-line bg-surface text-sm'>
          <div className='grid grid-cols-[1fr_auto_auto_auto] gap-x-4 border-b border-line px-4 py-2 text-xs text-muted'>
            <span>Artist</span>
            <span className='text-right'>Visits</span>
            <span className='text-right'>Revenue</span>
            <span className='text-right'>Tips</span>
          </div>
          {[...byArtist].map(([id, a]) => (
            <div className='grid grid-cols-[1fr_auto_auto_auto] gap-x-4 px-4 py-3' key={id}>
              <span className='truncate'>{id === 'none' ? 'No artist' : (name.get(id) ?? 'Former staff')}</span>
              <span className='text-right tabular-nums'>{a.visits}</span>
              <span className='text-right tabular-nums'>{formatINR(a.revenue)}</span>
              <span className='text-right tabular-nums'>{formatINR(a.tips)}</span>
            </div>
          ))}
          {!byArtist.size ? <p className='px-4 py-3 text-muted'>Nothing yet.</p> : null}
        </div>
      </section>

      {pending.length ? (
        <section className='mt-6'>
          <h2 className='mb-2 font-heading text-xl'>Still to collect</h2>
          <ul className='space-y-1 text-sm'>
            {pending.map((v) => (
              <li className='flex justify-between rounded-btn bg-amber-500/10 px-3 py-2' key={v.id}>
                <span>
                  {v.customer?.name ?? v.customer?.phone} · {formatIST(v.createdAt, 'h:mm a', tz)}
                </span>
                <span className='tabular-nums'>{formatINR(v.total + (v.tip ?? 0))}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
