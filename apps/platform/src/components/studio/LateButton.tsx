'use client'
import { useState, useTransition } from 'react'
import { runningLate } from '@/app/(site)/studio/[salon]/actions'

/** "Running late" → pick minutes → WhatsApp heads-up to the customer. */
export const LateButton = ({ slug, id }: { slug: string; id: string | number }) => {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [done, setDone] = useState<string | null>(null)
  if (done) return <span className='text-xs text-muted'>{done}</span>
  if (!open)
    return (
      <button className='rounded-btn px-2 py-1 text-xs text-muted underline' onClick={() => setOpen(true)} type='button'>
        Running late?
      </button>
    )
  return (
    <span className='inline-flex items-center gap-1'>
      {[10, 20, 30].map((m) => (
        <button
          className='rounded-full border border-line px-2.5 py-1 text-xs hover:border-brand'
          disabled={pending}
          key={m}
          onClick={() =>
            start(async () => {
              const r = await runningLate(slug, id, m)
              setDone(r.ok ? `Told them ~${m} min ✓` : r.error)
            })
          }
          type='button'
        >
          {m} min
        </button>
      ))}
    </span>
  )
}
