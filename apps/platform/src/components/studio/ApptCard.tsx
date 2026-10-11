import { formatIST, type ID, idOf } from '@salon/core'
import { Badge } from '@salon/ui'
import { AlertTriangle, ImageIcon, StickyNote } from 'lucide-react'
import Link from 'next/link'
import { mediaUrl } from '@/lib/media'
import { ApptActions } from './ApptActions'
import { plural } from './format'

export interface ApptRow {
  id: ID
  start: string
  end: string
  status: string
  source?: string
  notes?: string | null
  preBooked?: boolean | null
  customer: {
    id: ID
    name?: string
    phone: string
    visitCount?: number
    segment?: string
    notes?: string | null
    allergies?: string | null
    isVip?: boolean
  } | null
  staff?: { id: ID; name: string } | ID | null
  services: ({ id: ID; name: string } | ID)[]
  design?: { title: string; images?: unknown[] } | null
  inspiration?: unknown[] | null
}

/** One appointment on Today: who, what, the design and inspiration, notes and allergies, plus actions. */
export const ApptCard = ({
  a,
  slug,
  timezone,
  team,
  manager,
  now,
  showDate,
}: {
  a: ApptRow
  slug: string
  timezone: string
  team: { id: ID; name: string }[]
  manager: boolean
  now: Date
  showDate?: boolean
}) => {
  const base = `/studio/${slug}`
  const past = new Date(a.end).getTime() < now.getTime()
  const c = a.customer
  const name = c?.name ?? c?.phone ?? 'Customer'
  const services = a.services.filter((s): s is { id: ID; name: string } => typeof s === 'object')
  const staff = a.staff && typeof a.staff === 'object' ? a.staff : null
  const designImg = mediaUrl(a.design?.images?.[0], 'thumb')
  const notes = [a.notes, c?.notes].filter(Boolean)
  return (
    <article className='rounded-card border border-line bg-surface p-3' data-testid='appt-card'>
      <div className='flex gap-3'>
        <div className='w-14 shrink-0 text-center'>
          {showDate ? <p className='text-[11px] font-medium text-muted'>{formatIST(a.start, 'EEE d MMM', timezone)}</p> : null}
          <p className='font-heading text-lg leading-tight'>{formatIST(a.start, 'h:mm', timezone)}</p>
          <p className='text-[11px] text-muted'>{formatIST(a.start, 'a', timezone)}</p>
        </div>
        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-center gap-1.5'>
            <Link className='inline-flex min-h-8 items-center font-medium' href={`${base}/customers/${c?.id}`}>
              {name}
            </Link>
            {c?.isVip ? <Badge tone='warning'>VIP</Badge> : null}
            {c && !c.visitCount ? <Badge>First visit</Badge> : c?.visitCount ? <Badge tone='muted'>{plural(c.visitCount, 'visit')}</Badge> : null}
            {a.status === 'completed' ? (
              <Badge tone='success'>Done</Badge>
            ) : a.status === 'requested' ? (
              <Badge tone='warning'>Request</Badge>
            ) : a.status === 'no-show' ? (
              <Badge tone='danger'>No-show</Badge>
            ) : null}
            {a.source === 'walk-in' ? <Badge tone='muted'>Walk-in</Badge> : null}
          </div>
          <p className='text-sm text-muted'>
            {services.map((s) => s.name).join(', ')}
            {staff ? ` · ${staff.name.split(' ')[0]}` : manager ? ' · no artist yet' : ''}
          </p>
        </div>
        {designImg ? <img alt={a.design?.title ?? 'Design'} className='h-14 w-14 shrink-0 rounded-lg object-cover' src={designImg} /> : null}
      </div>

      {c?.allergies ? (
        <p className='mt-2 flex items-start gap-2 rounded-btn bg-red-500/10 px-3 py-2 text-sm font-medium text-red-800' role='alert'>
          <AlertTriangle className='mt-0.5 shrink-0' size={16} /> Allergy: {c.allergies}
        </p>
      ) : null}
      {a.design || a.inspiration?.length ? (
        <div className='mt-2 flex flex-wrap items-center gap-2 text-xs'>
          {a.design ? <span className='font-medium'>Design: {a.design.title}</span> : null}
          {a.inspiration?.length ? (
            <span className='inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-1 text-brand'>
              <ImageIcon size={12} /> {plural(a.inspiration.length, 'inspiration photo')}
            </span>
          ) : null}
        </div>
      ) : null}
      {a.inspiration?.length ? (
        <div className='no-scrollbar mt-2 flex gap-1.5 overflow-x-auto'>
          {a.inspiration.map((m, i) => {
            const src = mediaUrl(m, 'card')
            return src ? (
              <a href={mediaUrl(m, 'large') ?? src} key={i} rel='noopener' target='_blank'>
                <img alt={`Inspiration ${i + 1}`} className='h-16 w-16 shrink-0 rounded-lg object-cover' src={mediaUrl(m, 'thumb') ?? src} />
              </a>
            ) : null
          })}
        </div>
      ) : null}
      {notes.length ? (
        <p className='mt-2 flex items-start gap-2 text-sm text-amber-900'>
          <StickyNote className='mt-0.5 shrink-0' size={14} /> {notes.join(' · ')}
        </p>
      ) : null}
      {a.status !== 'completed' ? (
        <div className='mt-3'>
          <ApptActions
            appt={{
              id: a.id,
              start: a.start,
              end: a.end,
              status: a.status,
              customerName: name,
              serviceIds: a.services.map((s) => idOf(s) as ID),
              staffId: idOf(a.staff),
            }}
            manager={manager}
            past={past}
            slug={slug}
            team={team}
            timezone={timezone}
          />
        </div>
      ) : null}
    </article>
  )
}
