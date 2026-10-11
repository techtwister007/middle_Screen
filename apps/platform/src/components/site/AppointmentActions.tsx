'use client'
import { Button, buttonClass } from '@salon/ui'
import { Sheet } from '@salon/ui/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { cancelAppointment } from '@/app/(site)/s/[salon]/actions'

/** Reschedule moves this same appointment (book?reschedule=<id>); cancel asks first and shows the policy. */
export const AppointmentActions = ({
  slug,
  id,
  policy,
  labels,
}: {
  slug: string
  id: string | number
  policy?: string | null
  labels: { reschedule: string; cancel: string; cancelTitle: string; cancelling: string; yesCancel: string }
}) => {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  return (
    <div className='grid grid-cols-2 gap-2'>
      <Link className={buttonClass('secondary')} href={`/s/${slug}/book?reschedule=${id}`}>
        {labels.reschedule}
      </Link>
      <Sheet
        onOpenChange={setOpen}
        open={open}
        title={labels.cancelTitle}
        trigger={
          <Button className='text-red-700' variant='ghost'>
            {labels.cancel}
          </Button>
        }
      >
        {policy ? <p className='mb-4 text-sm text-muted'>{policy}</p> : null}
        <Button
          className='w-full'
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await cancelAppointment(slug, id)
              if (!res.ok) return setError(res.error)
              setOpen(false)
              router.refresh()
            })
          }
          variant='danger'
        >
          {pending ? labels.cancelling : labels.yesCancel}
        </Button>
        {error ? <p className='mt-3 text-sm text-red-700'>{error}</p> : null}
      </Sheet>
    </div>
  )
}
