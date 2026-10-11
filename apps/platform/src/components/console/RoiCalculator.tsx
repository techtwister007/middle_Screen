'use client'
import { formatINR } from '@salon/core'
import { cn, Input, Label } from '@salon/ui'
import { useState } from 'react'

type PlanKey = 'starter' | 'studio' | 'growth'
interface Plan {
  key: PlanKey
  label: string
  monthly: number
  setup: number
  qr: string | null
}

/** The sales ROI calculator (DEMO.md §6–§8): the owner's own numbers, conservative assumptions they can change, then the price. */
export const RoiCalculator = ({
  salonName,
  defaultBill,
  defaultPlan,
  plans,
  placesLeft,
  upiReady,
}: {
  salonName: string
  defaultBill: number
  defaultPlan: PlanKey
  plans: Plan[]
  placesLeft: number
  upiReady: boolean
}) => {
  const [customers, setCustomers] = useState(120)
  const [bill, setBill] = useState(defaultBill)
  const [returning, setReturning] = useState(40)
  const [lift, setLift] = useState(5)
  const [friends, setFriends] = useState(2)
  const [dmSaves, setDmSaves] = useState(2)
  const [planKey, setPlanKey] = useState<PlanKey>(defaultPlan)
  const [reveal, setReveal] = useState(false)
  const plan = plans.find((p) => p.key === planKey) ?? plans[0]
  // You can't bring back more people than currently don't return.
  const effectiveLift = Math.max(0, Math.min(lift, 100 - returning))
  const extraReturn = Math.round((customers * effectiveLift) / 100)
  const rows = [
    { label: `More customers come back (${returning}% → ${returning + effectiveLift}% returning)`, visits: extraReturn },
    { label: 'Friends referred who visit', visits: friends },
    { label: 'Bookings from people who gave up waiting for a DM reply', visits: dmSaves },
  ]
  const totalVisits = rows.reduce((n, r) => n + r.visits, 0)
  const extra = totalVisits * bill * 100
  const cost = plan.monthly
  const field = (id: string, label: string, value: number, set: (n: number) => void, suffix = '', max?: number) => (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className='flex items-center gap-2'>
        <Input
          id={id}
          inputMode='numeric'
          max={max}
          min={0}
          onChange={(e) => set(Math.max(0, Math.min(max ?? Number.POSITIVE_INFINITY, Number(e.target.value.replace(/\D/g, '') || 0))))}
          value={value}
        />
        {suffix ? <span className='shrink-0 text-sm text-muted'>{suffix}</span> : null}
      </div>
    </div>
  )
  return (
    <div className='space-y-10'>
      <div className='grid gap-8 md:grid-cols-2'>
        <div className='space-y-4'>
          <p className='text-sm text-muted'>Ask, don't guess. These are {salonName}'s numbers.</p>
          {field('c', 'Customers per month', customers, setCustomers)}
          {field('b', 'Average bill (₹)', bill, setBill)}
          {field('r', 'Share who come back within 6 weeks today', returning, setReturning, '%', 100)}
          <p className='pt-2 text-xs font-semibold uppercase tracking-wider text-muted'>Assumptions (conservative, adjust freely)</p>
          {field('l', 'Extra returning customers', lift, setLift, 'percentage points', 100)}
          {field('f', 'Friends referred per month', friends, setFriends)}
          {field('d', 'Bookings saved from slow DM replies', dmSaves, setDmSaves)}
        </div>
        <div className='space-y-4'>
          <div className='divide-y divide-line rounded-card border border-line bg-surface text-sm'>
            {rows.map((r) => (
              <div className='flex justify-between gap-4 px-4 py-3' key={r.label}>
                <span>{r.label}</span>
                <span className='whitespace-nowrap tabular-nums'>
                  {r.visits} visit{r.visits === 1 ? '' : 's'} · {formatINR(r.visits * bill * 100)}
                </span>
              </div>
            ))}
          </div>
          <div className='rounded-card bg-brand p-6 text-on-brand'>
            <p className='text-sm opacity-85'>Extra revenue per month</p>
            <p className='font-heading text-5xl tabular-nums'>{formatINR(extra)}</p>
            <p className='mt-2 text-sm opacity-85'>
              {plan.label} plan {formatINR(cost)}/month · about {cost ? Math.round((extra / cost) * 10) / 10 : 0}× the cost
            </p>
          </div>
          <p className='rounded-card bg-tint p-4 font-heading text-xl'>
            "One refill at {formatINR(bill * 100)} pays for{' '}
            {bill * 100 >= cost ? 'the whole month' : `${Math.round(((bill * 100) / cost) * 100)}% of the month`}. Everything else is profit."
          </p>
          <p className='text-xs text-muted'>If the numbers don't work for this salon, say so. An honest no beats a cancellation in month two.</p>
        </div>
      </div>

      <section>
        {!reveal ? (
          <button className='min-h-12 w-full rounded-card border border-dashed border-brand text-brand' onClick={() => setReveal(true)} type='button'>
            Show plans & pricing
          </button>
        ) : (
          <div className='space-y-6'>
            <div className='grid gap-3 md:grid-cols-3'>
              {plans.map((p) => (
                <button
                  aria-pressed={planKey === p.key}
                  className={cn(
                    'rounded-card border p-5 text-left transition',
                    planKey === p.key ? 'border-brand ring-2 ring-brand/30' : 'border-line bg-surface hover:border-brand',
                  )}
                  key={p.key}
                  onClick={() => setPlanKey(p.key)}
                  type='button'
                >
                  <p className='font-medium'>
                    {p.label} {p.key === 'studio' ? <span className='text-xs text-brand'>recommended</span> : null}
                  </p>
                  <p className='mt-1 font-heading text-3xl'>
                    {formatINR(p.monthly)}
                    <span className='text-sm text-muted'>/month</span>
                  </p>
                  <p className='text-sm text-muted'>Setup {formatINR(p.setup)}</p>
                </button>
              ))}
            </div>
            <div className='grid gap-6 rounded-card border border-line bg-surface p-5 md:grid-cols-[1fr_auto]'>
              <div className='space-y-2 text-sm'>
                <p className='font-medium'>Founding salon offer {placesLeft ? `· ${placesLeft} of 10 places left` : '· all places taken'}</p>
                {placesLeft ? (
                  <ul className='list-disc space-y-1 pl-5 text-muted'>
                    <li>Price locked for life</li>
                    <li>Free QR kit, mirror stickers, aftercare cards and photo-corner prop</li>
                    <li>Live within 48 hours of your menu and photos, or the setup fee is refunded</li>
                  </ul>
                ) : null}
                <p className='text-muted'>Cancel any month. No lock-in, and your customer data is yours to export.</p>
                <p className='text-muted'>WhatsApp messages are charged at Meta's rates, passed through at cost and shown every month.</p>
              </div>
              <figure className='text-center'>
                {plan.qr ? (
                  <img alt={`UPI QR for the ${plan.label} setup fee`} className='mx-auto h-44 w-44 rounded-lg border border-line' src={plan.qr} />
                ) : (
                  <div className='flex h-44 w-44 items-center justify-center rounded-lg border border-dashed border-line p-3 text-xs text-muted'>
                    {upiReady ? '' : 'Set PLATFORM_UPI_VPA to show the setup-fee UPI QR'}
                  </div>
                )}
                <figcaption className='mt-2 text-sm'>
                  Setup fee {formatINR(plan.setup)} · {plan.label}
                </figcaption>
              </figure>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
