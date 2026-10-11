'use client'
import { formatIST } from '@salon/core'
import { Button, cn, Input } from '@salon/ui'
import { useEffect, useState, useTransition } from 'react'
import { demoMessages, presenter, setDemoPhone } from '@/app/(site)/console/actions'

const CONTROLS = [
  ['complete-visit', 'Complete visit', 'Their booking is done: scratch card, points, journey'],
  ['send-reveal', 'Send nail reveal', 'Photos + Instagram story + WhatsApp Status'],
  ['rating-request', 'Ask for rating', 'The +2 hour rating message'],
  ['fast-forward', 'Fast-forward 3 weeks', 'Refill reminder arrives'],
  ['friend-accepts', 'Friend accepts invite', 'Friend books, visits, both rewarded'],
  ['low-rating', 'Low rating arrives', "Owner alert: 'call her'"],
  ['festival-pack', 'Launch festival pack', 'Navratri offer to everyone with consent'],
  ['close-contest', 'Close contest', 'Winner gets a free set'],
  ['switch-theme', 'Switch theme', 'Blush → Noir & Gold → Studio White'],
  ['switch-language', 'Switch language', 'English → Gujarati → Hindi'],
  ['reset', 'Reset demo', 'Clear the demo customer for the next meeting'],
] as const

type Msg = Awaited<ReturnType<typeof demoMessages>>[number]

export const Presenter = ({ slug, phone, qr }: { slug: string; phone: string; qr: string }) => {
  const [p, setP] = useState(phone)
  const [log, setLog] = useState<string[]>([])
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
  const run = (action: string) =>
    start(async () => {
      const r = await presenter(slug, action)
      setLog((l) => [`${new Date().toLocaleTimeString()} · ${r.ok ? (r.message ?? 'Done') : `⚠ ${r.error}`}`, ...l].slice(0, 8))
    })
  return (
    <div className='grid gap-8 lg:grid-cols-[1fr_360px]'>
      <div className='space-y-6'>
        <div className='rounded-card border border-line bg-surface p-5'>
          <p className='font-medium'>1 · Owner's phone (with their consent)</p>
          <div className='mt-3 flex gap-2'>
            <Input onChange={(e) => setP(e.target.value)} placeholder='98250 12345' value={p} />
            <Button
              disabled={pending || !p}
              onClick={() =>
                start(async () => {
                  const r = await setDemoPhone(slug, p)
                  setLog((l) => [r.ok ? (r.message ?? 'Saved') : `⚠ ${r.error}`, ...l])
                })
              }
            >
              Save
            </Button>
          </div>
          <div className='mt-4 flex items-center gap-4'>
            <img alt='Scan to open the salon app' className='h-32 w-32 rounded-lg border border-line' src={qr} />
            <p className='text-sm text-muted'>
              2 · Hand them the QR stand. They scan, browse their own designs and book with this number. Then use the controls.
            </p>
          </div>
        </div>
        <div className='grid gap-2 sm:grid-cols-2'>
          {CONTROLS.map(([key, label, hint]) => (
            <button
              className={cn(
                'rounded-card border p-4 text-left transition hover:border-brand',
                key === 'reset' ? 'border-dashed border-line' : 'border-line bg-surface',
              )}
              disabled={pending}
              key={key}
              onClick={() => run(key)}
              type='button'
            >
              <span className='block font-medium'>{label}</span>
              <span className='text-xs text-muted'>{hint}</span>
            </button>
          ))}
        </div>
        <div className='rounded-card bg-tint p-4 text-sm'>
          {log.length ? log.map((l, i) => <p key={i}>{l}</p>) : <p className='text-muted'>Actions you trigger show up here.</p>}
        </div>
      </div>
      <div className='mx-auto w-full max-w-[340px]'>
        <div className='overflow-hidden rounded-[36px] border-[10px] border-neutral-900 bg-[#E5DDD5] shadow-xl'>
          <div className='bg-[#075E54] px-4 py-3 text-sm font-medium text-white'>WhatsApp preview</div>
          <div className='flex h-[560px] flex-col-reverse gap-2 overflow-y-auto p-3'>
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
                  {m.status === 'skipped' ? ' · skipped (cap/consent)' : ''}
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
  )
}
