'use client'
import { formatINR, formatIST } from '@salon/core'
import { Button, cn, Input, Label, Textarea } from '@salon/ui'
import { Check, Loader2, Search, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { findCustomer, staffBook, staffSlots } from '@/app/(site)/studio/[salon]/actions'
import { ToggleRow } from './Checkout'
import { ABOVE_NAV, plural } from './format'
import { toast } from './Toast'

interface Service {
  id: string | number
  name: string
  price: number
  durationMinutes: number
  isAddOn?: boolean | null
}
interface Customer {
  id: string | number
  name?: string | null
  phone: string
  visitCount?: number | null
}

const PART: [string, number, number][] = [
  ['Morning', 0, 12],
  ['Afternoon', 12, 17],
  ['Evening', 17, 24],
]

const shift = (iso: string, days: number) => {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export const NewAppointment = ({
  slug,
  services,
  team,
  timezone,
  initialDate,
  initialTime,
  initialStaff,
  customer: initialCustomer,
}: {
  slug: string
  services: Service[]
  team: { id: string | number; name: string }[]
  timezone: string
  initialDate: string
  initialTime: string | null
  initialStaff: string | null
  customer: Customer | null
}) => {
  const router = useRouter()
  const [customer, setCustomer] = useState<Customer | null>(initialCustomer)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Customer[] | null>(null)
  const [name, setName] = useState('')
  const [picked, setPicked] = useState<(string | number)[]>([])
  const [artist, setArtist] = useState<string | number | null>(initialStaff)
  const [date, setDate] = useState(initialDate)
  const [loaded, setLoaded] = useState<{ key: string; list: { start: string }[] } | null>(null)
  const [slot, setSlot] = useState<string | null>(null)
  const [walkIn, setWalkIn] = useState(false)
  const [notes, setNotes] = useState('')
  const [pending, start] = useTransition()
  const today = formatIST(new Date(), 'yyyy-MM-dd', timezone)
  const days = Array.from({ length: 14 }, (_, i) => shift(today, i))

  useEffect(() => {
    const q = query.trim()
    if (q.replace(/\D/g, '').length < 3 && !/[a-z]{2,}/i.test(q)) return setResults(null)
    const t = setTimeout(() => findCustomer(slug, q).then((r) => setResults(r.ok ? (r.data ?? []) : [])), 250)
    return () => clearTimeout(t)
  }, [query, slug])

  const mainIds = picked.filter((id) => !services.find((s) => String(s.id) === String(id))?.isAddOn)
  // Slots belong to one day/artist/service choice; older answers are never shown for a newer choice.
  const key = `${date}|${artist ?? ''}|${picked.join(',')}`
  const slots = loaded?.key === key ? loaded.list : null
  useEffect(() => {
    setSlot(null)
    if (!picked.length) return
    let live = true
    staffSlots(slug, { date, serviceIds: picked, staffId: artist }).then((r) => {
      if (!live) return
      const list = r.ok ? (r.data ?? []) : []
      setLoaded({ key, list })
      if (initialTime && date === initialDate) {
        const match = list.find((s) => formatIST(s.start, 'HH:mm', timezone) >= initialTime)
        if (match) setSlot(match.start)
      }
    })
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, artist, picked.join(','), slug])

  const isNew = !customer && query.replace(/\D/g, '').length >= 10 && results?.length === 0
  const total = picked.reduce<number>((n, id) => n + (services.find((s) => String(s.id) === String(id))?.price ?? 0), 0)
  const minutes = picked.reduce<number>((n, id) => n + (services.find((s) => String(s.id) === String(id))?.durationMinutes ?? 0), 0)
  const blocker = !customer && !isNew ? 'Choose the customer' : !mainIds.length ? 'Pick a service' : !slot ? 'Pick a time' : null

  const toggle = (id: string | number) =>
    setPicked(picked.some((p) => String(p) === String(id)) ? picked.filter((p) => String(p) !== String(id)) : [...picked, id])

  return (
    <div className='mt-6 space-y-7'>
      <section>
        <h2 className='mb-2 text-sm font-semibold uppercase tracking-wider text-muted'>Customer</h2>
        {customer ? (
          <div className='flex items-center justify-between gap-3 rounded-card border border-line bg-surface p-4'>
            <div>
              <p className='font-medium'>{customer.name ?? customer.phone}</p>
              <p className='text-sm text-muted'>
                {customer.phone} · {customer.visitCount ? plural(customer.visitCount, 'visit') : 'new'}
              </p>
            </div>
            <button
              aria-label='Change customer'
              className='flex h-11 w-11 items-center justify-center rounded-full hover:bg-tint'
              onClick={() => setCustomer(null)}
              type='button'
            >
              <X size={20} />
            </button>
          </div>
        ) : (
          <div className='space-y-2'>
            <div className='relative'>
              <Search className='absolute left-3 top-3.5 text-muted' size={18} />
              <Input aria-label='Find customer' className='pl-10' onChange={(e) => setQuery(e.target.value)} placeholder='Phone number or name' value={query} />
            </div>
            {results?.map((r) => (
              <button
                className='flex min-h-14 w-full items-center justify-between rounded-btn border border-line bg-surface px-4 text-left'
                key={String(r.id)}
                onClick={() => setCustomer(r)}
                type='button'
              >
                <span>
                  <span className='block font-medium'>{r.name ?? 'No name'}</span>
                  <span className='text-xs text-muted'>{r.phone}</span>
                </span>
                <span className='text-xs text-muted'>{r.visitCount ? plural(r.visitCount, 'visit') : 'new'}</span>
              </button>
            ))}
            {results?.length === 0 && !isNew ? <p className='text-sm text-muted'>No match. Type the full 10-digit number to add them.</p> : null}
            {isNew ? (
              <div>
                <Label htmlFor='appt-name'>New customer name</Label>
                <Input id='appt-name' onChange={(e) => setName(e.target.value)} placeholder='Name' value={name} />
              </div>
            ) : null}
          </div>
        )}
      </section>

      <section>
        <h2 className='mb-2 text-sm font-semibold uppercase tracking-wider text-muted'>Services</h2>
        <div className='grid grid-cols-2 gap-2 sm:grid-cols-3'>
          {services.map((s) => {
            const on = picked.some((p) => String(p) === String(s.id))
            return (
              <button
                aria-pressed={on}
                className={cn(
                  'flex min-h-14 items-center gap-2 rounded-btn border px-3 py-2 text-left text-sm',
                  on ? 'border-brand bg-brand/10' : 'border-line bg-surface',
                )}
                key={String(s.id)}
                onClick={() => toggle(s.id)}
                type='button'
              >
                <span
                  className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded border', on ? 'border-brand bg-brand text-on-brand' : 'border-line')}
                >
                  {on ? <Check size={14} /> : null}
                </span>
                <span className='min-w-0 flex-1'>
                  <span className='block leading-tight'>{s.name}</span>
                  <span className='text-xs text-muted'>
                    {formatINR(s.price)}
                    {s.isAddOn ? ' · add-on' : ''}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
        {picked.length ? (
          <p className='mt-2 text-sm text-muted'>
            {formatINR(total)} · {minutes} min
          </p>
        ) : null}
      </section>

      {team.length ? (
        <section>
          <h2 className='mb-2 text-sm font-semibold uppercase tracking-wider text-muted'>Artist</h2>
          <div className='flex flex-wrap gap-2'>
            {[...(team.length > 1 ? [{ id: null as string | number | null, name: 'Any' }] : []), ...team].map((t) => (
              <button
                aria-pressed={String(artist) === String(t.id)}
                className={cn(
                  'min-h-11 rounded-full border px-4 text-sm',
                  String(artist) === String(t.id) ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface',
                )}
                key={String(t.id)}
                onClick={() => setArtist(t.id)}
                type='button'
              >
                {t.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className='mb-2 text-sm font-semibold uppercase tracking-wider text-muted'>When</h2>
        <div className='no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1'>
          {days.map((d) => (
            <button
              aria-pressed={date === d}
              className={cn(
                'flex min-h-14 min-w-16 shrink-0 flex-col items-center justify-center rounded-btn border px-2 text-xs',
                date === d ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface',
              )}
              key={d}
              onClick={() => setDate(d)}
              type='button'
            >
              <span>{d === today ? 'Today' : formatIST(`${d}T12:00:00Z`, 'EEE', 'UTC')}</span>
              <span className='text-sm font-semibold'>{formatIST(`${d}T12:00:00Z`, 'd MMM', 'UTC')}</span>
            </button>
          ))}
        </div>
        <div className='mt-2'>
          <Label htmlFor='appt-date'>Or pick a date</Label>
          <Input id='appt-date' min={today} onChange={(e) => e.target.value && setDate(e.target.value)} type='date' value={date} />
        </div>
        {!picked.length ? <p className='mt-3 text-sm text-muted'>Pick a service to see free times.</p> : null}
        {picked.length && slots === null ? <Loader2 className='mt-3 animate-spin text-muted' /> : null}
        {slots?.length === 0 ? <p className='mt-3 text-sm text-muted'>No free time that day. Try another day or artist.</p> : null}
        {PART.map(([label, from, to]) => {
          const list = (slots ?? []).filter((s) => {
            const h = Number(formatIST(s.start, 'H', timezone))
            return h >= from && h < to
          })
          if (!list.length) return null
          return (
            <div className='mt-4' key={label}>
              <p className='mb-2 text-xs font-semibold uppercase tracking-wider text-muted'>{label}</p>
              <div className='grid grid-cols-3 gap-2 sm:grid-cols-5'>
                {list.map((s) => (
                  <button
                    aria-pressed={slot === s.start}
                    className={cn(
                      'min-h-11 rounded-btn border text-sm tabular-nums',
                      slot === s.start ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface',
                    )}
                    key={s.start}
                    onClick={() => setSlot(s.start)}
                    type='button'
                  >
                    {formatIST(s.start, 'h:mm a', timezone)}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </section>

      <section className='space-y-3'>
        <ToggleRow checked={walkIn} onChange={setWalkIn}>
          Walk-in (they're here now)
        </ToggleRow>
        <div>
          <Label htmlFor='appt-notes'>Note for the artist</Label>
          <Textarea id='appt-notes' onChange={(e) => setNotes(e.target.value)} placeholder='e.g. wants a softer pink than last time' rows={2} value={notes} />
        </div>
      </section>

      <div className={cn('sticky z-20 -mx-4 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur', ABOVE_NAV)}>
        <Button
          className='w-full'
          disabled={pending || Boolean(blocker)}
          onClick={() =>
            start(async () => {
              if (!slot) return
              const r = await staffBook(slug, {
                customerId: customer?.id ?? null,
                phone: customer ? undefined : query,
                name: customer ? undefined : name,
                serviceIds: picked,
                start: slot,
                staffId: artist,
                walkIn,
                notes,
              })
              if (!r.ok) return void toast({ message: r.error, tone: 'error' })
              toast({ message: `Booked for ${formatIST(slot, 'EEE d MMM, h:mm a', timezone)}. WhatsApp confirmation sent.`, tone: 'success' })
              router.push(`/studio/${slug}/calendar?date=${date}`)
            })
          }
          size='lg'
        >
          {pending ? <Loader2 className='animate-spin' /> : slot ? `Book ${formatIST(slot, 'EEE d MMM, h:mm a', timezone)}` : 'Book'}
        </Button>
        {blocker ? <p className='mt-1 text-center text-xs text-muted'>{blocker}</p> : null}
      </div>
    </div>
  )
}
