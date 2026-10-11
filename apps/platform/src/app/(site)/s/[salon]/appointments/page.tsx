import { formatIST } from '@salon/core'
import { Badge, buttonClass, EmptyState } from '@salon/ui'
import { CalendarDays, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { translator } from '@/lib/i18n'
import { getLang } from '@/lib/lang'
import { currentCustomer, loadSalon, repoFor, requireCustomer } from '@/lib/site'
import { STATUS_TONE } from '../_lib/status'

export async function generateMetadata({ params }: { params: Promise<{ salon: string }> }) {
  const { salon: slug } = await params
  const salon = await loadSalon(slug)
  return { title: translator(await getLang((await currentCustomer(salon))?.language))('myAppointments') }
}

interface Row {
  id: string
  start: string
  status: string
  staff?: { name?: string } | string | null
  services: ({ name: string } | string)[]
}

/** All of a customer's appointments: upcoming first (soonest on top), then past (latest on top). */
export default async function AppointmentsPage({ params }: { params: Promise<{ salon: string }> }) {
  const { salon: slug } = await params
  const salon = await loadSalon(slug)
  const customer = await requireCustomer(salon, `/s/${slug}/appointments`)
  const tr = translator(await getLang(customer.language))
  const repo = await repoFor(salon)
  const tz = salon.timezone ?? 'Asia/Kolkata'
  const base = `/s/${slug}`
  const now = new Date().toISOString()
  const [upcoming, past] = await Promise.all([
    repo.find<Row>('appointments', {
      where: { and: [{ customer: { equals: customer.id } }, { start: { greater_than: now } }, { status: { in: ['requested', 'confirmed'] } }] },
      sort: 'start',
      limit: 50,
      depth: 1,
    }),
    repo.find<Row>('appointments', {
      where: {
        and: [{ customer: { equals: customer.id } }, { or: [{ start: { less_than_equal: now } }, { status: { in: ['completed', 'cancelled', 'no-show'] } }] }],
      },
      sort: '-start',
      limit: 100,
      depth: 1,
    }),
  ])
  const Item = ({ a }: { a: Row }) => (
    <Link
      className='flex items-center gap-3 rounded-card border border-line bg-surface p-4'
      data-testid='appointment-row'
      href={`${base}/appointments/${a.id}`}
    >
      <span className='flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-tint text-brand'>
        <span className='font-heading text-lg leading-none'>{formatIST(a.start, 'd', tz)}</span>
        <span className='text-[10px] uppercase'>{formatIST(a.start, 'MMM', tz)}</span>
      </span>
      <span className='min-w-0 flex-1'>
        <span className='block truncate font-medium'>
          {a.services
            .map((s) => (typeof s === 'object' ? s.name : ''))
            .filter(Boolean)
            .join(', ')}
        </span>
        <span className='block text-xs text-muted'>
          {formatIST(a.start, 'EEE, h:mm a', tz)}
          {a.staff && typeof a.staff === 'object' && a.staff.name ? ` · ${tr('withName', { name: a.staff.name.split(' ')[0] })}` : ''}
        </span>
      </span>
      <Badge tone={STATUS_TONE[a.status] ?? 'muted'}>{tr.or(`ap_${a.status}`, a.status)}</Badge>
      <ChevronRight className='shrink-0 text-muted' size={16} />
    </Link>
  )
  return (
    <div className='px-4 pt-5'>
      <h1 className='font-heading text-3xl'>{tr('myAppointments')}</h1>
      <h2 className='mb-3 mt-6 font-heading text-xl'>{tr('upcoming')}</h2>
      {upcoming.docs.length ? (
        <div className='space-y-2' data-testid='upcoming'>
          {upcoming.docs.map((a) => (
            <Item a={a} key={a.id} />
          ))}
        </div>
      ) : (
        <EmptyState
          action={
            <Link className={buttonClass('primary')} href={`${base}/book`}>
              {tr('bookNow')}
            </Link>
          }
          icon={<CalendarDays />}
          title={tr('noUpcoming')}
        />
      )}
      <h2 className='mb-3 mt-8 font-heading text-xl'>{tr('past')}</h2>
      {past.docs.length ? (
        <div className='space-y-2' data-testid='past'>
          {past.docs.map((a) => (
            <Item a={a} key={a.id} />
          ))}
        </div>
      ) : (
        <p className='rounded-card border border-dashed border-line p-6 text-center text-sm text-muted'>{tr('noPast')}</p>
      )}
    </div>
  )
}
