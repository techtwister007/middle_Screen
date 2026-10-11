import Link from 'next/link'
import { ActionForm } from '@/components/studio/ActionForm'
import { Field, inputClass } from '@/components/studio/Field'
import { requireStaff } from '@/lib/staff'
import { saveRules } from '../actions'

export const metadata = { title: 'Rules & automatic messages' }

type N = [key: string, label: string, hint?: string]

const SECTIONS: { title: string; body: string; fields: N[] }[] = [
  {
    title: 'Booking',
    body: 'How customers book in the app.',
    fields: [
      ['slotStepMinutes', 'Slot gap (minutes)', 'Start times are offered every this many minutes'],
      ['bookingHorizonDays', 'Book up to (days ahead)'],
      ['depositMinMinutes', 'Deposit for services of (minutes) or longer'],
      ['depositPercent', 'Deposit (%)', 'Paid online when booking; settles in your account'],
    ],
  },
  {
    title: 'Rewards',
    body: 'What customers earn. Rewards are paid from your discount budget so they never eat your margin.',
    fields: [
      ['pointsPer100', 'Points per ₹100 spent'],
      ['stampsForReward', 'Visits for a free reward'],
      ['silverAfterVisits', 'Silver after (visits)'],
      ['goldAfterVisits', 'Gold after (visits)'],
      ['discountBudgetPercent', 'Monthly discount budget (% of revenue)'],
    ],
  },
  {
    title: 'Automatic messages',
    body: 'When the app messages customers on WhatsApp. Reminders always go; offers only to customers who agreed.',
    fields: [
      ['reviewDelayHours', 'Ask for a rating after (hours)'],
      ['aftercareDays', 'Aftercare check-in after (days)'],
      ['refillHeadsUpDays', 'Refill reminder (days before due)'],
      ['nudgeDays', 'Gentle nudge (days overdue)'],
      ['winbackDays', 'Win-back offer (days overdue)'],
      ['lastChanceDays', 'Last try (days overdue)'],
      ['promoPerWeek', 'Max offers per customer per week', 'At most 3'],
      ['promoPerMonth', 'Max offers per customer per month'],
      ['dailySummaryHour', 'Your daily WhatsApp summary at (hour, 0–23)'],
    ],
  },
]

export default async function RulesPage({ params }: { params: Promise<{ salon: string }> }) {
  const { salon: slug } = await params
  const { salon } = await requireStaff(slug, { manager: true })
  const s = (salon.settings ?? {}) as Record<string, unknown>
  return (
    <div>
      <Link className='text-sm text-brand' href={`/studio/${slug}/settings`}>
        ← More
      </Link>
      <h1 className='mt-3 font-heading text-3xl'>Rules & automatic messages</h1>
      <ActionForm action={saveRules.bind(null, slug)} className='mt-6' submit='Save rules'>
        {SECTIONS.map((sec) => (
          <section className='space-y-3 rounded-card border border-line bg-surface p-4' key={sec.title}>
            <h2 className='font-heading text-xl'>{sec.title}</h2>
            <p className='text-sm text-muted'>{sec.body}</p>
            {sec.title === 'Booking' ? (
              <label className='flex items-center gap-2 text-sm'>
                <input defaultChecked={Boolean(s.autoConfirmBookings)} name='autoConfirmBookings' type='checkbox' /> Confirm bookings automatically (otherwise
                you confirm each one from Today)
              </label>
            ) : null}
            <div className='grid gap-3 sm:grid-cols-2'>
              {sec.fields.map(([key, label, hint]) => (
                <Field hint={hint} key={key} label={label}>
                  <input className={inputClass} defaultValue={s[key] == null ? '' : String(s[key])} min={0} name={key} type='number' />
                </Field>
              ))}
            </div>
            {sec.title === 'Booking' ? (
              <Field hint='Shown to customers before they confirm' label='Cancellation policy'>
                <textarea className={`${inputClass} h-20 py-2`} defaultValue={String(s.cancellationPolicy ?? '')} name='cancellationPolicy' />
              </Field>
            ) : null}
            {sec.title === 'Automatic messages' ? (
              <Field hint='Happy customers (4–5 stars) get this link. Everyone can still review; we never hide it.' label='Google review link'>
                <input className={inputClass} defaultValue={String(s.googleReviewUrl ?? '')} name='googleReviewUrl' type='url' />
              </Field>
            ) : null}
          </section>
        ))}
      </ActionForm>
    </div>
  )
}
