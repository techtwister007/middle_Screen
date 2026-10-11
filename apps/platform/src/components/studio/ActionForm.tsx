'use client'
import { Button, cn } from '@salon/ui'
import { Check, Copy, MessageCircle } from 'lucide-react'
import { type ReactNode, useActionState, useState } from 'react'
import type { FormState } from '@/app/(site)/studio/[salon]/settings/actions'
import { ABOVE_NAV } from './format'
import { toast } from './Toast'

/** A plain form posting to a server action, with a save button and inline result. Works without JS too. */
export const ActionForm = ({
  action,
  children,
  submit = 'Save',
  className,
  resetOnSuccess,
  compact,
  sticky,
  secretShare,
}: {
  action: (prev: FormState, f: FormData) => Promise<FormState>
  children: ReactNode
  submit?: string
  className?: string
  resetOnSuccess?: boolean
  /** One-line form: small button, result as a tooltip-sized note */
  compact?: boolean
  /** Long forms: keep the save bar pinned to the bottom of the screen (above the phone tab bar) */
  sticky?: boolean
  /** Show Copy / WhatsApp buttons for the one-time secret (e.g. a new member's password) */
  secretShare?: { phoneField?: string; intro: string }
}) => {
  const [state, formAction, pending] = useActionState(action, null)
  const [phone, setPhone] = useState('')
  return (
    <form
      action={formAction}
      className={cn('space-y-4', className)}
      key={resetOnSuccess && state?.ok ? String(Math.random()) : 'form'}
      onChange={(e) => {
        const t = e.target as unknown as HTMLInputElement
        if (secretShare?.phoneField && t.name === secretShare.phoneField) setPhone(t.value)
      }}
    >
      {children}
      {compact ? (
        <>
          <Button disabled={pending} type='submit' variant='secondary'>
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
      <div
        className={cn(
          'flex flex-wrap items-center gap-3',
          compact && 'hidden',
          sticky && cn('sticky z-20 -mx-4 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur md:mx-0 md:rounded-card md:border', ABOVE_NAV),
        )}
      >
        <Button className={sticky ? 'flex-1 sm:flex-none' : undefined} disabled={pending} size={sticky ? 'lg' : 'md'} type='submit'>
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
      {state?.secret ? <SecretBox intro={secretShare?.intro} phone={phone} secret={state.secret} /> : null}
    </form>
  )
}

const SecretBox = ({ secret, intro, phone }: { secret: string; intro?: string; phone: string }) => {
  const [copied, setCopied] = useState(false)
  const text = `${intro ?? 'Your sign-in details'}: ${secret}`
  return (
    <div className='space-y-3 rounded-card border border-dashed border-brand bg-tint p-3 text-sm'>
      <p>
        Share these sign-in details privately (shown once): <span className='break-all font-mono'>{secret}</span>
      </p>
      <div className='grid grid-cols-2 gap-2'>
        <Button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text)
              setCopied(true)
              toast({ message: 'Copied', tone: 'success' })
            } catch {
              toast({ message: 'Could not copy. Select the text instead.', tone: 'error' })
            }
          }}
          type='button'
          variant='secondary'
        >
          {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copied' : 'Copy'}
        </Button>
        <a
          className='inline-flex h-11 items-center justify-center gap-2 rounded-btn bg-emerald-600 px-3 font-medium text-white'
          href={`https://wa.me/${phone.replace(/\D/g, '').replace(/^(\d{10})$/, '91$1')}?text=${encodeURIComponent(text)}`}
          rel='noopener'
          target='_blank'
        >
          <MessageCircle size={16} /> Send on WhatsApp
        </a>
      </div>
    </div>
  )
}
