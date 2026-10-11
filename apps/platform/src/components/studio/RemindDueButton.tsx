'use client'
import { Button } from '@salon/ui'
import { useState, useTransition } from 'react'
import { remindDue } from '@/app/(site)/studio/[salon]/actions'

export const RemindDueButton = ({ slug, count }: { slug: string; count: number }) => {
  const [pending, start] = useTransition()
  const [result, setResult] = useState<string | null>(null)
  return (
    <div className='flex flex-wrap items-center gap-3'>
      <Button
        disabled={pending || !count}
        onClick={() =>
          start(async () => {
            const r = await remindDue(slug)
            setResult(
              r.ok
                ? `Sent ${r.data?.sent ?? 0} reminder${r.data?.sent === 1 ? '' : 's'}${r.data?.skipped ? ` · ${r.data.skipped} skipped (already booked or reminded this week)` : ''}`
                : r.error,
            )
          })
        }
        size='sm'
      >
        {pending ? 'Sending…' : `Remind all ${count} on WhatsApp`}
      </Button>
      {result ? (
        <p className='text-sm' role='status'>
          {result}
        </p>
      ) : null}
    </div>
  )
}
