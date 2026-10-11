'use client'
import { Button, cn } from '@salon/ui'
import { type ReactNode, useActionState } from 'react'
import type { FormState } from '@/app/(site)/studio/[salon]/settings/actions'

/** A plain form posting to a server action, with a save button and inline result. Works without JS too. */
export const ActionForm = ({
  action,
  children,
  submit = 'Save',
  className,
  resetOnSuccess,
  compact,
}: {
  action: (prev: FormState, f: FormData) => Promise<FormState>
  children: ReactNode
  submit?: string
  className?: string
  resetOnSuccess?: boolean
  /** One-line form: small button, result as a tooltip-sized note */
  compact?: boolean
}) => {
  const [state, formAction, pending] = useActionState(action, null)
  return (
    <form action={formAction} className={cn('space-y-4', className)} key={resetOnSuccess && state?.ok ? String(Math.random()) : 'form'}>
      {children}
      {compact ? (
        <>
          <Button disabled={pending} size='sm' type='submit' variant='secondary'>
            {pending ? '…' : submit}
          </Button>
          {state?.error ? (
            <span className='text-xs text-red-700' role='alert'>
              {state.error}
            </span>
          ) : state?.ok ? (
            <span className='text-xs text-green-700' role='status'>
              ✓
            </span>
          ) : null}
        </>
      ) : null}
      <div className={cn('flex flex-wrap items-center gap-3', compact && 'hidden')}>
        <Button disabled={pending} type='submit'>
          {pending ? 'Saving…' : submit}
        </Button>
        {state?.ok && state.message ? (
          <p className='text-sm text-green-700' role='status'>
            ✓ {state.message}
          </p>
        ) : null}
        {state?.error ? (
          <p className='text-sm text-red-700' role='alert'>
            {state.error}
          </p>
        ) : null}
      </div>
      {state?.secret ? (
        <p className='rounded-card border border-dashed border-brand bg-tint p-3 text-sm'>
          Share these sign-in details privately (shown once): <span className='font-mono'>{state.secret}</span>
        </p>
      ) : null}
    </form>
  )
}
