'use client'
import { cn } from '@salon/ui'
import { useEffect, useSyncExternalStore } from 'react'
import { ABOVE_NAV } from './format'

export interface ToastInput {
  message: string
  tone?: 'success' | 'error' | 'info'
  /** Optional action button, e.g. Undo */
  action?: { label: string; onClick: () => void }
  /** ms; default 4000 (6000 with an action) */
  duration?: number
}
type ToastItem = ToastInput & { id: number }

let items: ToastItem[] = []
let seq = 0
const listeners = new Set<() => void>()
const emit = () => {
  for (const l of listeners) l()
}

export const dismissToast = (id: number) => {
  items = items.filter((t) => t.id !== id)
  emit()
}

/** Shows a toast above the bottom nav. Returns its id. */
export const toast = (input: ToastInput | string) => {
  const t: ToastItem = { ...(typeof input === 'string' ? { message: input } : input), id: ++seq }
  items = [...items.slice(-2), t]
  emit()
  return t.id
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
const snapshot = () => items
const empty: ToastItem[] = []

const ToastRow = ({ t }: { t: ToastItem }) => {
  useEffect(() => {
    const timer = setTimeout(() => dismissToast(t.id), t.duration ?? (t.action ? 6000 : 4000))
    return () => clearTimeout(timer)
  }, [t])
  return (
    <div
      className={cn(
        'pointer-events-auto flex min-h-12 items-center gap-3 rounded-btn px-4 py-2 text-sm shadow-lg',
        t.tone === 'error' ? 'bg-red-700 text-white' : 'bg-ink text-bg',
      )}
      role={t.tone === 'error' ? 'alert' : 'status'}
    >
      <span className='flex-1'>{t.message}</span>
      {t.action ? (
        <button
          className='min-h-11 shrink-0 rounded-btn px-3 font-semibold underline underline-offset-2'
          onClick={() => {
            t.action?.onClick()
            dismissToast(t.id)
          }}
          type='button'
        >
          {t.action.label}
        </button>
      ) : null}
    </div>
  )
}

/** Mount once (Studio layout). */
export const Toaster = () => {
  const list = useSyncExternalStore(subscribe, snapshot, () => empty)
  return (
    <div className={cn('pointer-events-none fixed inset-x-0 z-[60] mx-auto flex max-w-md flex-col gap-2 px-4 pb-3 print:hidden', ABOVE_NAV)}>
      {list.map((t) => (
        <ToastRow key={t.id} t={t} />
      ))}
    </div>
  )
}
