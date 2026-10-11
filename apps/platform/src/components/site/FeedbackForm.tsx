'use client'
import { Button, Textarea } from '@salon/ui'
import { useState, useTransition } from 'react'
import { sendFeedback } from '@/app/(site)/s/[salon]/actions'

const REASONS = [
  ['price', 'Price'],
  ['quality', 'Quality'],
  ['distance', 'Too far'],
  ['time', 'No time / slots'],
  ['moved', 'I moved'],
  ['tried-elsewhere', 'Trying another salon'],
  ['other', 'Something else'],
] as const

export const FeedbackForm = ({ slug }: { slug: string }) => {
  const [reason, setReason] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [done, setDone] = useState(false)
  const [pending, start] = useTransition()
  if (done) return <p className='rounded-card bg-tint p-6 text-center'>Thank you. This really helps us improve. 💛</p>
  return (
    <div className='space-y-4'>
      <div className='grid grid-cols-2 gap-2'>
        {REASONS.map(([k, label]) => (
          <button
            className={`rounded-btn border py-3 text-sm ${reason === k ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface'}`}
            key={k}
            onClick={() => setReason(k)}
            type='button'
          >
            {label}
          </button>
        ))}
      </div>
      <Textarea onChange={(e) => setComment(e.target.value)} placeholder='Anything else? (optional)' rows={3} value={comment} />
      <Button
        className='w-full'
        disabled={!reason || pending}
        onClick={() =>
          start(async () => {
            const r = await sendFeedback(slug, { reason: reason!, comment })
            if (r.ok) setDone(true)
          })
        }
        size='lg'
      >
        Send
      </Button>
    </div>
  )
}
