'use client'
import { formatIST, zonedDateTime } from '@salon/core'
import { Badge, buttonClass, cn } from '@salon/ui'
import { AlertTriangle, ChevronLeft, ChevronRight, Phone, Plus, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ApptActions } from './ApptActions'
import { ABOVE_NAV } from './format'

export interface CalAppt {
  id: string
  start: string
  end: string
  status: string
  source: string | null
  customerId: string | null
  customerName: string
  phone: string | null
  allergies: string | null
  firstVisit: boolean
  staffId: string | null
  staffName: string | null
  services: string[]
  serviceIds: string[]
  notes: string | null
}

const HOUR_PX = 64
const COLORS = [
  'bg-rose-100 border-rose-400',
  'bg-sky-100 border-sky-400',
  'bg-amber-100 border-amber-400',
  'bg-emerald-100 border-emerald-400',
  'bg-violet-100 border-violet-400',
  'bg-orange-100 border-orange-400',
]
const UNASSIGNED = '__none'

const shiftDate = (iso: string, days: number) => {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Day view (columns per artist) on phones, week view on desktop. Tap a block for actions; tap empty space to book. */
export const Calendar = ({
  slug,
  appts,
  columns,
  date,
  days,
  today,
  timezone,
  startHour,
  endHour,
  manager,
}: {
  slug: string
  appts: CalAppt[]
  columns: { id: string; name: string }[]
  date: string
  days: string[]
  today: string
  timezone: string
  startHour: number
  endHour: number
  manager: boolean
}) => {
  const router = useRouter()
  const [view, setView] = useState<'day' | 'week'>('day')
  const [day, setDay] = useState(date)
  const [open, setOpen] = useState<CalAppt | null>(null)
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    if (window.matchMedia('(min-width: 768px)').matches) setView('week')
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [])
  useEffect(() => setDay(date), [date])

  const go = (iso: string) => {
    if (days.includes(iso)) setDay(iso)
    router.push(`/studio/${slug}/calendar?date=${iso}`, { scroll: false })
  }
  const colourOf = useMemo(() => {
    const m = new Map(columns.map((c, i) => [c.id, COLORS[i % COLORS.length]]))
    return (id: string | null) => (id ? (m.get(id) ?? COLORS[0]) : 'bg-tint border-line')
  }, [columns])
  const cols = [...columns]
  if (appts.some((a) => !a.staffId)) cols.push({ id: UNASSIGNED, name: 'No artist' })
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i)
  const height = (endHour - startHour) * HOUR_PX

  const topOf = (iso: string, dayIso: string) => {
    const base = zonedDateTime(dayIso, `${String(startHour).padStart(2, '0')}:00`, timezone).getTime()
    return ((new Date(iso).getTime() - base) / 60_000) * (HOUR_PX / 60)
  }
  const onDay = (dayIso: string) => appts.filter((a) => formatIST(a.start, 'yyyy-MM-dd', timezone) === dayIso)

  // Swipe left/right on the day view to change day.
  const touch = useRef<{ x: number; y: number } | null>(null)
  const swipe = {
    onTouchStart: (e: React.TouchEvent) => {
      touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    },
    onTouchEnd: (e: React.TouchEvent) => {
      const s = touch.current
      touch.current = null
      if (!s) return
      const dx = e.changedTouches[0].clientX - s.x
      const dy = e.changedTouches[0].clientY - s.y
      if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) go(shiftDate(day, dx < 0 ? 1 : -1))
    },
  }

  const newHref = (dayIso: string, y: number, staffId?: string) => {
    const minutes = Math.max(0, Math.round((y / HOUR_PX) * 4) * 15)
    const h = startHour + Math.floor(minutes / 60)
    const m = minutes % 60
    const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    return `/studio/${slug}/appointments/new?date=${dayIso}&time=${time}${staffId && staffId !== UNASSIGNED ? `&staff=${staffId}` : ''}`
  }

  const Block = ({ a, dayIso, narrow }: { a: CalAppt; dayIso: string; narrow?: boolean }) => {
    const top = topOf(a.start, dayIso)
    const h = Math.max(30, topOf(a.end, dayIso) - top)
    return (
      <button
        className={cn(
          'absolute inset-x-1 flex flex-col justify-start overflow-hidden rounded-md border-l-4 px-1.5 py-1 text-left text-[11px] leading-tight text-ink shadow-sm',
          colourOf(a.staffId),
          a.status === 'requested' && 'border-dashed opacity-90',
          a.status === 'completed' && 'opacity-60',
          a.status === 'no-show' && 'line-through opacity-50',
        )}
        data-testid='cal-block'
        onClick={(e) => {
          e.stopPropagation()
          setOpen(a)
        }}
        style={{ top, height: h }}
        type='button'
      >
        <span className='block truncate font-semibold'>
          {a.allergies ? '⚠ ' : ''}
          {a.customerName}
        </span>
        {!narrow || h > 40 ? (
          <span className='block truncate'>
            {formatIST(a.start, 'h:mm', timezone)} · {a.services.join(', ')}
          </span>
        ) : null}
        {a.status === 'requested' ? <span className='block truncate font-medium text-amber-800'>Request</span> : null}
      </button>
    )
  }

  const NowLine = ({ dayIso }: { dayIso: string }) => {
    if (now == null || dayIso !== today) return null
    const top = topOf(new Date(now).toISOString(), dayIso)
    if (top < 0 || top > height) return null
    return <div aria-hidden className='pointer-events-none absolute inset-x-0 z-10 border-t-2 border-red-500' style={{ top }} />
  }

  const Grid = ({ children, minWidth }: { children: React.ReactNode; minWidth: number }) => (
    <div className='overflow-x-auto rounded-card border border-line bg-surface'>
      <div className='flex' style={{ minWidth }}>
        <div className='w-12 shrink-0 border-r border-line'>
          <div className='h-10 border-b border-line' />
          <div className='relative' style={{ height }}>
            {hours.map((hr, i) => (
              <span className='absolute right-1 -translate-y-1/2 text-[10px] text-muted' key={hr} style={{ top: i * HOUR_PX }}>
                {i ? `${hr % 12 || 12}${hr < 12 ? 'a' : 'p'}` : ''}
              </span>
            ))}
          </div>
        </div>
        {children}
      </div>
    </div>
  )

  const Lines = () => (
    <>
      {hours.map((hr, i) => (
        <div className='pointer-events-none absolute inset-x-0 border-t border-line/60' key={hr} style={{ top: i * HOUR_PX }} />
      ))}
    </>
  )

  return (
    <div>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <h1 className='font-heading text-3xl'>Calendar</h1>
        <div className='flex gap-2'>
          <div className='flex rounded-btn border border-line bg-surface p-0.5' role='tablist'>
            {(['day', 'week'] as const).map((v) => (
              <button
                aria-selected={view === v}
                className={cn('min-h-10 rounded-btn px-3 text-sm capitalize', view === v ? 'bg-brand text-on-brand' : 'text-muted')}
                key={v}
                onClick={() => setView(v)}
                role='tab'
                type='button'
              >
                {v}
              </button>
            ))}
          </div>
          <Link className={buttonClass('primary', 'md')} href={`/studio/${slug}/appointments/new?date=${day}`}>
            <Plus size={16} /> Add
          </Link>
        </div>
      </div>

      <div className='mt-4 flex items-center gap-2'>
        <button
          aria-label={view === 'day' ? 'Previous day' : 'Previous week'}
          className='flex h-11 w-11 shrink-0 items-center justify-center rounded-btn border border-line bg-surface'
          onClick={() => go(shiftDate(day, view === 'day' ? -1 : -7))}
          type='button'
        >
          <ChevronLeft size={18} />
        </button>
        <div className='no-scrollbar flex flex-1 gap-1 overflow-x-auto'>
          {days.map((d) => (
            <button
              aria-pressed={view === 'day' && d === day}
              className={cn(
                'flex min-h-12 min-w-11 flex-1 flex-col items-center justify-center rounded-btn border text-xs',
                view === 'day' && d === day ? 'border-brand bg-brand text-on-brand' : d === today ? 'border-brand/50' : 'border-transparent',
              )}
              key={d}
              onClick={() => {
                setDay(d)
                setView('day')
              }}
              type='button'
            >
              <span>{formatIST(`${d}T12:00:00Z`, 'EEE', 'UTC')}</span>
              <span className='font-semibold'>{formatIST(`${d}T12:00:00Z`, 'd', 'UTC')}</span>
            </button>
          ))}
        </div>
        <button
          aria-label={view === 'day' ? 'Next day' : 'Next week'}
          className='flex h-11 w-11 shrink-0 items-center justify-center rounded-btn border border-line bg-surface'
          onClick={() => go(shiftDate(day, view === 'day' ? 1 : 7))}
          type='button'
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <p className='mt-2 text-sm text-muted'>
        {view === 'day'
          ? formatIST(`${day}T12:00:00Z`, 'EEEE d MMMM', 'UTC')
          : `${formatIST(`${days[0]}T12:00:00Z`, 'd MMM', 'UTC')} – ${formatIST(`${days[6]}T12:00:00Z`, 'd MMM yyyy', 'UTC')}`}
        {day !== today ? (
          <button className='ml-2 min-h-11 text-brand' onClick={() => go(today)} type='button'>
            Today
          </button>
        ) : null}
      </p>

      <div className='mt-3' {...(view === 'day' ? swipe : {})}>
        {view === 'day' ? (
          <Grid minWidth={48 + cols.length * 130}>
            {cols.map((c) => (
              <div className='min-w-[130px] flex-1 border-r border-line last:border-r-0' key={c.id}>
                <div className='flex h-10 items-center justify-center border-b border-line px-1 text-sm font-medium'>
                  <span className='truncate'>{c.name.split(' ')[0]}</span>
                </div>
                <div className='relative' style={{ height }}>
                  <button
                    aria-label={`Add appointment for ${c.name.split(' ')[0]}`}
                    className='absolute inset-0 cursor-pointer'
                    onClick={(e) => router.push(newHref(day, e.nativeEvent.offsetY, c.id))}
                    tabIndex={-1}
                    type='button'
                  />
                  <Lines />
                  <NowLine dayIso={day} />
                  {onDay(day)
                    .filter((a) => (c.id === UNASSIGNED ? !a.staffId : a.staffId === c.id))
                    .map((a) => (
                      <Block a={a} dayIso={day} key={a.id} />
                    ))}
                </div>
              </div>
            ))}
            {!cols.length ? <p className='p-6 text-sm text-muted'>No bookable artists yet. Add them in More → Team.</p> : null}
          </Grid>
        ) : (
          <Grid minWidth={48 + 7 * 110}>
            {days.map((d) => (
              <div className='min-w-[110px] flex-1 border-r border-line last:border-r-0' key={d}>
                <button
                  className={cn('flex h-10 w-full items-center justify-center gap-1 border-b border-line text-sm', d === today && 'font-semibold text-brand')}
                  onClick={() => {
                    setDay(d)
                    setView('day')
                  }}
                  type='button'
                >
                  {formatIST(`${d}T12:00:00Z`, 'EEE d', 'UTC')}
                </button>
                <div className='relative' style={{ height }}>
                  <button
                    aria-label={`Add appointment on ${d}`}
                    className='absolute inset-0 cursor-pointer'
                    onClick={(e) => router.push(newHref(d, e.nativeEvent.offsetY))}
                    tabIndex={-1}
                    type='button'
                  />
                  <Lines />
                  <NowLine dayIso={d} />
                  {onDay(d).map((a) => (
                    <Block a={a} dayIso={d} key={a.id} narrow />
                  ))}
                </div>
              </div>
            ))}
          </Grid>
        )}
      </div>
      {view === 'week' && columns.length > 1 ? (
        <div className='mt-3 flex flex-wrap gap-3 text-xs text-muted'>
          {columns.map((c) => (
            <span className='inline-flex items-center gap-1.5' key={c.id}>
              <span className={cn('h-3 w-3 rounded-sm border-l-4', colourOf(c.id))} /> {c.name.split(' ')[0]}
            </span>
          ))}
        </div>
      ) : null}

      {open ? (
        <div
          aria-label={`${open.customerName} appointment`}
          className={cn(
            'fixed inset-x-0 z-40 mx-auto max-w-lg rounded-t-[24px] border border-line bg-bg p-4 shadow-2xl md:bottom-4 md:rounded-[24px]',
            ABOVE_NAV,
          )}
          role='dialog'
        >
          <div className='flex items-start justify-between gap-3'>
            <div className='min-w-0'>
              <p className='font-heading text-xl'>{open.customerName}</p>
              <p className='text-sm text-muted'>
                {formatIST(open.start, 'EEE d MMM, h:mm', timezone)}–{formatIST(open.end, 'h:mm a', timezone)}
                {open.staffName ? ` · ${open.staffName.split(' ')[0]}` : ' · no artist yet'}
              </p>
              <p className='text-sm'>{open.services.join(', ')}</p>
            </div>
            <button
              aria-label='Close'
              className='-m-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-tint'
              onClick={() => setOpen(null)}
              type='button'
            >
              <X size={20} />
            </button>
          </div>
          <div className='mt-2 flex flex-wrap gap-1.5'>
            {open.firstVisit ? <Badge>First visit</Badge> : null}
            {open.status === 'requested' ? <Badge tone='warning'>Request</Badge> : null}
            {open.status === 'completed' ? <Badge tone='success'>Done</Badge> : null}
            {open.source === 'walk-in' ? <Badge tone='muted'>Walk-in</Badge> : null}
          </div>
          {open.allergies ? (
            <p className='mt-2 flex items-start gap-2 rounded-btn bg-red-500/10 px-3 py-2 text-sm font-medium text-red-800'>
              <AlertTriangle className='mt-0.5 shrink-0' size={16} /> Allergy: {open.allergies}
            </p>
          ) : null}
          {open.notes ? <p className='mt-2 text-sm text-amber-900'>Note: {open.notes}</p> : null}
          <div className='mt-3 flex flex-wrap gap-2'>
            {open.customerId ? (
              <Link className={buttonClass('secondary', 'md')} href={`/studio/${slug}/customers/${open.customerId}`}>
                Customer
              </Link>
            ) : null}
            {open.phone ? (
              <a aria-label={`Call ${open.customerName}`} className={buttonClass('secondary', 'md', 'w-11 px-0')} href={`tel:${open.phone}`}>
                <Phone size={18} />
              </a>
            ) : null}
          </div>
          <div className='mt-3'>
            <ApptActions
              appt={{
                id: open.id,
                start: open.start,
                end: open.end,
                status: open.status,
                customerName: open.customerName,
                serviceIds: open.serviceIds,
                staffId: open.staffId,
              }}
              key={open.id}
              manager={manager}
              onChanged={() => setOpen(null)}
              past={now != null && new Date(open.end).getTime() < now}
              slug={slug}
              team={columns}
              timezone={timezone}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
