'use client'
import { useState, useTransition } from 'react'
import { resetStaffPassword } from '@/app/(site)/console/actions'

export const ResetPasswordButton = ({ slug, userId }: { slug: string; userId: string | number }) => {
  const [pending, start] = useTransition()
  const [secret, setSecret] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  if (secret)
    return (
      <span className='flex items-center gap-2'>
        <code className='rounded bg-tint px-2 py-1 text-xs'>{secret}</code>
        <button className='min-h-11 rounded-btn border border-line px-3 text-xs' onClick={() => navigator.clipboard?.writeText(secret)} type='button'>
          Copy
        </button>
      </span>
    )
  return (
    <span className='inline-flex flex-col items-end'>
      <button
        className='min-h-11 rounded-btn border border-line px-3 text-xs hover:border-brand'
        disabled={pending}
        onClick={() => {
          if (!window.confirm('Set a new temporary password? Their current password stops working.')) return
          start(async () => {
            const r = await resetStaffPassword(slug, userId)
            if (r.ok && r.data) setSecret(r.data.secret)
            else setError(r.ok ? null : r.error)
          })
        }}
        type='button'
      >
        {pending ? '…' : 'Reset password'}
      </button>
      {error ? <span className='text-xs text-red-700'>{error}</span> : null}
    </span>
  )
}
