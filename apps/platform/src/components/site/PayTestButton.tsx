'use client'
import { Loader2 } from 'lucide-react'
import { useFormStatus } from 'react-dom'

/** Submit button for the test payment page: shows progress so it is not tapped twice. */
export const PayTestButton = ({ label, pendingLabel }: { label: string; pendingLabel: string }) => {
  const { pending } = useFormStatus()
  return (
    <button
      aria-busy={pending}
      className='mt-10 inline-flex h-14 w-full items-center justify-center gap-2 rounded-btn bg-brand font-medium text-on-brand disabled:opacity-70'
      disabled={pending}
      type='submit'
    >
      {pending ? <Loader2 className='animate-spin' size={18} /> : null}
      {pending ? pendingLabel : label}
    </button>
  )
}
