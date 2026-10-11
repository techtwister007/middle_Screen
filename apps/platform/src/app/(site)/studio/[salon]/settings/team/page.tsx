import { forTenant, type ID, publicUrl } from '@salon/core'
import Link from 'next/link'
import { ActionForm } from '@/components/studio/ActionForm'
import { Field, inputClass } from '@/components/studio/Field'
import { FlagButton } from '@/components/studio/FlagButton'
import { plural } from '@/components/studio/format'
import { getPayloadClient } from '@/lib/payload'
import { requireStaff } from '@/lib/staff'
import { addTeamMember, setMemberFlags } from '../actions'

export const metadata = { title: 'Team & hours' }

interface Member {
  id: ID
  name: string
  email: string
  role: string
  bookable?: boolean | null
  active?: boolean | null
}

const ROLE_LABEL: Record<string, string> = { owner: 'Owner', manager: 'Manager', artist: 'Artist', 'platform-admin': 'Support' }

export default async function TeamPage({ params }: { params: Promise<{ salon: string }> }) {
  const { salon: slug } = await params
  const { salon } = await requireStaff(slug, { manager: true })
  const payload = await getPayloadClient()
  const team = (
    await payload.find({ collection: 'users', overrideAccess: true, depth: 0, limit: 100, sort: 'name', where: { 'tenants.tenant': { equals: salon.id } } })
  ).docs as unknown as Member[]
  const availability = (
    await forTenant(payload, salon.id).find<{ staff: ID; weekly?: { day: string; off?: boolean }[]; timeOff?: { from: string; to: string }[] }>(
      'availability',
      { limit: 100, depth: 0 },
    )
  ).docs
  const byStaff = new Map(availability.map((a) => [String(a.staff), a]))
  const now = Date.now()
  const salonDays = salon.hours?.length ? salon.hours.filter((h) => !h.closed).length : 7
  return (
    <div>
      <Link className='text-sm text-brand' href={`/studio/${slug}/settings`}>
        ← More
      </Link>
      <h1 className='mt-3 font-heading text-3xl'>Team & hours</h1>
      <details className='mt-6 rounded-card border border-dashed border-brand bg-surface p-4'>
        <summary className='flex min-h-11 cursor-pointer items-center font-medium text-brand'>+ Add a team member</summary>
        <p className='mb-4 mt-2 text-sm text-muted'>
          They get their own sign-in. Artists see the schedule, checkout and photo corner; managers see everything.
        </p>
        <ActionForm
          action={addTeamMember.bind(null, slug)}
          secretShare={{ intro: `Your ${salon.name} Studio sign-in (open ${publicUrl()}/studio/login)`, phoneField: 'phone' }}
          submit='Add to team'
        >
          <div className='grid gap-3 sm:grid-cols-2'>
            <Field label='Name'>
              <input className={inputClass} name='name' required />
            </Field>
            <Field label='Email (for sign-in)'>
              <input className={inputClass} name='email' required type='email' />
            </Field>
            <Field hint='To send their password on WhatsApp' label='Phone'>
              <input className={inputClass} inputMode='tel' name='phone' />
            </Field>
            <Field label='Role'>
              <select className={inputClass} defaultValue='artist' name='role'>
                <option value='artist'>Artist</option>
                <option value='manager'>Manager</option>
              </select>
            </Field>
          </div>
        </ActionForm>
      </details>

      <div className='mt-6 divide-y divide-line rounded-card border border-line bg-surface'>
        {team.map((m) => {
          const a = byStaff.get(String(m.id))
          // No stored weekly hours means they follow the salon's hours.
          const days = a?.weekly?.length ? a.weekly.filter((w) => !w.off).length : salonDays
          const away = a?.timeOff?.find((t) => new Date(t.to).getTime() >= now)
          return (
            <div className='flex flex-wrap items-center justify-between gap-3 px-4 py-3' key={String(m.id)}>
              <div className={m.active === false ? 'opacity-50' : ''}>
                <p className='font-medium'>
                  {m.name} <span className='text-xs font-normal text-muted'>{ROLE_LABEL[m.role] ?? m.role}</span>
                </p>
                <p className='text-xs text-muted'>
                  {m.email}
                  {m.role !== 'manager' ? ` · ${plural(days, 'day')} a week${a?.weekly?.length ? '' : ' (salon hours)'}` : ''}
                  {away ? ` · away ${new Date(away.from).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })}` : ''}
                </p>
              </div>
              <div className='flex flex-wrap gap-1.5'>
                {m.role === 'artist' || m.role === 'owner' ? (
                  <Link
                    className='inline-flex min-h-11 items-center rounded-btn border border-line px-3 text-xs hover:border-brand'
                    href={`/studio/${slug}/me?staff=${m.id}`}
                  >
                    Stats
                  </Link>
                ) : null}
                <Link
                  className='inline-flex min-h-11 items-center rounded-btn border border-line px-3 text-xs hover:border-brand'
                  href={`/studio/${slug}/settings/team/${m.id}`}
                >
                  Hours & time off
                </Link>
                <FlagButton run={setMemberFlags.bind(null, slug, m.id, { bookable: !m.bookable })}>{m.bookable ? 'Bookable ✓' : 'Not bookable'}</FlagButton>
                {m.role !== 'owner' ? (
                  <FlagButton
                    confirm={m.active === false ? undefined : `${m.name} won't be able to sign in. Their history stays.`}
                    run={setMemberFlags.bind(null, slug, m.id, { active: m.active === false })}
                  >
                    {m.active === false ? 'Reactivate' : 'Deactivate'}
                  </FlagButton>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
