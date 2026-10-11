'use client'
import { Button, buttonClass } from '@salon/ui'
import { Sheet } from '@salon/ui/client'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { cancelAppointment } from '@/app/(site)/s/[salon]/actions'

/**
 * Reschedule moves this same appointment (book?reschedule=<id>); cancel asks first, says plainly whether the
 * deposit comes back, and offers a clear way to keep the appointment.
 */
export const AppointmentActions = ({
  slug,
  id,
  policy,
  deposit,
  labels,
}: {
  slug: string
  id: string | number
  policy?: string | null
  /** What happens to a paid deposit if they cancel now (null when there is none) */
  deposit?: string | null
  labels: { reschedule: string; cancel: string; cancelTitle: string; cancelling: string; yesCancel: string; keep: string }
}) => {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  return (
    <div className='grid grid-cols-2 gap-2'>
      <Link className={buttonClass('secondary', 'lg')} href={`/s/${slug}/book?reschedule=${id}`}>
        {labels.reschedule}
      </Link>
      <Sheet
        onOpenChange={setOpen}
        open={open}
        title={labels.cancelTitle}
        trigger={
          <Button className='border border-red-200 text-red-700' size='lg' variant='ghost'>
            {labels.cancel}
          </Button>
        }
      >
        {deposit ? (
          <p className='mb-3 rounded-btn bg-accent/15 px-3 py-2.5 text-sm font-medium' data-testid='cancel-deposit'>
            {deposit}
          </p>
        ) : null}
        {policy ? <p className='mb-4 text-sm text-muted'>{policy}</p> : null}
        <div className='space-y-2'>
          <Button className='w-full' onClick={() => setOpen(false)} size='lg'>
            {labels.keep}
          </Button>
          <Button
            className='w-full'
            disabled={pending}
            onClick={() =>
              start(async () => {
                setError(null)
                const res = await cancelAppointment(slug, id)
                if (!res.ok) return setError(res.error)
                setOpen(false)
                router.refresh()
              })
            }
            size='lg'
            variant='danger'
          >
            {pending ? <Loader2 className='animate-spin' size={18} /> : null}
            {pending ? labels.cancelling : labels.yesCancel}
          </Button>
        </div>
        {error ? (
          <p className='mt-3 text-sm text-red-700' role='alert'>
            {error}
          </p>
        ) : null}
      </Sheet>
    </div>
  )
}
