'use client'
import { formatIST } from '@salon/core'
import { Badge, Button, buttonClass, cn, Input, Label, Textarea } from '@salon/ui'
import { Sheet } from '@salon/ui/client'
import { CalendarClock, Check, Loader2, MoreHorizontal, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { cancelAppt, confirmAppt, noShow, rescheduleAppt, staffSlots } from '@/app/(site)/studio/[salon]/actions'
import { ConfirmSheet } from './ConfirmSheet'
import { LateButton } from './LateButton'
import { toast } from './Toast'

export interface ApptSummary {
  id: string | number
  start: string
  end: string
  status: string
  customerName: string
  serviceIds: (string | number)[]
  staffId?: string | number | null
}

const UNDO_MS = 5000

const DECLINE_REASONS = ['Fully booked at that time', 'Artist not available', 'Salon closed that day']

/**
 * Everything staff can do with one appointment. Confirm waits a few seconds (with Undo) before the customer is told.
 */
export const ApptActions = ({
  slug,
  appt,
  past,
  timezone,
  team,
  manager,
  onChanged,
}: {
  slug: string
  appt: ApptSummary
  past: boolean
  timezone: string
  team: { id: string | number; name: string }[]
  manager: boolean
  onChanged?: () => void
}) => {
  const router = useRouter()
  const [status, setStatus] = useState(appt.status)
  const [confirming, setConfirming] = useState(false)
  const [sheet, setSheet] = useState<null | 'more' | 'decline' | 'move' | 'noshow'>(null)
  const [pending, start] = useTransition()
  const commit = useRef<(() => void) | null>(null)
  useEffect(() => setStatus(appt.status), [appt.status])
  // Leaving the page during the undo window still confirms.
  useEffect(() => () => commit.current?.(), [])

  const when = formatIST(appt.start, 'EEE d MMM, h:mm a', timezone)
  const refresh = () => {
    onChanged?.()
    router.refresh()
  }

  const confirm = () => {
    setConfirming(true)
    let undone = false
    const run = async () => {
      commit.current = null
      if (undone) return
      const r = await confirmAppt(slug, appt.id)
      setConfirming(false)
      if (!r.ok) return void toast({ message: r.error, tone: 'error' })
      setStatus('confirmed')
      refresh()
    }
    commit.current = () => void run()
    const timer = setTimeout(() => commit.current?.(), UNDO_MS)
    toast({
      message: `Confirmed ${appt.customerName.split(' ')[0]} for ${when}. They'll get a WhatsApp.`,
      tone: 'success',
      duration: UNDO_MS,
      action: {
        label: 'Undo',
        onClick: () => {
          undone = true
          commit.current = null
          clearTimeout(timer)
          setConfirming(false)
          toast('Not confirmed')
        },
      },
    })
  }

  const big = 'md' as const
  if (status === 'cancelled') return <Badge tone='muted'>Cancelled</Badge>
  if (status === 'no-show') return <Badge tone='danger'>No-show</Badge>
  if (status === 'completed') return null

  return (
    <div className='flex flex-wrap items-center gap-1.5'>
      {status === 'requested' ? (
        confirming ? (
          <span className='inline-flex min-h-11 items-center gap-2 text-sm text-emerald-800'>
            <Check size={16} /> Confirming…
          </span>
        ) : (
          <>
            <Button disabled={pending} onClick={confirm} size={big}>
              Confirm
            </Button>
            <Button disabled={pending} onClick={() => setSheet('decline')} size={big} variant='secondary'>
              Decline
            </Button>
          </>
        )
      ) : null}
      {status === 'confirmed' && !confirming ? (
        <Link className={buttonClass('primary', big, 'px-4')} href={`/studio/${slug}/checkout?appointment=${appt.id}`}>
          Check out
        </Link>
      ) : null}
      {status === 'confirmed' && !past ? <LateButton id={appt.id} slug={slug} /> : null}
      <button
        aria-label='More actions'
        className='inline-flex h-11 w-11 items-center justify-center rounded-btn border border-line bg-surface hover:border-brand'
        onClick={() => setSheet('more')}
        type='button'
      >
        <MoreHorizontal size={18} />
      </button>

      <Sheet onOpenChange={(o: boolean) => setSheet(o ? 'more' : null)} open={sheet === 'more'} title={`${appt.customerName} · ${when}`}>
        <div className='grid gap-2'>
          <Button onClick={() => setSheet('move')} size='lg' variant='secondary'>
            <CalendarClock size={18} /> Reschedule
          </Button>
          {status === 'confirmed' ? (
            <Link className={buttonClass('secondary', 'lg')} href={`/studio/${slug}/checkout?appointment=${appt.id}`}>
              Check out
            </Link>
          ) : null}
          {status === 'confirmed' && past ? (
            <Button onClick={() => setSheet('noshow')} size='lg' variant='secondary'>
              Mark no-show
            </Button>
          ) : null}
          <Button className='text-red-700' onClick={() => setSheet('decline')} size='lg' variant='secondary'>
            <X size={18} /> {status === 'requested' ? 'Decline request' : 'Cancel appointment'}
          </Button>
        </div>
      </Sheet>

      <DeclineSheet
        appt={appt}
        onDone={() => {
          setSheet(null)
          setStatus('cancelled')
          refresh()
        }}
        onOpenChange={(o) => setSheet(o ? 'decline' : null)}
        open={sheet === 'decline'}
        requested={status === 'requested'}
        slug={slug}
        when={when}
      />

      <ConfirmSheet
        confirmLabel='Mark no-show'
        danger
        onConfirm={() =>
          start(async () => {
            const r = await noShow(slug, appt.id)
            if (!r.ok) return void toast({ message: r.error, tone: 'error' })
            setSheet(null)
            setStatus('no-show')
            toast('Marked as no-show')
            refresh()
          })
        }
        onOpenChange={(o) => setSheet(o ? 'noshow' : null)}
        open={sheet === 'noshow'}
        pending={pending}
        title={`${appt.customerName} didn't come?`}
      >
        <p className='text-muted'>This counts towards their no-show history. Any deposit stays with the salon.</p>
      </ConfirmSheet>

      {sheet === 'move' ? (
        <RescheduleSheet
          appt={appt}
          manager={manager}
          onClose={() => setSheet(null)}
          onDone={() => {
            setSheet(null)
            setStatus('confirmed')
            refresh()
          }}
          slug={slug}
          team={team}
          timezone={timezone}
        />
      ) : null}
    </div>
  )
}

const DeclineSheet = ({
  open,
  onOpenChange,
  appt,
  slug,
  when,
  requested,
  onDone,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  appt: ApptSummary
  slug: string
  when: string
  requested: boolean
  onDone: () => void
}) => {
  const [reason, setReason] = useState('')
  const [pending, start] = useTransition()
  return (
    <ConfirmSheet
      confirmLabel={requested ? 'Decline and tell them' : 'Cancel and tell them'}
      danger
      onConfirm={() =>
        start(async () => {
          const r = await cancelAppt(slug, appt.id, reason)
          if (!r.ok) return void toast({ message: r.error, tone: 'error' })
          toast({ message: `${requested ? 'Declined' : 'Cancelled'}. ${appt.customerName.split(' ')[0]} was told on WhatsApp.`, tone: 'success' })
          onDone()
        })
      }
      onOpenChange={onOpenChange}
      open={open}
      pending={pending}
      title={requested ? 'Decline this request?' : 'Cancel this appointment?'}
      cancelLabel='Keep it'
    >
      <p className='text-muted'>
        {appt.customerName} · {when}. They get a WhatsApp with a link to book another time. Deposits are refunded by your payment rules.
      </p>
      <div className='flex flex-wrap gap-2'>
        {DECLINE_REASONS.map((r) => (
          <button
            className={cn('min-h-11 rounded-full border px-3 text-sm', reason === r ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface')}
            key={r}
            onClick={() => setReason(r)}
            type='button'
          >
            {r}
          </button>
        ))}
      </div>
      <div>
        <Label htmlFor={`reason-${appt.id}`}>Reason (saved on the appointment)</Label>
        <Textarea id={`reason-${appt.id}`} onChange={(e) => setReason(e.target.value)} rows={2} value={reason} />
      </div>
    </ConfirmSheet>
  )
}

const PART: [string, number, number][] = [
  ['Morning', 0, 12],
  ['Afternoon', 12, 17],
  ['Evening', 17, 24],
]

export const RescheduleSheet = ({
  slug,
  appt,
  team,
  manager,
  timezone,
  onClose,
  onDone,
}: {
  slug: string
  appt: ApptSummary
  team: { id: string | number; name: string }[]
  manager: boolean
  timezone: string
  onClose: () => void
  onDone: () => void
}) => {
  const [date, setDate] = useState(formatIST(appt.start, 'yyyy-MM-dd', timezone))
  const [artist, setArtist] = useState<string | number | null>(appt.staffId ?? null)
  const [loaded, setLoaded] = useState<{ key: string; list: { start: string }[] } | null>(null)
  const slotKey = `${date}|${artist ?? ''}`
  const slots = loaded?.key === slotKey ? loaded.list : null
  const [picked, setPicked] = useState<string | null>(null)
  const [pending, start] = useTransition()
  useEffect(() => {
    setPicked(null)
    let live = true
    staffSlots(slug, { date, serviceIds: appt.serviceIds, staffId: artist }).then((r) => {
      if (live) setLoaded({ key: slotKey, list: r.ok ? (r.data ?? []) : [] })
    })
    return () => {
      live = false
    }
  }, [date, artist, slug, appt.serviceIds, slotKey])
  const today = formatIST(new Date(), 'yyyy-MM-dd', timezone)
  return (
    <Sheet onOpenChange={(o: boolean) => (o ? undefined : onClose())} open title='Move to another time'>
      <div className='space-y-4 text-sm'>
        <p className='text-muted'>
          {appt.customerName} · now {formatIST(appt.start, 'EEE d MMM, h:mm a', timezone)}. They get a WhatsApp with the new time.
        </p>
        <div>
          <Label htmlFor={`move-date-${appt.id}`}>Day</Label>
          <Input id={`move-date-${appt.id}`} min={today} onChange={(e) => e.target.value && setDate(e.target.value)} type='date' value={date} />
        </div>
        {manager && team.length > 1 ? (
          <div className='flex flex-wrap gap-2'>
            {team.map((t) => (
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
        ) : null}
        {slots === null ? <Loader2 className='animate-spin text-muted' /> : null}
        {slots?.length === 0 ? <p className='text-muted'>No free time that day.</p> : null}
        {PART.map(([label, from, to]) => {
          const list = (slots ?? []).filter((s) => {
            const h = Number(formatIST(s.start, 'H', timezone))
            return h >= from && h < to
          })
          if (!list.length) return null
          return (
            <div key={label}>
              <p className='mb-2 text-xs font-semibold uppercase tracking-wider text-muted'>{label}</p>
              <div className='grid grid-cols-3 gap-2'>
                {list.map((s) => (
                  <button
                    aria-pressed={picked === s.start}
                    className={cn(
                      'min-h-11 rounded-btn border tabular-nums',
                      picked === s.start ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface',
                    )}
                    key={s.start}
                    onClick={() => setPicked(s.start)}
                    type='button'
                  >
                    {formatIST(s.start, 'h:mm a', timezone)}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
        <div className='sticky bottom-0 -mx-5 bg-bg px-5 pb-1 pt-2'>
          <Button
            className='w-full'
            disabled={!picked || pending}
            onClick={() =>
              start(async () => {
                if (!picked) return
                const r = await rescheduleAppt(slug, appt.id, picked, manager ? artist : null)
                if (!r.ok) return void toast({ message: r.error, tone: 'error' })
                toast({ message: `Moved to ${formatIST(picked, 'EEE d MMM, h:mm a', timezone)}. Customer told on WhatsApp.`, tone: 'success' })
                onDone()
              })
            }
            size='lg'
          >
            {pending ? <Loader2 className='animate-spin' /> : picked ? `Move to ${formatIST(picked, 'EEE d MMM, h:mm a', timezone)}` : 'Pick a time'}
          </Button>
        </div>
      </div>
    </Sheet>
  )
}
