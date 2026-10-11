'use client'
import { cn } from '@salon/ui'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

/** Small command button that calls a server action and shows the result. 44px tall by default for thumbs. */
export const FlagButton = ({
  run,
  children,
  confirm: confirmText,
  className,
  disabled,
  label,
  then,
}: {
  run: () => Promise<{ ok?: boolean; error?: string; message?: string } | null>
  children: React.ReactNode
  confirm?: string
  className?: string
  disabled?: boolean
  /** Accessible name when the button only shows an icon */
  label?: string
  /** Where to go after success (e.g. back to the list after deleting) */
  then?: string
}) => {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  return (
    <span className='inline-flex flex-col'>
      <button
        aria-label={label}
        className={cn(
          'inline-flex min-h-11 items-center justify-center rounded-btn border border-line bg-surface px-3 text-xs hover:border-brand disabled:opacity-40',
          className,
        )}
        disabled={pending || disabled}
        onClick={() => {
          if (confirmText && !window.confirm(confirmText)) return
          start(async () => {
            const r = await run()
            setError(r && !r.ok ? (r.error ?? 'Failed') : null)
            if (r?.ok && then) router.push(then)
          })
        }}
        title={label}
        type='button'
      >
        {pending ? '…' : children}
      </button>
      {error ? (
        <span className='mt-1 text-xs text-red-700' role='alert'>
          {error}
        </span>
      ) : null}
    </span>
  )
}
