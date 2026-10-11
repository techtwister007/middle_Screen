'use client'
import { formatINR, formatIST } from '@salon/core'
import { quote } from '@salon/modules/client'
import { Button, cn, Input, Label, Textarea } from '@salon/ui'
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  Copy,
  Gift,
  ImagePlus,
  Loader2,
  MapPin,
  Minus,
  Plus,
  RotateCcw,
  Send,
  Share2,
  UserRound,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { addToWaitlist, book, bookingRewards, rescheduleAppointment, slotsFor, startGroup, uploadInspiration } from '@/app/(site)/s/[salon]/actions'
import { formatDateIn, formatDurationIn, type Lang, translator } from '@/lib/i18n'
import { LoginForm } from './LoginForm'
import { StickyBar } from './StickyBar'

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
  lang: Lang
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
  /** Who started the group being joined (shown to friends) */
  group?: { organiser?: string | null; occasion?: string | null } | null
  /** Organisers may create a group link when the salon has group booking */
  groupBookingEnabled?: boolean
  initialStart?: string | null
  mapUrl?: string | null
  /** Moving an existing appointment: services and artist stay, only the time changes. */
  reschedule?: { id: string | number; start: string } | null
  /** Rewards that will be applied at the salon (logged-in customers; refreshed after login) */
  rewards?: string[]
  /** Rebooking a past visit: services and artist are prefilled, start at the time step (artist still changeable via back) */
  skipArtist?: boolean
}

type Step = 'services' | 'artist' | 'time' | 'details' | 'confirm' | 'done'

const STEPS: Step[] = ['services', 'artist', 'time', 'details', 'confirm', 'done']

const nextDays = (n: number, tz: string, lang: Lang, today: string, tomorrow: string) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.now() + i * 86_400_000)
    return {
      iso: formatIST(d, 'yyyy-MM-dd', tz),
      dow: i === 0 ? today : i === 1 ? tomorrow : formatDateIn(lang, d, 'EEE', tz),
      day: formatIST(d, 'd', tz),
      month: formatDateIn(lang, d, 'MMM', tz),
    }
  })

export const GroupShare = ({
  slug,
  code,
  salonName,
  start,
  timezone,
  lang,
}: {
  slug: string
  code: string
  salonName: string
  start: string | null
  timezone: string
  lang: Lang
}) => {
  const tr = translator(lang)
  const [copied, setCopied] = useState(false)
  const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/s/${slug}/book?group=${code}`
  const text = tr('groupInviteText', { salon: salonName, date: start ? formatDateIn(lang, start, 'EEE d MMM, h:mm a', timezone) : '', url })
  return (
    <div className='rounded-card border border-brand/40 bg-brand/5 p-4 text-left' data-testid='group-share'>
      <p className='flex items-center gap-2 font-medium'>
        <Users className='text-brand' size={18} /> {tr('groupReady')}
      </p>
      <p className='mt-1 text-sm text-muted'>{tr('groupShareBody')}</p>
      <p className='mt-3 select-all break-all rounded-btn bg-surface px-3 py-2 font-mono text-xs' data-testid='group-link'>
        {url}
      </p>
      <div className='mt-3 grid grid-cols-2 gap-2'>
        <a
          className='flex h-11 items-center justify-center gap-2 rounded-btn bg-[#25D366] text-sm font-medium text-white'
          href={`https://wa.me/?text=${encodeURIComponent(text)}`}
          rel='noopener'
          target='_blank'
        >
          <Send size={16} /> {tr('shareOnWhatsapp')}
        </a>
        <button
          className='flex h-11 items-center justify-center gap-2 rounded-btn border border-line bg-surface text-sm'
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url)
            } catch {}
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }}
          type='button'
        >
          {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? tr('linkCopied') : tr('copyLink')}
        </button>
      </div>
    </div>
  )
}

export const BookingFlow = (p: Props) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tr = translator(p.lang)
  const rescheduling = Boolean(p.reschedule)
  const firstStep: Step = rescheduling ? 'time' : p.initialServiceIds.length ? (p.artists.length > 1 && !p.skipArtist ? 'artist' : 'time') : 'services'
  const [serviceIds, setServiceIds] = useState<Set<string>>(new Set(p.initialServiceIds.map(String)))
  const [staffId, setStaffId] = useState<string | null>(p.initialStaffId ? String(p.initialStaffId) : null)
  const days = useMemo(() => nextDays(21, p.timezone, p.lang, tr('today'), tr('tomorrowShort')), [p.timezone, p.lang, tr])
  const [date, setDate] = useState(p.initialStart ? formatIST(p.initialStart, 'yyyy-MM-dd', p.timezone) : days[0].iso)
  const [slots, setSlots] = useState<{ start: string; staffIds: (string | number)[] }[] | null>(null)
  const [slotsFailed, setSlotsFailed] = useState(false)
  const [slotsTry, setSlotsTry] = useState(0)
  const [start, setStart] = useState<string | null>(rescheduling ? null : (p.initialStart ?? null))
  const [notes, setNotes] = useState('')
  const [inspiration, setInspiration] = useState<{ id: string | number; url: string }[]>([])
  const [uploading, setUploading] = useState(false)
  const [loggedIn, setLoggedIn] = useState(p.loggedIn)
  const [rewards, setRewards] = useState<string[]>(p.rewards ?? [])
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ appointmentId: string | number; status: string } | null>(null)
  const [pending, startTransition] = useTransition()
  const [waitlisted, setWaitlisted] = useState(false)
  const [groupOpen, setGroupOpen] = useState(false)
  const [groupSize, setGroupSize] = useState(3)
  const [occasion, setOccasion] = useState('')
  const [createdGroup, setCreatedGroup] = useState<string | null>(null)

  const selected = p.services.filter((s) => serviceIds.has(String(s.id)))
  const hasMain = selected.some((s) => !s.isAddOn)
  const q = quote(selected, p.depositRule)
  const deposit = p.depositsEnabled && !rescheduling ? q.deposit : 0
  const mains = p.services.filter((s) => !s.isAddOn)
  const addOns = p.services.filter((s) => s.isAddOn)
  const canGroup = Boolean(p.groupBookingEnabled && !p.groupCode && !rescheduling && !p.preBooked)
  const groupCode = p.groupCode ?? createdGroup

  // The step lives in the URL (?step=…) so the phone's back button walks back through the flow.
  const allowed = (s: string | null): s is Step => {
    if (!s || !STEPS.includes(s as Step) || s === 'done') return false
    if (rescheduling) return s === 'time' || (s === 'confirm' && Boolean(start))
    if (s === 'services') return true
    if (!hasMain) return false
    if (s === 'artist') return p.artists.length > 1
    if (s === 'time') return true
    return Boolean(start)
  }
  const urlStep = searchParams.get('step')
  const [step, setStep] = useState<Step>(() => (allowed(urlStep) ? urlStep : firstStep))
  const pushed = useRef(0)
  const booked = useRef<string | number | null>(null)
  useEffect(() => {
    const onPop = () => {
      pushed.current = Math.max(0, pushed.current - 1)
      // Back after booking: show the appointment instead of an old step that would book again.
      if (booked.current !== null) router.replace(`/s/${p.slug}/appointments/${booked.current}`)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [router, p.slug])
  useEffect(() => {
    if (result) return
    const target = allowed(urlStep) ? urlStep : firstStep
    if (target !== step) setStep(target)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlStep])

  const go = (next: Step, params: Record<string, string | null> = {}, replace = false) => {
    setStep(next)
    const url = new URL(window.location.href)
    url.searchParams.set('step', next)
    for (const [k, v] of Object.entries(params)) {
      if (v === null) url.searchParams.delete(k)
      else url.searchParams.set(k, v)
    }
    if (replace) window.history.replaceState(null, '', url.toString())
    else {
      window.history.pushState(null, '', url.toString())
      pushed.current += 1
    }
    window.scrollTo({ top: 0 })
  }

  useEffect(() => {
    if (step !== 'time' || !selected.length) return
    let cancelled = false
    setSlots(null)
    setSlotsFailed(false)
    const failed = () => {
      if (cancelled) return
      setSlots([])
      setSlotsFailed(true)
    }
    slotsFor(p.slug, { date, serviceIds: [...serviceIds], staffId })
      .then((res) => {
        if (cancelled) return
        if (res.ok) setSlots(res.data?.slots ?? [])
        else failed()
      })
      .catch(failed)
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, date, staffId, p.slug, [...serviceIds].join(','), slotsTry])

  // Rewards appear once the customer logs in on the confirm step.
  useEffect(() => {
    if (!loggedIn || rescheduling || step !== 'confirm') return
    let cancelled = false
    bookingRewards(p.slug, p.lang)
      .then((r) => {
        if (!cancelled) setRewards(r)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [loggedIn, step, rescheduling, p.slug, p.lang])

  const toggle = (id: string | number) =>
    setServiceIds((s) => {
      const n = new Set(s)
      if (n.has(String(id))) n.delete(String(id))
      else n.add(String(id))
      return n
    })

  const createGroup = () =>
    startTransition(async () => {
      setError(null)
      if (!start) return
      const res = await startGroup(p.slug, { start, size: groupSize, occasion: occasion || undefined })
      if (!res.ok) return setError(res.error)
      setCreatedGroup(res.data?.code ?? null)
    })

  const submit = () =>
    startTransition(async () => {
      setError(null)
      if (!start) return
      if (p.reschedule) {
        const res = await rescheduleAppointment(p.slug, p.reschedule.id, start)
        if (!res.ok) {
          setError(res.error)
          if (res.code === 'slot-taken') go('time')
          return
        }
        router.push(`/s/${p.slug}/appointments/${p.reschedule.id}?moved=1`)
        router.refresh()
        return
      }
      const res = await book(p.slug, {
        serviceIds: [...serviceIds],
        start,
        staffId,
        designId: p.design?.id ?? null,
        inspirationIds: inspiration.map((i) => i.id),
        notes,
        preBooked: p.preBooked,
        groupCode: groupCode ?? undefined,
      })
      if (!res.ok) {
        setError(res.error)
        if (res.code === 'slot-taken') go('time')
        return
      }
      if (res.data?.payUrl) {
        window.location.href = res.data.payUrl
        return
      }
      booked.current = res.data!.appointmentId
      setResult({ appointmentId: res.data!.appointmentId, status: res.data!.status })
      go('done', {}, true)
      router.refresh()
    })

  const upload = async (file: File) => {
    const fd = new FormData()
    fd.set('file', file)
    setUploading(true)
    setError(null)
    try {
      const res = await uploadInspiration(p.slug, fd)
      if (res.ok && res.data) setInspiration((x) => [...x, res.data!])
      else if (!res.ok) setError(res.error)
    } catch {
      setError(tr('err_generic'))
    } finally {
      setUploading(false)
    }
  }

  const back: Partial<Record<Step, Step>> = rescheduling
    ? { confirm: 'time' }
    : { artist: 'services', time: p.artists.length > 1 ? 'artist' : 'services', details: 'time', confirm: 'details' }
  const goBack = () => {
    const prev = back[step]
    if (!prev) return
    if (pushed.current > 0) window.history.back()
    else go(prev, {}, true)
  }
  const title: Record<Step, string> = {
    services: tr('bkServices'),
    artist: tr('bkArtist'),
    time: rescheduling ? tr('bkReschedule') : tr('bkTime'),
    details: tr('bkDetails'),
    confirm: rescheduling ? tr('bkRescheduleConfirm') : tr('bkConfirm'),
    done: result?.status === 'confirmed' ? tr('bkBooked') : tr('bkRequested'),
  }
  const when = (iso: string) => formatDateIn(p.lang, iso, 'EEEE d MMM · h:mm a', p.timezone)
  const roundBack = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface'

  const Summary = () => (
    <div className='rounded-card border border-line bg-surface p-4 text-sm'>
      {p.design ? (
        <div className='mb-3 flex items-center gap-3'>
          {p.design.image ? <img alt='' className='h-14 w-14 rounded-xl object-cover' src={p.design.image} /> : null}
          <p className='font-medium'>{p.design.title}</p>
        </div>
      ) : null}
      {selected.map((s) => (
        <div className='flex justify-between gap-3 py-1' key={String(s.id)}>
          <span>{s.name}</span>
          <span className='tabular-nums'>{formatINR(s.price)}</span>
        </div>
      ))}
      <div className='mt-2 flex justify-between gap-3 border-t border-line pt-2 font-medium'>
        <span>{tr('totalWith', { duration: formatDurationIn(p.lang, q.durationMinutes) })}</span>
        <span className='tabular-nums'>{formatINR(q.subtotal)}</span>
      </div>
      {!rescheduling && rewards.length ? (
        <ul className='mt-3 space-y-1.5' data-testid='booking-rewards'>
          {rewards.map((r) => (
            <li className='flex items-start gap-2 rounded-btn bg-brand/8 px-3 py-2 text-[13px] text-brand' key={r}>
              <Gift className='mt-0.5 shrink-0' size={14} /> {r}
            </li>
          ))}
        </ul>
      ) : null}
      {p.reschedule ? (
        <p className='mt-3 flex items-center gap-2 text-muted line-through'>
          <Calendar size={14} /> {tr('currentTime', { when: when(p.reschedule.start) })}
        </p>
      ) : null}
      {start ? (
        <p className={cn('flex items-center gap-2', p.reschedule ? 'mt-1 font-medium text-ink' : 'mt-3 text-muted')}>
          <Calendar size={14} /> {p.reschedule ? tr('newTime', { when: when(start) }) : when(start)}
        </p>
      ) : null}
      {staffId ? (
        <p className='mt-1 flex items-center gap-2 text-muted'>
          <UserRound size={14} /> {p.artists.find((a) => String(a.id) === staffId)?.name}
        </p>
      ) : null}
      {deposit > 0 ? <p className='mt-3 rounded-btn bg-accent/15 px-3 py-2 text-[13px]'>{tr('depositNote', { amount: formatINR(deposit) })}</p> : null}
    </div>
  )

  return (
    <div className='px-4 pt-4' data-step={step}>
      <div className='mb-5 flex items-center gap-3'>
        {rescheduling && step === 'time' ? (
          <Link aria-label={tr('back')} className={roundBack} href={`/s/${p.slug}/appointments/${p.reschedule!.id}`}>
            <ArrowLeft size={18} />
          </Link>
        ) : back[step] ? (
          <button aria-label={tr('back')} className={roundBack} data-testid='step-back' onClick={goBack} type='button'>
            <ArrowLeft size={18} />
          </button>
        ) : null}
        <h1 className='font-heading text-2xl leading-tight'>{title[step]}</h1>
      </div>
      {p.groupCode ? (
        <p className='mb-4 rounded-btn bg-brand/10 px-3 py-2 text-sm text-brand' data-testid='joining-group'>
          {p.group?.organiser ? tr('joiningGroup', { name: p.group.organiser }) : tr('joiningGroupCode', { code: p.groupCode })}
          {p.group?.occasion ? ` · ${p.group.occasion}` : ''}
        </p>
      ) : null}
      {p.reschedule && step === 'time' ? (
        <p className='mb-4 rounded-btn bg-tint px-3 py-2 text-sm text-muted'>{tr('currentTime', { when: when(p.reschedule.start) })}</p>
      ) : null}
      {error ? (
        <p className='mb-4 rounded-btn bg-red-500/10 px-4 py-3 text-sm text-red-700' role='alert'>
          {error}
        </p>
      ) : null}

      {step === 'services' ? (
        <div className='space-y-2'>
          {mains.map((s) => {
            const on = serviceIds.has(String(s.id))
            return (
              <button
                aria-pressed={on}
                className={cn(
                  'flex w-full items-center justify-between gap-3 rounded-card border p-4 text-left transition',
                  on ? 'border-brand bg-brand/6' : 'border-line bg-surface',
                )}
                key={String(s.id)}
                onClick={() => toggle(s.id)}
                type='button'
              >
                <span className='min-w-0'>
                  <span className='block font-medium'>{s.name}</span>
                  <span className='text-xs text-muted'>{formatDurationIn(p.lang, s.durationMinutes)}</span>
                </span>
                <span className='flex shrink-0 items-center gap-3'>
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
          {addOns.length ? <p className='pt-3 text-xs font-semibold uppercase tracking-wider text-muted'>{tr('addOns')}</p> : null}
          <div className='flex flex-wrap gap-2'>
            {addOns.map((s) => (
              <button
                aria-pressed={serviceIds.has(String(s.id))}
                className={cn(
                  'min-h-11 rounded-full border px-4 py-2 text-sm',
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
          <StickyBar testId='services-bar'>
            {hasMain ? (
              <Button
                className='w-full'
                onClick={() => go(p.artists.length > 1 ? 'artist' : 'time', { services: [...serviceIds].join(','), start: null })}
                size='lg'
              >
                {tr('continueWith', { price: formatINR(q.subtotal) })}
              </Button>
            ) : (
              <p className='flex h-14 items-center justify-center rounded-btn border border-dashed border-line text-[15px] text-muted'>{tr('pickService')}</p>
            )}
          </StickyBar>
        </div>
      ) : null}

      {step === 'artist' ? (
        <div className='space-y-2'>
          {[{ id: '', name: tr('anyoneAvailable'), specialties: [tr('fastestOption')] } as FlowArtist, ...p.artists].map((a) => {
            const on = (staffId ?? '') === String(a.id)
            return (
              <button
                aria-pressed={on}
                className={cn('flex w-full items-center gap-4 rounded-card border p-3 text-left', on ? 'border-brand bg-brand/6' : 'border-line bg-surface')}
                key={String(a.id) || 'any'}
                onClick={() => {
                  setStaffId(a.id ? String(a.id) : null)
                  go('time', { staff: a.id ? String(a.id) : 'any' })
                }}
                type='button'
              >
                {a.avatar ? (
                  <img alt='' className='h-12 w-12 rounded-full object-cover' src={a.avatar} />
                ) : (
                  <span className='flex h-12 w-12 items-center justify-center rounded-full bg-tint font-heading text-brand'>{a.id ? a.name[0] : '★'}</span>
                )}
                <span className='min-w-0 flex-1'>
                  <span className='block font-medium'>{a.name}</span>
                  {a.specialties?.length ? <span className='text-xs text-muted'>{a.specialties.join(' · ')}</span> : null}
                </span>
                {on ? <Check className='shrink-0 text-brand' size={18} /> : null}
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
                aria-pressed={date === d.iso}
                className={cn(
                  'flex w-16 shrink-0 flex-col items-center rounded-card border py-2.5',
                  date === d.iso ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface',
                )}
                data-testid='day'
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
              <div className='flex items-center justify-center py-10 text-muted' role='status'>
                <Loader2 className='animate-spin' />
              </div>
            ) : slotsFailed ? (
              <div className='rounded-card border border-dashed border-line p-6 text-center' data-testid='slots-error' role='alert'>
                <p className='font-medium'>{tr('slotsError')}</p>
                <Button className='mt-4' onClick={() => setSlotsTry((n) => n + 1)} variant='outline'>
                  <RotateCcw size={16} /> {tr('retry')}
                </Button>
              </div>
            ) : slots.length === 0 ? (
              <div className='rounded-card border border-dashed border-line p-6 text-center' data-testid='fully-booked'>
                <p className='font-medium'>{tr('fullyBooked')}</p>
                <p className='mt-1 text-sm text-muted'>{rescheduling ? tr('fullyBookedTryAnother') : tr('fullyBookedBody')}</p>
                {loggedIn && !rescheduling ? (
                  <Button
                    className='mt-4'
                    disabled={waitlisted || pending}
                    onClick={() =>
                      startTransition(async () => {
                        const res = await addToWaitlist(p.slug, { serviceIds: [...serviceIds], date })
                        if (res.ok) setWaitlisted(true)
                        else setError(res.error)
                      })
                    }
                    variant='outline'
                  >
                    {waitlisted ? tr('onWaitlist') : tr('joinWaitlist')}
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className='grid grid-cols-3 gap-2'>
                {slots.map((s) => (
                  <button
                    className={cn(
                      'min-h-12 rounded-btn border px-1 py-3 text-sm tabular-nums',
                      start === s.start ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface',
                    )}
                    data-testid='slot'
                    key={s.start}
                    onClick={() => {
                      setStart(s.start)
                      go(rescheduling ? 'confirm' : 'details', rescheduling ? {} : { start: s.start })
                    }}
                    type='button'
                  >
                    {formatDateIn(p.lang, s.start, 'h:mm a', p.timezone)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {step === 'details' ? (
        <div className='space-y-5'>
          <div>
            <p className='mb-1 text-sm font-medium'>{tr('inspirationTitle')}</p>
            <p className='mb-3 text-xs text-muted'>{tr('inspirationBody')}</p>
            <div className='flex flex-wrap gap-2'>
              {inspiration.map((i) => (
                <img alt='' className='h-20 w-20 rounded-xl object-cover' key={String(i.id)} src={i.url} />
              ))}
              {uploading ? (
                <span
                  className='flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border border-line bg-tint text-muted'
                  data-testid='inspiration-uploading'
                  role='status'
                >
                  <Loader2 className='animate-spin' size={20} />
                  <span className='text-[10px]'>{tr('uploading')}</span>
                </span>
              ) : null}
              <label
                className={cn(
                  'flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-line text-muted',
                  uploading ? 'pointer-events-none opacity-50' : '',
                )}
              >
                <ImagePlus size={20} />
                <span className='text-[10px]'>{tr('add')}</span>
                <input
                  accept='image/*'
                  className='hidden'
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    e.target.value = ''
                    if (file) void upload(file)
                  }}
                  type='file'
                />
              </label>
            </div>
          </div>
          <div>
            <label className='mb-2 block text-sm font-medium' htmlFor='bk-notes'>
              {tr('notesTitle')}
            </label>
            <Textarea
              className='rounded-card'
              id='bk-notes'
              onChange={(e) => setNotes(e.target.value)}
              placeholder={tr('notesPlaceholder')}
              rows={3}
              value={notes}
            />
          </div>
          <StickyBar>
            <Button className='w-full' disabled={uploading} onClick={() => go('confirm')} size='lg'>
              {uploading ? <Loader2 className='animate-spin' size={18} /> : null} {tr('reviewBooking')}
            </Button>
          </StickyBar>
        </div>
      ) : null}

      {step === 'confirm' ? (
        <div className='space-y-4'>
          <Summary />
          {p.cancellationPolicy ? <p className='text-xs text-muted'>{p.cancellationPolicy}</p> : null}
          {loggedIn ? (
            <>
              {canGroup ? (
                createdGroup ? (
                  <GroupShare code={createdGroup} lang={p.lang} salonName={p.salonName} slug={p.slug} start={start} timezone={p.timezone} />
                ) : (
                  <div className='rounded-card border border-line bg-surface p-4'>
                    <button
                      aria-expanded={groupOpen}
                      className='flex min-h-11 w-full items-center gap-3 text-left'
                      onClick={() => setGroupOpen((o) => !o)}
                      type='button'
                    >
                      <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand'>
                        <Users size={18} />
                      </span>
                      <span className='min-w-0 flex-1'>
                        <span className='block font-medium'>{tr('withFriends')}</span>
                        <span className='mt-0.5 block text-xs leading-snug text-muted'>{tr('withFriendsBody')}</span>
                      </span>
                      <ArrowRight className={cn('shrink-0 text-muted transition', groupOpen ? 'rotate-90' : '')} size={16} />
                    </button>
                    {groupOpen ? (
                      <div className='mt-4 space-y-3'>
                        <div className='flex items-center justify-between gap-3'>
                          <Label className='mb-0'>{tr('groupSize')}</Label>
                          <div className='flex shrink-0 items-center gap-2'>
                            <button
                              aria-label='-'
                              className='flex h-11 w-11 items-center justify-center rounded-full border border-line'
                              onClick={() => setGroupSize((n) => Math.max(2, n - 1))}
                              type='button'
                            >
                              <Minus size={16} />
                            </button>
                            <span className='w-6 text-center font-heading text-xl tabular-nums' data-testid='group-size'>
                              {groupSize}
                            </span>
                            <button
                              aria-label='+'
                              className='flex h-11 w-11 items-center justify-center rounded-full border border-line'
                              onClick={() => setGroupSize((n) => Math.min(20, n + 1))}
                              type='button'
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor='g-occasion'>{tr('occasionOptional')}</Label>
                          <Input
                            id='g-occasion'
                            maxLength={80}
                            onChange={(e) => setOccasion(e.target.value)}
                            placeholder={tr('occasionPlaceholder')}
                            value={occasion}
                          />
                        </div>
                        <Button className='w-full' disabled={pending} onClick={createGroup} variant='secondary'>
                          {pending ? <Loader2 className='animate-spin' size={16} /> : <Users size={16} />} {tr('withFriends')}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                )
              ) : null}
              <StickyBar>
                <Button className='w-full' disabled={pending} onClick={submit} size='lg'>
                  {pending ? <Loader2 className='animate-spin' size={18} /> : null}
                  {rescheduling
                    ? pending
                      ? tr('moving')
                      : tr('moveAppointment')
                    : pending
                      ? tr('booking')
                      : deposit > 0
                        ? tr('payDepositBook', { amount: formatINR(deposit) })
                        : tr('confirmBooking')}
                </Button>
              </StickyBar>
            </>
          ) : (
            <div className='rounded-card border border-line bg-surface p-4'>
              <p className='mb-4 font-medium'>{tr('loginToConfirm')}</p>
              <LoginForm lang={p.lang} onDone={() => setLoggedIn(true)} salonName={p.salonName} slug={p.slug} />
            </div>
          )}
        </div>
      ) : null}

      {step === 'done' && result ? (
        <div className='space-y-4 text-center'>
          <div className='mx-auto mt-4 flex h-20 w-20 items-center justify-center rounded-full bg-brand text-on-brand'>
            <Check size={36} />
          </div>
          <p className='text-muted'>{result.status === 'confirmed' ? tr('sentToWhatsapp') : tr('willConfirm', { salon: p.salonName })}</p>
          <Summary />
          {createdGroup ? <GroupShare code={createdGroup} lang={p.lang} salonName={p.salonName} slug={p.slug} start={start} timezone={p.timezone} /> : null}
          <div className='grid grid-cols-3 gap-2'>
            <a
              className='flex min-h-16 flex-col items-center justify-center gap-1 rounded-card border border-line bg-surface py-3 text-xs'
              href={`/s/${p.slug}/appointments/${result.appointmentId}/ics`}
            >
              <Calendar size={18} /> {tr('calendar')}
            </a>
            {p.mapUrl ? (
              <a
                className='flex min-h-16 flex-col items-center justify-center gap-1 rounded-card border border-line bg-surface py-3 text-xs'
                href={p.mapUrl}
                rel='noopener'
                target='_blank'
              >
                <MapPin size={18} /> {tr('directions')}
              </a>
            ) : null}
            <a
              className='flex min-h-16 flex-col items-center justify-center gap-1 rounded-card border border-line bg-surface py-3 text-xs'
              href={`https://wa.me/?text=${encodeURIComponent(tr('bringFriendText', { salon: p.salonName, url: `${typeof window !== 'undefined' ? window.location.origin : ''}/s/${p.slug}` }))}`}
              rel='noopener'
              target='_blank'
            >
              <Share2 size={18} /> {tr('bringFriend')}
            </a>
          </div>
          <Link className='flex min-h-11 items-center justify-center text-sm font-medium text-brand' href={`/s/${p.slug}/appointments/${result.appointmentId}`}>
            {tr('yourAppointment')}
          </Link>
          <Link className='flex min-h-11 items-center justify-center text-sm font-medium text-muted' href={`/s/${p.slug}`}>
            {tr('backHome')}
          </Link>
        </div>
      ) : null}
    </div>
  )
}
