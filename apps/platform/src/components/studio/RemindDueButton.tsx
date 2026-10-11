'use client'
import { formatINR } from '@salon/core'
import { Button } from '@salon/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { dueCustomerIds, remindDue } from '@/app/(site)/studio/[salon]/actions'
import { ConfirmSheet } from './ConfirmSheet'
import { plural } from './format'
import { toast } from './Toast'

const BATCH = 5

/** "Remind all due" with a confirmation (count + cost) and real progress while it sends in small batches. */
export const RemindDueButton = ({ slug, count, pricePaise }: { slug: string; count: number; pricePaise: number }) => {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number; sent: number; skipped: number } | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const sending = progress !== null && !result

  const run = async () => {
    setResult(null)
    const ids = await dueCustomerIds(slug)
    if (!ids.ok) {
      setOpen(false)
      return void toast({ message: ids.error, tone: 'error' })
    }
    const all = ids.data?.ids ?? []
    let sent = 0
    let skipped = 0
    setProgress({ done: 0, total: all.length, sent, skipped })
    for (let i = 0; i < all.length; i += BATCH) {
      const r = await remindDue(slug, all.slice(i, i + BATCH))
      if (!r.ok) {
        setResult(`Stopped after ${sent} sent: ${r.error}`)
        toast({ message: r.error, tone: 'error' })
        return
      }
      sent += r.data?.sent ?? 0
      skipped += r.data?.skipped ?? 0
      setProgress({ done: Math.min(all.length, i + BATCH), total: all.length, sent, skipped })
    }
    const msg = `Sent ${plural(sent, 'reminder')}${skipped ? ` · ${skipped} skipped (already booked or reminded this week)` : ''}`
    setResult(msg)
    toast({ message: msg, tone: 'success' })
    setOpen(false)
    router.refresh()
  }

  return (
    <div className='space-y-2'>
      <Button className='w-full sm:w-auto' disabled={!count || sending} onClick={() => setOpen(true)}>
        Remind all {count} on WhatsApp
      </Button>
      {result ? (
        <p className='text-sm' role='status'>
          {result}
        </p>
      ) : null}
      <ConfirmSheet
        confirmLabel={sending ? `Sending… ${progress?.done ?? 0}/${progress?.total ?? count}` : `Send ${plural(count, 'reminder')}`}
        onConfirm={() => void run()}
        onOpenChange={setOpen}
        open={open}
        pending={sending}
        title='Send refill reminders?'
      >
        <p>
          <b>{plural(count, 'customer')}</b> due for a refill will get a WhatsApp reminder with a link to book.
        </p>
        <p className='text-muted'>
          Estimated cost: up to {formatINR(count * pricePaise)} (WhatsApp service messages, billed at cost). Anyone who already booked or was reminded in the
          last 7 days is skipped and not charged.
        </p>
        {progress ? (
          <div aria-label='Sending progress' className='space-y-1' role='progressbar' aria-valuemax={progress.total} aria-valuenow={progress.done}>
            <div className='h-2 overflow-hidden rounded-full bg-tint'>
              <div className='h-full bg-brand transition-all' style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 100}%` }} />
            </div>
            <p className='text-xs text-muted'>
              {progress.done} of {progress.total} checked · {progress.sent} sent · {progress.skipped} skipped
            </p>
          </div>
        ) : null}
      </ConfirmSheet>
    </div>
  )
}
