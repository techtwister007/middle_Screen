'use client'
import { formatINR, formatIST } from '@salon/core'
import { formatDuration, quote } from '@salon/modules/client'
import { Button, cn, Textarea } from '@salon/ui'
import { ArrowLeft, Calendar, Check, ImagePlus, Loader2, MapPin, Share2, UserRound } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { addToWaitlist, book, slotsFor, uploadInspiration } from '@/app/(site)/s/[salon]/actions'
import { LoginForm } from './LoginForm'

export interface FlowService {
  id: string | number
  name: string
  category: string
  price: number
  durationMinutes: number
  isAddOn?: boolean | null
}
export interface FlowArtist {
  id: string | number
  name: string
  avatar?: string | null
  specialties?: string[] | null
}

interface Props {
  slug: string
  salonName: string
  timezone: string
  services: FlowService[]
  artists: FlowArtist[]
  initialServiceIds: (string | number)[]
  initialStaffId?: string | number | null
  design?: { id: string | number; title: string; image: string | null } | null
  loggedIn: boolean
  depositRule: { depositMinMinutes: number; depositPercent: number }
  depositsEnabled: boolean
  cancellationPolicy?: string | null
  preBooked?: boolean
  groupCode?: string | null
  initialStart?: string | null
  mapUrl?: string | null
}

type Step = 'services' | 'artist' | 'time' | 'details' | 'confirm' | 'done'

const nextDays = (n: number, tz: string) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.now() + i * 86_400_000)
    return {
      iso: formatIST(d, 'yyyy-MM-dd', tz),
      dow: i === 0 ? 'Today' : i === 1 ? 'Tmrw' : formatIST(d, 'EEE', tz),
      day: formatIST(d, 'd', tz),
      month: formatIST(d, 'MMM', tz),
    }
  })

export const BookingFlow = (p: Props) => {
  const router = useRouter()
  const [step, setStep] = useState<Step>(p.initialServiceIds.length ? (p.artists.length > 1 ? 'artist' : 'time') : 'services')
  const [serviceIds, setServiceIds] = useState<Set<string>>(new Set(p.initialServiceIds.map(String)))
  const [staffId, setStaffId] = useState<string | null>(p.initialStaffId ? String(p.initialStaffId) : null)
  const days = useMemo(() => nextDays(21, p.timezone), [p.timezone])
  const [date, setDate] = useState(p.initialStart ? formatIST(p.initialStart, 'yyyy-MM-dd', p.timezone) : days[0].iso)
  const [slots, setSlots] = useState<{ start: string; staffIds: (string | number)[] }[] | null>(null)
  const [start, setStart] = useState<string | null>(p.initialStart ?? null)
  const [notes, setNotes] = useState('')
  const [inspiration, setInspiration] = useState<{ id: string | number; url: string }[]>([])
  const [loggedIn, setLoggedIn] = useState(p.loggedIn)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ appointmentId: string | number; status: string } | null>(null)
  const [pending, startTransition] = useTransition()
  const [waitlisted, setWaitlisted] = useState(false)

  const selected = p.services.filter((s) => serviceIds.has(String(s.id)))
  const q = quote(selected, p.depositRule)
  const deposit = p.depositsEnabled ? q.deposit : 0
  const mains = p.services.filter((s) => !s.isAddOn)
  const addOns = p.services.filter((s) => s.isAddOn)

  useEffect(() => {
    if (step !== 'time' || !selected.length) return
    let cancelled = false
    setSlots(null)
    slotsFor(p.slug, { date, serviceIds: [...serviceIds], staffId }).then((res) => {
      if (cancelled) return
      if (res.ok) setSlots(res.data?.slots ?? [])
      else setError(res.error)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, date, staffId, p.slug, [...serviceIds].join(',')])

  const toggle = (id: string | number) =>
    setServiceIds((s) => {
      const n = new Set(s)
      if (n.has(String(id))) n.delete(String(id))
      else n.add(String(id))
      return n
    })

  const submit = () =>
    startTransition(async () => {
      setError(null)
      if (!start) return
      const res = await book(p.slug, {
        serviceIds: [...serviceIds],
        start,
        staffId,
        designId: p.design?.id ?? null,
        inspirationIds: inspiration.map((i) => i.id),
        notes,
        preBooked: p.preBooked,
        groupCode: p.groupCode ?? undefined,
      })
      if (!res.ok) {
        setError(res.error)
        if (/taken/.test(res.error)) setStep('time')
        return
      }
      if (res.data?.payUrl) {
        window.location.href = res.data.payUrl
        return
      }
      setResult({ appointmentId: res.data!.appointmentId, status: res.data!.status })
      setStep('done')
      router.refresh()
    })

  const back: Partial<Record<Step, Step>> = { artist: 'services', time: p.artists.length > 1 ? 'artist' : 'services', details: 'time', confirm: 'details' }
  const title: Record<Step, string> = {
    services: 'What would you like?',
    artist: 'Choose your artist',
    time: 'Pick a time',
    details: 'Anything we should know?',
    confirm: 'Confirm your booking',
    done: result?.status === 'confirmed' ? "You're booked!" : 'Request sent!',
  }

  const Summary = () => (
    <div className='rounded-card border border-line bg-surface p-4 text-sm'>
      {p.design ? (
        <div className='mb-3 flex items-center gap-3'>
          {p.design.image ? <img alt='' className='h-14 w-14 rounded-xl object-cover' src={p.design.image} /> : null}
          <p className='font-medium'>{p.design.title}</p>
        </div>
      ) : null}
      {selected.map((s) => (
        <div className='flex justify-between py-1' key={String(s.id)}>
          <span>{s.name}</span>
          <span className='tabular-nums'>{formatINR(s.price)}</span>
        </div>
      ))}
      <div className='mt-2 flex justify-between border-t border-line pt-2 font-medium'>
        <span>Total · {formatDuration(q.durationMinutes)}</span>
        <span className='tabular-nums'>{formatINR(q.subtotal)}</span>
      </div>
      {start ? (
        <p className='mt-3 flex items-center gap-2 text-muted'>
          <Calendar size={14} /> {formatIST(start, 'EEEE d MMM · h:mm a', p.timezone)}
        </p>
      ) : null}
      {staffId ? (
        <p className='mt-1 flex items-center gap-2 text-muted'>
          <UserRound size={14} /> {p.artists.find((a) => String(a.id) === staffId)?.name}
        </p>
      ) : null}
      {deposit > 0 ? (
        <p className='mt-3 rounded-btn bg-accent/15 px-3 py-2 text-[13px]'>
          A {formatINR(deposit)} deposit holds this long appointment. It's deducted from your bill.
        </p>
      ) : null}
    </div>
  )

  return (
    <div className='px-4 pt-4'>
      <div className='mb-5 flex items-center gap-3'>
        {back[step] ? (
          <button
            aria-label='Back'
            className='flex h-10 w-10 items-center justify-center rounded-full border border-line'
            onClick={() => setStep(back[step]!)}
            type='button'
          >
            <ArrowLeft size={18} />
          </button>
        ) : null}
        <h1 className='font-heading text-2xl'>{title[step]}</h1>
      </div>
      {p.groupCode ? <p className='mb-4 rounded-btn bg-brand/10 px-3 py-2 text-sm text-brand'>You're joining a group booking ({p.groupCode}).</p> : null}

      {step === 'services' ? (
        <div className='space-y-2'>
          {mains.map((s) => {
            const on = serviceIds.has(String(s.id))
            return (
              <button
                className={cn(
                  'flex w-full items-center justify-between rounded-card border p-4 text-left transition',
                  on ? 'border-brand bg-brand/6' : 'border-line bg-surface',
                )}
                key={String(s.id)}
                onClick={() => toggle(s.id)}
                type='button'
              >
                <span>
                  <span className='block font-medium'>{s.name}</span>
                  <span className='text-xs text-muted'>{formatDuration(s.durationMinutes)}</span>
                </span>
                <span className='flex items-center gap-3'>
                  <span className='tabular-nums'>{formatINR(s.price)}</span>
                  <span
                    className={cn('flex h-6 w-6 items-center justify-center rounded-full border', on ? 'border-brand bg-brand text-on-brand' : 'border-line')}
                  >
                    {on ? <Check size={14} /> : null}
                  </span>
                </span>
              </button>
            )
          })}
          {addOns.length ? <p className='pt-3 text-xs font-semibold uppercase tracking-wider text-muted'>Add-ons</p> : null}
          <div className='flex flex-wrap gap-2'>
            {addOns.map((s) => (
              <button
                className={cn(
                  'rounded-full border px-3 py-2 text-sm',
                  serviceIds.has(String(s.id)) ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface',
                )}
                key={String(s.id)}
                onClick={() => toggle(s.id)}
                type='button'
              >
                {s.name} +{formatINR(s.price)}
              </button>
            ))}
          </div>
          <div className='sticky bottom-24 pt-4'>
            <Button className='w-full' disabled={!selected.some((s) => !s.isAddOn)} onClick={() => setStep(p.artists.length > 1 ? 'artist' : 'time')} size='lg'>
              Continue · {formatINR(q.subtotal)}
            </Button>
          </div>
        </div>
      ) : null}

      {step === 'artist' ? (
        <div className='space-y-2'>
          {[{ id: '', name: 'Anyone available', specialties: ['Fastest option'] } as FlowArtist, ...p.artists].map((a) => {
            const on = (staffId ?? '') === String(a.id)
            return (
              <button
                className={cn('flex w-full items-center gap-4 rounded-card border p-3 text-left', on ? 'border-brand bg-brand/6' : 'border-line bg-surface')}
                key={String(a.id) || 'any'}
                onClick={() => {
                  setStaffId(a.id ? String(a.id) : null)
                  setStep('time')
                }}
                type='button'
              >
                {a.avatar ? (
                  <img alt='' className='h-12 w-12 rounded-full object-cover' src={a.avatar} />
                ) : (
                  <span className='flex h-12 w-12 items-center justify-center rounded-full bg-tint font-heading text-brand'>{a.id ? a.name[0] : '★'}</span>
                )}
                <span>
                  <span className='block font-medium'>{a.name}</span>
                  {a.specialties?.length ? <span className='text-xs text-muted'>{a.specialties.join(' · ')}</span> : null}
                </span>
              </button>
            )
          })}
        </div>
      ) : null}

      {step === 'time' ? (
        <div>
          <div className='no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-2'>
            {days.map((d) => (
              <button
                data-testid='day'
                className={cn(
                  'flex w-16 shrink-0 flex-col items-center rounded-card border py-2.5',
                  date === d.iso ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface',
                )}
                key={d.iso}
                onClick={() => {
                  setDate(d.iso)
                  setStart(null)
                }}
                type='button'
              >
                <span className='text-[11px] opacity-80'>{d.dow}</span>
                <span className='font-heading text-xl leading-tight'>{d.day}</span>
                <span className='text-[10px] opacity-80'>{d.month}</span>
              </button>
            ))}
          </div>
          <div className='mt-4 min-h-40'>
            {slots === null ? (
              <div className='flex items-center justify-center py-10 text-muted'>
                <Loader2 className='animate-spin' />
              </div>
            ) : slots.length === 0 ? (
              <div className='rounded-card border border-dashed border-line p-6 text-center'>
                <p className='font-medium'>Fully booked on this day</p>
                <p className='mt-1 text-sm text-muted'>Try another day, or join the waitlist and we'll WhatsApp you if a slot opens.</p>
                {loggedIn ? (
                  <Button
                    className='mt-4'
                    disabled={waitlisted}
                    onClick={() =>
                      startTransition(async () => {
                        const res = await addToWaitlist(p.slug, { serviceIds: [...serviceIds], date })
                        if (res.ok) setWaitlisted(true)
                      })
                    }
                    variant='outline'
                  >
                    {waitlisted ? "You're on the waitlist" : 'Join the waitlist'}
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className='grid grid-cols-3 gap-2'>
                {slots.map((s) => (
                  <button
                    data-testid='slot'
                    className={cn(
                      'rounded-btn border py-3 text-sm tabular-nums',
                      start === s.start ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface',
                    )}
                    key={s.start}
                    onClick={() => {
                      setStart(s.start)
                      setStep('details')
                    }}
                    type='button'
                  >
                    {formatIST(s.start, 'h:mm a', p.timezone)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {step === 'details' ? (
        <div className='space-y-4'>
          <div>
            <p className='mb-2 text-sm font-medium'>Inspiration photo (optional)</p>
            <p className='mb-3 text-xs text-muted'>Saw something on Pinterest? Add it and your artist will check it before your visit.</p>
            <div className='flex flex-wrap gap-2'>
              {inspiration.map((i) => (
                <img alt='' className='h-20 w-20 rounded-xl object-cover' key={String(i.id)} src={i.url} />
              ))}
              <label className='flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-line text-muted'>
                <ImagePlus size={20} />
                <span className='text-[10px]'>Add</span>
                <input
                  accept='image/*'
                  className='hidden'
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const fd = new FormData()
                    fd.set('file', file)
                    startTransition(async () => {
                      const res = await uploadInspiration(p.slug, fd)
                      if (res.ok && res.data) setInspiration((x) => [...x, res.data!])
                      else if (!res.ok) setError(res.error)
                    })
                  }}
                  type='file'
                />
              </label>
            </div>
          </div>
          <div>
            <p className='mb-2 text-sm font-medium'>Notes for your artist</p>
            <Textarea onChange={(e) => setNotes(e.target.value)} placeholder='e.g. medium length, almond shape, sensitive cuticles' rows={3} value={notes} />
          </div>
          <Button className='w-full' onClick={() => setStep('confirm')} size='lg'>
            Review booking
          </Button>
        </div>
      ) : null}

      {step === 'confirm' ? (
        <div className='space-y-4'>
          <Summary />
          {p.cancellationPolicy ? <p className='text-xs text-muted'>{p.cancellationPolicy}</p> : null}
          {loggedIn ? (
            <Button className='w-full' disabled={pending} onClick={submit} size='lg'>
              {pending ? 'Booking…' : deposit > 0 ? `Pay ${formatINR(deposit)} deposit & book` : 'Confirm booking'}
            </Button>
          ) : (
            <div className='rounded-card border border-line bg-surface p-4'>
              <p className='mb-4 font-medium'>Log in with your phone to confirm</p>
              <LoginForm onDone={() => setLoggedIn(true)} salonName={p.salonName} slug={p.slug} />
            </div>
          )}
        </div>
      ) : null}

      {step === 'done' && result ? (
        <div className='space-y-4 text-center'>
          <div className='mx-auto mt-4 flex h-20 w-20 items-center justify-center rounded-full bg-brand text-on-brand'>
            <Check size={36} />
          </div>
          <p className='text-muted'>
            {result.status === 'confirmed' ? "We've sent the details to your WhatsApp." : `${p.salonName} will confirm shortly on WhatsApp.`}
          </p>
          <Summary />
          <div className='grid grid-cols-3 gap-2'>
            <a
              className='flex flex-col items-center gap-1 rounded-card border border-line bg-surface py-3 text-xs'
              href={`/s/${p.slug}/appointments/${result.appointmentId}/ics`}
            >
              <Calendar size={18} /> Calendar
            </a>
            {p.mapUrl ? (
              <a
                className='flex flex-col items-center gap-1 rounded-card border border-line bg-surface py-3 text-xs'
                href={p.mapUrl}
                rel='noopener'
                target='_blank'
              >
                <MapPin size={18} /> Directions
              </a>
            ) : null}
            <a
              className='flex flex-col items-center gap-1 rounded-card border border-line bg-surface py-3 text-xs'
              href={`https://wa.me/?text=${encodeURIComponent(`I'm getting my nails done at ${p.salonName}! Come with me? ${typeof window !== 'undefined' ? window.location.origin : ''}/s/${p.slug}`)}`}
              rel='noopener'
              target='_blank'
            >
              <Share2 size={18} /> Bring a friend
            </a>
          </div>
          <Link className='block text-sm font-medium text-brand' href={`/s/${p.slug}`}>
            Back to home
          </Link>
        </div>
      ) : null}

      {error ? <p className='mt-4 rounded-btn bg-red-500/10 px-4 py-3 text-sm text-red-700'>{error}</p> : null}
    </div>
  )
}
