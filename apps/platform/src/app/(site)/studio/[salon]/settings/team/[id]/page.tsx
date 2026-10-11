import { forTenant, type ID } from '@salon/core'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ActionForm } from '@/components/studio/ActionForm'
import { DayHoursRow } from '@/components/studio/DayHours'
import { Field, inputClass } from '@/components/studio/Field'
import { getPayloadClient } from '@/lib/payload'
import { canManage, requireStaff } from '@/lib/staff'
import { saveHours } from '../../actions'

export const metadata = { title: 'Hours & time off' }

const DAYS: [string, string][] = [
  ['mon', 'Monday'],
  ['tue', 'Tuesday'],
  ['wed', 'Wednesday'],
  ['thu', 'Thursday'],
  ['fri', 'Friday'],
  ['sat', 'Saturday'],
  ['sun', 'Sunday'],
]

const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })

export default async function HoursPage({ params }: { params: Promise<{ salon: string; id: string }> }) {
  const { salon: slug, id } = await params
  const { salon, user } = await requireStaff(slug)
  // Artists can only see their own hours: send them there instead of a dead end.
  if (!canManage(user) && String(user.id) !== id) redirect(`/studio/${slug}/settings/team/${user.id}`)
  const payload = await getPayloadClient()
  const member = (await payload.findByID({ collection: 'users', id, overrideAccess: true, depth: 0, disableErrors: true })) as unknown as {
    id: ID
    name: string
    tenants?: { tenant: ID }[]
  } | null
  if (!member?.tenants?.some((t) => String(t.tenant) === String(salon.id))) notFound()
  const a = await forTenant(payload, salon.id).findOne<{
    weekly?: { day: string; start?: string; end?: string; off?: boolean }[]
    timeOff?: { from: string; to: string; reason?: string }[]
  }>('availability', { staff: { equals: member.id } })
  const weekly = new Map((a?.weekly ?? []).map((w) => [w.day, w]))
  const salonHours = new Map((salon.hours ?? []).map((h) => [h.day, h]))
  const upcoming = (a?.timeOff ?? []).map((t, i) => ({ ...t, i })).filter((t) => new Date(t.to).getTime() >= Date.now() - 86_400_000)
  const today = new Date().toISOString().slice(0, 10)
  return (
    <div>
      <Link className='text-sm text-brand' href={canManage(user) ? `/studio/${slug}/settings/team` : `/studio/${slug}/settings`}>
        ← {canManage(user) ? 'Team' : 'More'}
      </Link>
      <h1 className='mt-3 font-heading text-3xl'>{member.name.split(' ')[0]}'s hours</h1>
      <p className='mt-1 text-sm text-muted'>Customers can only book times inside these hours.</p>
      <ActionForm action={saveHours.bind(null, slug)} className='mt-6' sticky submit='Save hours'>
        <input name='staff' type='hidden' value={String(member.id)} />
        <section className='space-y-3 rounded-card border border-line bg-surface p-2.5 sm:p-4'>
          <input name='hours_v2' type='hidden' value='1' />
          {DAYS.map(([day, label]) => {
            const w = weekly.get(day)
            const salonDay = salonHours.get(day)
            // No stored hours yet: start from the salon's own hours.
            const working = w ? !w.off : !salonDay?.closed
            return (
              <DayHoursRow
                day={day}
                end={w?.end ?? salonDay?.close ?? '20:00'}
                key={day}
                label={label}
                names={{ open: `working_${day}`, start: `start_${day}`, end: `end_${day}` }}
                open={working}
                openLabel='Working'
                start={w?.start ?? salonDay?.open ?? '10:00'}
              />
            )
          })}
        </section>
        <section className='space-y-3 rounded-card border border-line bg-surface p-4'>
          <h2 className='font-heading text-xl'>Time off</h2>
          {upcoming.length ? (
            <ul className='space-y-1 text-sm'>
              {upcoming.map((t) => (
                <li key={t.i}>
                  {fmt(t.from)}
                  {fmt(t.from) !== fmt(t.to) ? ` – ${fmt(t.to)}` : ''} {t.reason ? <span className='text-muted'>· {t.reason}</span> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className='text-sm text-muted'>No time off planned.</p>
          )}
          <div className='grid gap-3 sm:grid-cols-2'>
            <Field label='Add time off from'>
              <input className={inputClass} min={today} name='offFrom' type='date' />
            </Field>
            <Field label='to'>
              <input className={inputClass} min={today} name='offTo' type='date' />
            </Field>
          </div>
          <Field label='Reason (optional)'>
            <input className={inputClass} name='offReason' placeholder='Family wedding' />
          </Field>
        </section>
      </ActionForm>
    </div>
  )
}
