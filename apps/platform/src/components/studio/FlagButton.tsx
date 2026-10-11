'use client'
import { cn } from '@salon/ui'
import { useState, useTransition } from 'react'

/** Small toggle/command button that calls a server action and shows the result. */
export const FlagButton = ({
  run,
  children,
  confirm: confirmText,
  className,
}: {
  run: () => Promise<{ ok?: boolean; error?: string; message?: string } | null>
  children: React.ReactNode
  confirm?: string
  className?: string
}) => {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  return (
    <span className='inline-flex flex-col'>
      <button
        className={cn('rounded-btn border border-line px-3 py-1.5 text-xs hover:border-brand disabled:opacity-50', className)}
        disabled={pending}
        onClick={() => {
          if (confirmText && !window.confirm(confirmText)) return
          start(async () => {
            const r = await run()
            setError(r && !r.ok ? (r.error ?? 'Failed') : null)
          })
        }}
        type='button'
      >
        {pending ? '…' : children}
      </button>
      {error ? <span className='mt-1 text-xs text-red-700'>{error}</span> : null}
    </span>
  )
}
