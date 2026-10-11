'use client'
import { Button, cn } from '@salon/ui'
import { useActionState, useMemo, useState } from 'react'
import type { FormState } from '@/app/(site)/studio/[salon]/settings/actions'
import { parseMenuText } from '@/lib/menuText'
import { inputClass } from './Field'

/** Paste a whole menu, check what was read, then add. Nothing is created until the owner confirms the preview. */
export const MenuPaste = ({ action, existing }: { action: (prev: FormState, f: FormData) => Promise<FormState>; existing: string[] }) => {
  const [text, setText] = useState('')
  const [step, setStep] = useState<'edit' | 'preview'>('edit')
  const [state, formAction, pending] = useActionState(async (prev: FormState, f: FormData) => {
    const r = await action(prev, f)
    if (r?.ok) {
      setText('')
      setStep('edit')
    }
    return r
  }, null)
  const known = useMemo(() => new Set(existing.map((n) => n.trim().toLowerCase())), [existing])
  const { parsed, skipped } = useMemo(() => parseMenuText(text), [text])
  const fresh = parsed.filter((p) => !known.has(p.name.toLowerCase()))
  return (
    <form action={formAction} className='mt-4 space-y-4'>
      <input name='menu' type='hidden' value={text} />
      {step === 'edit' ? (
        <>
          <label className='block text-sm'>
            <span className='mb-1.5 block font-medium'>Menu</span>
            <textarea
              aria-label='Menu'
              className={`${inputClass} h-40 py-2 font-mono text-sm`}
              onChange={(e) => setText(e.target.value)}
              placeholder={'Gel polish, 800, 45\nFrench tips, 1200, 60'}
              value={text}
            />
          </label>
          <p className='text-xs text-muted'>One per line: name, price, minutes. E.g. "Gel polish, 800, 45" or "Acrylic extensions - ₹1800 - 2 hr"</p>
          <Button disabled={!text.trim()} onClick={() => setStep('preview')} type='button'>
            Check what was read
          </Button>
        </>
      ) : (
        <>
          <div className='overflow-hidden rounded-card border border-line'>
            <div className='grid grid-cols-[1fr_auto_auto] gap-x-3 border-b border-line bg-tint px-3 py-2 text-xs text-muted'>
              <span>Service</span>
              <span className='text-right'>Price</span>
              <span className='text-right'>Time</span>
            </div>
            {parsed.map((p, i) => {
              const dup = known.has(p.name.toLowerCase())
              return (
                <div className={cn('grid grid-cols-[1fr_auto_auto] gap-x-3 px-3 py-2 text-sm', dup && 'text-muted')} data-testid='menu-preview-row' key={i}>
                  <span className='min-w-0'>
                    <span className={cn('block truncate', dup && 'line-through')}>{p.name}</span>
                    <span className='text-xs text-muted'>
                      {p.category.replace('-', ' ')}
                      {dup ? ' · already on the menu, skipped' : ''}
                    </span>
                  </span>
                  <span className='text-right tabular-nums'>₹{p.price}</span>
                  <span className='text-right tabular-nums'>{p.minutes} min</span>
                </div>
              )
            })}
          </div>
          {skipped.length ? (
            <div className='rounded-card bg-amber-500/10 p-3 text-sm text-amber-900'>
              <p className='font-medium'>Couldn't read {skipped.length === 1 ? 'this line' : `these ${skipped.length} lines`} (they won't be added):</p>
              <ul className='mt-1 list-disc pl-5'>
                {skipped.slice(0, 8).map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className='grid grid-cols-2 gap-2'>
            <Button onClick={() => setStep('edit')} type='button' variant='secondary'>
              Back to edit
            </Button>
            <Button disabled={!fresh.length || pending} type='submit'>
              {pending ? 'Adding…' : fresh.length ? `Add ${fresh.length} service${fresh.length === 1 ? '' : 's'}` : 'Nothing new'}
            </Button>
          </div>
        </>
      )}
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
    </form>
  )
}
