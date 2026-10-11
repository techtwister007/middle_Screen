'use client'
import { Button } from '@salon/ui'
import { Clock } from 'lucide-react'
import { useState, useTransition } from 'react'
import { runningLate } from '@/app/(site)/studio/[salon]/actions'
import { toast } from './Toast'

/** "Running late" → pick minutes → WhatsApp heads-up to the customer. */
export const LateButton = ({ slug, id }: { slug: string; id: string | number }) => {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [done, setDone] = useState<string | null>(null)
  if (done)
    return (
      <span className='inline-flex min-h-11 items-center text-sm text-muted' role='status'>
        {done}
      </span>
    )
  if (!open)
    return (
      <Button className='px-3' onClick={() => setOpen(true)} variant='secondary'>
        <Clock size={16} /> Running late
      </Button>
    )
  return (
    <span className='inline-flex flex-wrap items-center gap-2'>
      {[10, 20, 30].map((m) => (
        <Button
          disabled={pending}
          key={m}
          onClick={() =>
            start(async () => {
              const r = await runningLate(slug, id, m)
              if (!r.ok) return void toast({ message: r.error, tone: 'error' })
              setDone(`Told them ~${m} min ✓`)
              toast({ message: `Customer told you're ~${m} min late`, tone: 'success' })
            })
          }
          variant='outline'
        >
          {m} min
        </Button>
      ))}
      <Button aria-label='Close' disabled={pending} onClick={() => setOpen(false)} variant='ghost'>
        ✕
      </Button>
    </span>
  )
}
