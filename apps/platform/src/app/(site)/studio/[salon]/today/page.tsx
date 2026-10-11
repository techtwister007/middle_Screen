import { DAY_MS, formatINR, formatIST, forTenant, localDate, zonedDateTime } from '@salon/core'
import { actionFeed, ownerSummaryText } from '@salon/modules'
import { buttonClass, Stat } from '@salon/ui'
import { ArrowRight, CalendarDays, CalendarPlus, CreditCard, Moon, Sparkles } from 'lucide-react'
import Link from 'next/link'
import type { Where } from 'payload'
import { ApptCard, type ApptRow } from '@/components/studio/ApptCard'
import { getPayloadClient } from '@/lib/payload'
import { canManage, requireStaff } from '@/lib/staff'
import { teamOf } from '../_lib/team'

export const metadata = { title: 'Today' }

export default async function TodayPage({ params }: { params: Promise<{ salon: string }> }) {
  const { salon: slug } = await params
  const { salon, user } = await requireStaff(slug)
  const manager = canManage(user)
  const payload = await getPayloadClient()
  const repo = forTenant(payload, salon.id)
  const tz = salon.timezone ?? 'Asia/Kolkata'
  const now = new Date()
  const dayStart = zonedDateTime(localDate(now, tz), '00:00', tz)
  const dayEnd = new Date(dayStart.getTime() + DAY_MS)
  const base = `/studio/${slug}`
  // Artists see their own appointments plus requests nobody has taken yet.
  const mine: Where[] = manager ? [] : [{ or: [{ staff: { equals: user.id } }, { staff: { exists: false } }] }]
  const [todayAppts, requests, cards, summary, team] = await Promise.all([
    repo.find<ApptRow & { quotedTotal?: number }>('appointments', {
      where: {
        and: [
          { start: { greater_than_equal: dayStart.toISOString() } },
          { start: { less_than: dayEnd.toISOString() } },
          { status: { not_in: ['cancelled'] } },
          ...mine,
        ],
      },
      sort: 'start',
      depth: 1,
      limit: 100,
    }),
    repo.find<ApptRow>('appointments', {
      where: { and: [{ status: { equals: 'requested' } }, { start: { greater_than_equal: dayEnd.toISOString() } }, ...mine] },
      sort: 'start',
      depth: 1,
      limit: 20,
    }),
    manager ? actionFeed(payload, salon.id, base, now) : Promise.resolve([]),
    manager ? ownerSummaryText(payload, salon.id, now) : Promise.resolve(''),
    teamOf(payload, salon.id, { bookableOnly: true }),
  ])
  const done = todayAppts.docs.filter((a) => a.status === 'completed').length
  const expected = todayAppts.docs.reduce((n, a) => n + (a.quotedTotal ?? 0), 0)
  const hour = Number(formatIST(now, 'H', tz))
  const teamChips = team.map((t) => ({ id: t.id, name: t.name }))

  return (
    <div>
      <p className='text-sm text-muted'>{formatIST(now, 'EEEE d MMMM', tz)}</p>
      <h1 className='font-heading text-3xl'>
        Good {hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'}, {user.name.split(' ')[0]}
      </h1>
      {summary ? <p className='mt-1 text-sm text-muted'>{summary}</p> : null}

      <div className='mt-5 grid grid-cols-3 gap-2'>
        <Stat hint='appointments' label='Today' value={todayAppts.docs.length} />
        <Stat label='Done' value={done} />
        <Stat label='Expected' value={formatINR(expected)} />
      </div>

      <div className='mt-4 grid grid-cols-3 gap-2'>
        <Link className={buttonClass('primary', 'md', 'h-auto min-h-14 flex-col gap-1 px-2 py-2 text-xs')} href={`${base}/checkout`}>
          <CreditCard size={18} /> Walk-in checkout
        </Link>
        <Link className={buttonClass('secondary', 'md', 'h-auto min-h-14 flex-col gap-1 px-2 py-2 text-xs')} href={`${base}/appointments/new`}>
          <CalendarPlus size={18} /> Add appointment
        </Link>
        <Link className={buttonClass('secondary', 'md', 'h-auto min-h-14 flex-col gap-1 px-2 py-2 text-xs')} href={`${base}/calendar`}>
          <CalendarDays size={18} /> Calendar
        </Link>
      </div>

      {manager && hour >= 18 ? (
        <Link className='mt-4 flex min-h-14 items-center gap-3 rounded-card border border-brand/40 bg-brand/5 p-4' href={`${base}/today/close`}>
          <Moon className='text-brand' size={20} />
          <span className='flex-1'>
            <span className='block font-medium'>Close the day</span>
            <span className='text-sm text-muted'>Revenue by payment mode, tips and cash to count</span>
          </span>
          <ArrowRight className='text-brand' size={16} />
        </Link>
      ) : null}

      {cards.length ? (
        <section className='mt-8'>
          <h2 className='mb-3 flex items-center gap-2 font-heading text-xl'>
            <Sparkles className='text-brand' size={18} /> To do today
          </h2>
          <div className='space-y-2'>
            {cards.map((c) => (
              <Link
                className='flex items-center gap-3 rounded-card border border-line bg-surface p-4 transition hover:border-brand/40'
                href={c.action.href}
                key={c.key}
              >
                <div className='flex-1'>
                  <p className='font-medium'>{c.title}</p>
                  {c.detail ? <p className='text-sm text-muted'>{c.detail}</p> : null}
                </div>
                <span className='flex items-center gap-1 text-sm font-medium text-brand'>
                  {c.action.label} <ArrowRight size={14} />
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className='mt-8'>
        <div className='mb-3 flex items-center justify-between'>
          <h2 className='font-heading text-xl'>Schedule</h2>
          {manager ? (
            <Link className='inline-flex min-h-11 items-center text-sm text-brand' href={`${base}/today/close`}>
              Day summary
            </Link>
          ) : null}
        </div>
        {todayAppts.docs.length ? (
          <div className='space-y-2'>
            {todayAppts.docs.map((a) => (
              <ApptCard a={a} key={String(a.id)} manager={manager} now={now} slug={slug} team={teamChips} timezone={tz} />
            ))}
          </div>
        ) : (
          <p className='rounded-card border border-dashed border-line p-6 text-center text-sm text-muted'>No appointments today yet.</p>
        )}
      </section>

      {requests.docs.length ? (
        <section className='mt-8' id='requests'>
          <h2 className='mb-3 font-heading text-xl'>Requests to confirm</h2>
          <div className='space-y-2'>
            {requests.docs.map((a) => (
              <ApptCard a={a} key={String(a.id)} manager={manager} now={now} showDate slug={slug} team={teamChips} timezone={tz} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
