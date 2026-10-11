'use client'
import { Button } from '@salon/ui'
import { Sheet } from '@salon/ui/client'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { cancelAppointment } from '@/app/(site)/s/[salon]/actions'

export const AppointmentActions = ({ slug, id, policy, rebookHref }: { slug: string; id: string | number; policy?: string | null; rebookHref: string }) => {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="grid grid-cols-2 gap-2">
      <Button onClick={() => router.push(rebookHref)} variant="secondary">
        Reschedule
      </Button>
      <Sheet
        onOpenChange={setOpen}
        open={open}
        title="Cancel this appointment?"
        trigger={
          <Button variant="ghost" className="text-red-700">
            Cancel
          </Button>
        }
      >
        {policy ? <p className="mb-4 text-sm text-muted">{policy}</p> : null}
        <Button
          className="w-full"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await cancelAppointment(slug, id)
              if (!res.ok) return setError(res.error)
              setOpen(false)
              router.refresh()
            })
          }
          variant="danger"
        >
          {pending ? 'Cancelling…' : 'Yes, cancel'}
        </Button>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      </Sheet>
    </div>
  )
}
