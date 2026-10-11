'use client'
import { formatINR } from '@salon/core'
import { Input, Label } from '@salon/ui'
import { useState } from 'react'

/** The sales ROI calculator (DEMO.md section 6): the owner's own numbers, conservative assumptions they can change. */
export const RoiCalculator = ({ salonName }: { salonName: string }) => {
  const [customers, setCustomers] = useState(120)
  const [bill, setBill] = useState(1400)
  const [returning, setReturning] = useState(40)
  const [plan, setPlan] = useState(999)
  const [lift, setLift] = useState(5)
  const [friends, setFriends] = useState(2)
  const [dmSaves, setDmSaves] = useState(2)
  const extraReturn = Math.round((customers * lift) / 100)
  const rows = [
    { label: `More customers come back (+${lift} points of ${returning}% returning)`, visits: extraReturn },
    { label: 'Friends referred who visit', visits: friends },
    { label: 'Bookings from people who gave up waiting for a DM reply', visits: dmSaves },
  ]
  const totalVisits = rows.reduce((n, r) => n + r.visits, 0)
  const extra = totalVisits * bill * 100
  const cost = plan * 100
  const field = (id: string, label: string, value: number, set: (n: number) => void, suffix = '') => (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className='flex items-center gap-2'>
        <Input id={id} inputMode='numeric' onChange={(e) => set(Number(e.target.value || 0))} value={value} />
        {suffix ? <span className='text-sm text-muted'>{suffix}</span> : null}
      </div>
    </div>
  )
  return (
    <div className='grid gap-8 md:grid-cols-2'>
      <div className='space-y-4'>
        <p className='text-sm text-muted'>Ask, don't guess. These are {salonName}'s numbers.</p>
        {field('c', 'Customers per month', customers, setCustomers)}
        {field('b', 'Average bill (₹)', bill, setBill)}
        {field('r', 'Share who come back within 6 weeks today', returning, setReturning, '%')}
        {field('p', 'Monthly plan (₹)', plan, setPlan)}
        <p className='pt-2 text-xs font-semibold uppercase tracking-wider text-muted'>Assumptions (conservative, adjust freely)</p>
        {field('l', 'Extra returning customers', lift, setLift, 'percentage points')}
        {field('f', 'Friends referred per month', friends, setFriends)}
        {field('d', 'Bookings saved from slow DM replies', dmSaves, setDmSaves)}
      </div>
      <div className='space-y-4'>
        <div className='divide-y divide-line rounded-card border border-line bg-surface text-sm'>
          {rows.map((r) => (
            <div className='flex justify-between gap-4 px-4 py-3' key={r.label}>
              <span>{r.label}</span>
              <span className='whitespace-nowrap tabular-nums'>
                {r.visits} visits · {formatINR(r.visits * bill * 100)}
              </span>
            </div>
          ))}
        </div>
        <div className='rounded-card bg-brand p-6 text-on-brand'>
          <p className='text-sm opacity-85'>Extra revenue per month</p>
          <p className='font-heading text-5xl tabular-nums'>{formatINR(extra)}</p>
          <p className='mt-2 text-sm opacity-85'>
            Plan {formatINR(cost)} · about {cost ? Math.round((extra / cost) * 10) / 10 : 0}× the cost
          </p>
        </div>
        <p className='rounded-card bg-tint p-4 font-heading text-xl'>
          "One refill at {formatINR(bill * 100)} pays for the whole month. Everything else is profit."
        </p>
        <p className='text-xs text-muted'>If the numbers don't work for this salon, say so. An honest no beats a cancellation in month two.</p>
      </div>
    </div>
  )
}
