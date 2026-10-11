import { DAY_MS, formatINR, PLAN_PRICES } from '@salon/core'
import { insights, roiStory } from '@salon/modules'
import { cn, Stat } from '@salon/ui'
import Link from 'next/link'
import { BarList } from '@/components/studio/BarList'
import { getPayloadClient } from '@/lib/payload'
import { requireFeature } from '@/lib/salon'
import { requireStaff } from '@/lib/staff'

export const metadata = { title: 'Insights' }

const SOURCE_LABEL: Record<string, string> = {
  instagram: 'Instagram',
  qr: 'QR codes',
  whatsapp: 'WhatsApp',
  referral: 'Friend referrals',
  google: 'Google',
  'walk-in': 'Walk-in',
  reminder: 'Reminders',
  app: 'App',
  contest: 'Contest',
  chair: 'Pre-booked in chair',
  staff: 'Booked by staff',
}

export default async function InsightsPage({ params, searchParams }: { params: Promise<{ salon: string }>; searchParams: Promise<{ days?: string }> }) {
  const { salon: slug } = await params
  const sp = await searchParams
  const { salon } = await requireStaff(slug, { manager: true })
  requireFeature(salon, 'reports')
  const days = [7, 30, 90].includes(Number(sp.days)) ? Number(sp.days) : 30
  const payload = await getPayloadClient()
  const range = { from: new Date(Date.now() - days * DAY_MS), to: new Date() }
  const [i, roi] = await Promise.all([
    insights(payload, salon.id, range),
    roiStory(payload, salon.id, range, Math.round(((PLAN_PRICES[salon.plan] ?? 99900) * days) / 30)),
  ])
  const base = `/studio/${slug}`
  const insightLines = [
    i.firstToSecondCohort ? `${i.firstToSecondRate}% of first-time customers came back for a second visit.` : null,
    i.repeatRate ? `${i.repeatRate}% of visits were from returning customers.` : null,
    roi.repeatFromReminders ? `${roi.repeatFromReminders} customers came back within 3 weeks of a reminder.` : null,
    i.noShowRate > 5 ? `No-shows are at ${i.noShowRate}%. Deposits on long services can bring this down.` : null,
  ].filter(Boolean)
  return (
    <div>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <h1 className='font-heading text-3xl'>Insights</h1>
        <div className='flex gap-1 rounded-full border border-line bg-surface p-1'>
          {[7, 30, 90].map((d) => (
            <Link
              className={cn('inline-flex min-h-10 items-center rounded-full px-3 text-sm', d === days ? 'bg-brand text-on-brand' : 'text-muted')}
              href={`${base}/insights?days=${d}`}
              key={d}
            >
              {d} days
            </Link>
          ))}
        </div>
      </div>

      <section className='mt-6 rounded-card bg-brand p-6 text-on-brand'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <p className='text-xs font-semibold uppercase tracking-widest opacity-80'>Visits we can count</p>
          {salon.status === 'demo' ? (
            <span className='rounded-full bg-on-brand px-3 py-1 text-xs font-semibold text-brand' data-testid='sample-data'>
              Sample data
            </span>
          ) : null}
        </div>
        <p className='mt-2 font-heading text-5xl tabular-nums'>{formatINR(roi.revenueInfluenced)}</p>
        <p className='mt-1 text-sm opacity-85'>
          from customers who came back after a reminder, came via a friend or booked from an offer in the last {days} days
          {roi.multiple ? `: about ${roi.multiple}× what the platform and messages cost` : ''}.
        </p>
        <div className='mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4'>
          <div>
            <p className='font-heading text-2xl'>{roi.bookingsViaApp}</p>
            <p className='opacity-80'>visits booked online</p>
          </div>
          <div>
            <p className='font-heading text-2xl'>{roi.repeatFromReminders}</p>
            <p className='opacity-80'>came back after a reminder</p>
          </div>
          <div>
            <p className='font-heading text-2xl'>{roi.newFromReferrals}</p>
            <p className='opacity-80'>came via a friend</p>
          </div>
          <div>
            <p className='font-heading text-2xl'>{roi.taggedPosts}</p>
            <p className='opacity-80'>customer posts</p>
          </div>
        </div>
      </section>

      {insightLines.length ? (
        <ul className='mt-5 space-y-1 text-sm'>
          {insightLines.map((l) => (
            <li key={l}>• {l}</li>
          ))}
        </ul>
      ) : null}

      <div className='mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4'>
        <Stat label='Revenue' value={formatINR(i.revenue)} />
        <Stat label='Visits' value={i.visits} />
        <Stat label='Average bill' value={formatINR(i.averageBill)} />
        <Stat label='New customers' value={i.newCustomers} />
        <Stat label='2nd-visit rate' value={`${i.firstToSecondRate}%`} hint={`of ${i.firstToSecondCohort} first-timers`} />
        <Stat label='Repeat visits' value={`${i.repeatRate}%`} />
        <Stat label='No-shows' value={`${i.noShowRate}%`} />
        <Stat label='Avg rating' value={i.averageRating ?? '—'} hint={`${i.ratings} ratings`} />
      </div>

      <div className='mt-8 grid gap-6 md:grid-cols-2'>
        <section className='rounded-card border border-line bg-surface p-5'>
          <h2 className='mb-4 font-heading text-xl'>Where bookings came from</h2>
          <BarList
            format={(v) => String(v)}
            rows={Object.entries(i.bookingsBySource)
              .sort((a, b) => b[1] - a[1])
              .map(([k, v]) => ({ label: SOURCE_LABEL[k] ?? k, value: v }))}
          />
        </section>
        <section className='rounded-card border border-line bg-surface p-5'>
          <h2 className='mb-4 font-heading text-xl'>Revenue by service</h2>
          <BarList format={formatINR} rows={i.revenueByService.slice(0, 8).map((r) => ({ label: r.name, value: r.revenue }))} />
        </section>
        <section className='rounded-card border border-line bg-surface p-5'>
          <h2 className='mb-4 font-heading text-xl'>Revenue by artist</h2>
          <BarList format={formatINR} rows={i.revenueByStaff.map((r) => ({ label: `${r.name} (${r.visits})`, value: r.revenue }))} />
        </section>
        <section className='rounded-card border border-line bg-surface p-5 text-sm'>
          <h2 className='mb-4 font-heading text-xl'>Spend & messages</h2>
          <p className='flex justify-between py-1'>
            <span>Discounts given</span>
            <span className='tabular-nums'>{formatINR(i.discountSpend)}</span>
          </p>
          <p className='flex justify-between py-1'>
            <span>WhatsApp messages sent</span>
            <span className='tabular-nums'>{i.messagesSent}</span>
          </p>
          <p className='flex justify-between py-1'>
            <span>Message cost (pass-through)</span>
            <span className='tabular-nums'>{formatINR(i.messageCost)}</span>
          </p>
          <p className='flex justify-between py-1'>
            <span>Friends who visited</span>
            <span className='tabular-nums'>{i.referralsConverted}</span>
          </p>
          <p className='flex justify-between py-1'>
            <span>Cancellation rate</span>
            <span className='tabular-nums'>{i.cancellationRate}%</span>
          </p>
        </section>
      </div>
    </div>
  )
}
