'use client'
import { formatIST } from '@salon/core'
import { Button, cn, Input } from '@salon/ui'
import { Check, Loader2 } from 'lucide-react'
import { useEffect, useState, useTransition } from 'react'
import { demoMessages, presenter, setDemoPhone } from '@/app/(site)/console/actions'

// In the order of the sales demo script (DEMO.md).
const CONTROLS = [
  ['complete-visit', 'Complete visit', 'Their booking is done: scratch card, points, refill journey'],
  ['send-reveal', 'Send nail reveal', 'Photos + Instagram story + WhatsApp Status'],
  ['rating-request', 'Ask for rating', 'The +2 hour rating message'],
  ['fast-forward', 'Fast-forward 3 weeks', 'Refill reminder with one-tap rebook'],
  ['friend-accepts', 'Friend accepts invite', 'Friend books, visits, both rewarded'],
  ['low-rating', 'Low rating arrives', "Owner alert: 'call her today'"],
  ['festival-pack', 'Launch festival pack', 'Festival offer to everyone with consent'],
  ['close-contest', 'Close contest', 'Winner gets a free set'],
  ['switch-theme', 'Switch look', 'Blush → Noir & Gold → Studio White'],
  ['switch-language', 'Switch language', 'English → Gujarati → Hindi'],
] as const

type Msg = Awaited<ReturnType<typeof demoMessages>>[number]
type Status = { tone: 'ok' | 'error' | 'busy'; text: string }

export const Presenter = ({ slug, phone, qr, chairQr }: { slug: string; phone: string; qr: string; chairQr: string }) => {
  const [p, setP] = useState(phone)
  const [saved, setSaved] = useState(Boolean(phone))
  const [status, setStatus] = useState<Status | null>(null)
  const [running, setRunning] = useState<string | null>(null)
  const [done, setDone] = useState<Set<string>>(new Set())
  const [messages, setMessages] = useState<Msg[]>([])
  const [pending, start] = useTransition()
  useEffect(() => {
    let alive = true
    const tick = () =>
      demoMessages(slug)
        .then((m) => alive && setMessages(m))
        .catch(() => {})
    tick()
    const t = setInterval(tick, 3000)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [slug])
  const run = (action: string, label: string) => {
    setRunning(action)
    setStatus({ tone: 'busy', text: `${label}…` })
    start(async () => {
      const r = await presenter(slug, action)
      setRunning(null)
      setStatus(r.ok ? { tone: 'ok', text: r.message ?? 'Done' } : { tone: 'error', text: r.error })
      if (r.ok) setDone((d) => (action === 'reset' ? new Set() : new Set(d).add(action)))
    })
  }
  return (
    <div>
      {/* Status sits at the top so it is visible on a projected laptop without scrolling. */}
      <div
        aria-live='polite'
        className={cn(
          'sticky top-16 z-10 mb-4 flex min-h-12 items-center gap-2 rounded-card px-4 text-sm shadow-sm',
          !status && 'bg-tint text-muted',
          status?.tone === 'busy' && 'bg-amber-100 text-amber-900',
          status?.tone === 'ok' && 'bg-emerald-100 text-emerald-900',
          status?.tone === 'error' && 'bg-red-100 text-red-900',
        )}
      >
        {status?.tone === 'busy' ? <Loader2 className='animate-spin' size={16} /> : status?.tone === 'ok' ? <Check size={16} /> : null}
        {status?.text ?? (saved ? 'Ready. Hand them the QR, then use the controls in order.' : "Start with the owner's phone number.")}
      </div>
      <div className='grid gap-6 lg:grid-cols-[1fr_340px]'>
        <div className='space-y-5'>
          <div className='rounded-card border border-line bg-surface p-5'>
            <p className='font-medium'>1 · Owner's phone (with their consent)</p>
            <div className='mt-3 flex gap-2'>
              <Input aria-label="Owner's phone" inputMode='tel' onChange={(e) => setP(e.target.value)} placeholder='98250 12345' value={p} />
              <Button
                disabled={pending || !p}
                onClick={() =>
                  start(async () => {
                    const r = await setDemoPhone(slug, p)
                    setSaved(r.ok)
                    setStatus(r.ok ? { tone: 'ok', text: r.message ?? 'Saved' } : { tone: 'error', text: r.error })
                  })
                }
              >
                Save
              </Button>
            </div>
            <div className='mt-4 grid grid-cols-2 gap-4'>
              <figure className='text-center'>
                <img alt='Scan to open the salon app' className='mx-auto h-32 w-32 rounded-lg border border-line' src={qr} />
                <figcaption className='mt-1 text-xs text-muted'>2 · Salon app: browse & book</figcaption>
              </figure>
              <figure className='text-center'>
                <img alt='Scan to open chair mode' className='mx-auto h-32 w-32 rounded-lg border border-line' src={chairQr} />
                <figcaption className='mt-1 text-xs text-muted'>3 · In the chair: Wi-Fi, care, scratch card</figcaption>
              </figure>
            </div>
          </div>
          <div className='grid gap-2 sm:grid-cols-2'>
            {CONTROLS.map(([key, label, hint], i) => (
              <button
                aria-busy={running === key}
                className={cn(
                  'flex min-h-16 items-start gap-3 rounded-card border p-4 text-left transition hover:border-brand disabled:opacity-60',
                  running === key ? 'border-brand bg-brand/5' : 'border-line bg-surface',
                )}
                disabled={pending}
                key={key}
                onClick={() => run(key, label)}
                type='button'
              >
                <span className='mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-tint text-xs'>
                  {running === key ? <Loader2 className='animate-spin' size={14} /> : done.has(key) ? <Check size={14} /> : i + 1}
                </span>
                <span>
                  <span className='block font-medium'>{label}</span>
                  <span className='text-xs text-muted'>{hint}</span>
                </span>
              </button>
            ))}
          </div>
          <button
            className='min-h-12 w-full rounded-card border border-dashed border-line text-sm text-muted hover:border-brand'
            disabled={pending}
            onClick={() => {
              if (window.confirm('Reset the demo for the next meeting? Their visit, messages and sample people are removed.')) run('reset', 'Resetting')
            }}
            type='button'
          >
            Reset demo for the next meeting
          </button>
        </div>
        <div className='mx-auto w-full max-w-[340px] lg:sticky lg:top-32 lg:self-start'>
          <div className='overflow-hidden rounded-[36px] border-[10px] border-neutral-900 bg-[#E5DDD5] shadow-xl'>
            <div className='bg-[#075E54] px-4 py-3 text-sm font-medium text-white'>WhatsApp preview</div>
            <div className='flex h-[min(560px,60vh)] flex-col-reverse gap-2 overflow-y-auto p-3'>
              {messages.map((m) => (
                <div
                  className={cn(
                    'max-w-[88%] rounded-xl px-3 py-2 text-[13px] shadow-sm',
                    m.audience === 'owner' ? 'self-end bg-[#DCF8C6]' : 'self-start bg-white',
                    m.status === 'skipped' && 'opacity-50',
                  )}
                  key={String(m.id)}
                >
                  <p className='mb-0.5 text-[10px] font-semibold uppercase text-black/40'>
                    {m.audience === 'owner' ? 'To owner' : 'To customer'}
                    {m.status === 'skipped' ? ' · not sent (no consent or weekly limit)' : ''}
                  </p>
                  <p className='whitespace-pre-wrap text-black'>{m.body}</p>
                  <p className='mt-1 text-right text-[10px] text-black/40'>{formatIST(m.at, 'h:mm a')}</p>
                </div>
              ))}
              {messages.length === 0 ? <p className='m-auto text-center text-xs text-black/50'>Messages appear here as they are sent.</p> : null}
            </div>
          </div>
          <p className='mt-2 text-center text-xs text-muted'>With the live WhatsApp provider on, these also arrive on the owner's real phone.</p>
        </div>
      </div>
    </div>
  )
}
