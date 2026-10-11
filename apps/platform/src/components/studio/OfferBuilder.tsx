'use client'
import { formatINR } from '@salon/core'
import { Button, cn, Input, Label, Textarea } from '@salon/ui'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { audienceSize, type OfferInput, saveOffer } from '@/app/(site)/studio/[salon]/actions'

const SEGMENTS = [
  ['due', 'Due for a refill'],
  ['at-risk', 'At risk'],
  ['lapsed', 'Lapsed'],
  ['regular', 'Regulars'],
  ['new', 'New'],
] as const

export const OfferBuilder = ({
  slug,
  salonName,
  initial,
  marketingPricePaise,
}: {
  slug: string
  salonName: string
  initial: Partial<OfferInput> & { kind: OfferInput['kind'] }
  marketingPricePaise: number
}) => {
  const router = useRouter()
  const [v, setV] = useState<OfferInput>({
    title: initial.title ?? '',
    description: initial.description ?? '',
    kind: initial.kind,
    valueType: initial.valueType ?? 'percent',
    value: initial.value ?? 20,
    freebie: initial.freebie,
    audience: initial.audience ?? (initial.kind === 'slot-filler' ? ['due'] : ['due', 'at-risk', 'regular']),
    endsAt: initial.endsAt ?? new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10),
    slot: initial.slot,
    packId: initial.packId ?? null,
    launch: true,
  })
  const [count, setCount] = useState<number | null>(null)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    audienceSize(slug, v.audience).then(setCount)
  }, [slug, v.audience])
  // Read the host after mount so server and client render the same text.
  const [host, setHost] = useState('')
  useEffect(() => setHost(window.location.host), [])
  const preview = `Priya, ${v.title || 'your offer'} at ${salonName}. Book: ${host}/s/${slug}/offers/…`
  return (
    <div className='grid gap-8 md:grid-cols-2'>
      <div className='space-y-4'>
        <div>
          <Label htmlFor='title'>Offer headline</Label>
          <Input id='title' onChange={(e) => setV({ ...v, title: e.target.value })} placeholder='20% off gel this Tuesday 2–5 pm' value={v.title} />
        </div>
        <div>
          <Label htmlFor='desc'>Details</Label>
          <Textarea id='desc' onChange={(e) => setV({ ...v, description: e.target.value })} rows={3} value={v.description} />
        </div>
        <div className='grid grid-cols-2 gap-3'>
          <div>
            <Label htmlFor='vt'>Type</Label>
            <select
              className='h-12 w-full rounded-btn border border-line bg-surface px-3'
              id='vt'
              onChange={(e) => setV({ ...v, valueType: e.target.value as OfferInput['valueType'] })}
              value={v.valueType}
            >
              <option value='percent'>% off</option>
              <option value='amount'>₹ off</option>
              <option value='freebie'>Free extra</option>
            </select>
          </div>
          {v.valueType === 'freebie' ? (
            <div>
              <Label htmlFor='fb'>Free extra</Label>
              <Input id='fb' onChange={(e) => setV({ ...v, freebie: e.target.value })} placeholder='Art on 2 nails' value={v.freebie ?? ''} />
            </div>
          ) : (
            <div>
              <Label htmlFor='val'>{v.valueType === 'percent' ? 'Percent' : 'Rupees'}</Label>
              <Input id='val' inputMode='numeric' onChange={(e) => setV({ ...v, value: Number(e.target.value || 0) })} value={v.value} />
            </div>
          )}
        </div>
        {v.kind === 'slot-filler' ? (
          <div className='grid grid-cols-3 gap-2'>
            <div>
              <Label htmlFor='sd'>Date</Label>
              <Input id='sd' onChange={(e) => setV({ ...v, slot: { ...v.slot, date: e.target.value } })} type='date' value={v.slot?.date ?? ''} />
            </div>
            <div>
              <Label htmlFor='sf'>From</Label>
              <Input id='sf' onChange={(e) => setV({ ...v, slot: { ...v.slot, from: e.target.value } })} type='time' value={v.slot?.from ?? '14:00'} />
            </div>
            <div>
              <Label htmlFor='st'>To</Label>
              <Input id='st' onChange={(e) => setV({ ...v, slot: { ...v.slot, to: e.target.value } })} type='time' value={v.slot?.to ?? '17:00'} />
            </div>
          </div>
        ) : null}
        <div>
          <Label htmlFor='end'>Ends</Label>
          <Input id='end' onChange={(e) => setV({ ...v, endsAt: e.target.value })} type='date' value={v.endsAt?.slice(0, 10)} />
        </div>
        <div>
          <p className='mb-2 text-sm font-medium'>Who gets it</p>
          <div className='flex flex-wrap gap-2'>
            {SEGMENTS.map(([k, label]) => {
              const on = v.audience.includes(k)
              return (
                <button
                  className={cn('rounded-full border px-3 py-1.5 text-sm', on ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface')}
                  key={k}
                  onClick={() => setV({ ...v, audience: on ? v.audience.filter((a) => a !== k) : [...v.audience, k] })}
                  type='button'
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      </div>
      <div className='space-y-4'>
        <div className='rounded-card bg-[#E5DDD5] p-4'>
          <p className='mb-2 text-xs text-black/50'>WhatsApp preview</p>
          <div className='max-w-[85%] rounded-xl rounded-tl-none bg-white p-3 text-sm text-black shadow-sm'>{preview}</div>
        </div>
        <div className='rounded-card border border-line bg-surface p-4 text-sm'>
          <p>
            <b>{count ?? '…'}</b> customers with marketing consent will receive it.
          </p>
          <p className='mt-1 text-muted'>
            Estimated message cost: {count == null ? '…' : formatINR(count * marketingPricePaise)} (billed at Meta's rates). Customers who had an offer this
            week are skipped.
          </p>
        </div>
        <Button
          className='w-full'
          disabled={pending || !v.title}
          onClick={() =>
            start(async () => {
              const res = await saveOffer(slug, { ...v, endsAt: v.endsAt ? new Date(`${v.endsAt}T23:59:00+05:30`).toISOString() : undefined })
              if (!res.ok) return setError(res.error)
              router.push(`/studio/${slug}/campaigns?launched=1`)
            })
          }
          size='lg'
        >
          {pending ? 'Launching…' : 'Launch & send'}
        </Button>
        <Button
          className='w-full'
          disabled={pending || !v.title}
          onClick={() =>
            start(async () => {
              const res = await saveOffer(slug, { ...v, launch: false })
              if (!res.ok) return setError(res.error)
              router.push(`/studio/${slug}/campaigns`)
            })
          }
          variant='ghost'
        >
          Save as draft
        </Button>
        {error ? <p className='text-sm text-red-700'>{error}</p> : null}
      </div>
    </div>
  )
}
