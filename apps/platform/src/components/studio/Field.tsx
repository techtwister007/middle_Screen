import { cn } from '@salon/ui'
import type { ReactNode } from 'react'

/** Labelled field wrapper. The hint sits outside the label so the field's accessible name stays short. */
export const Field = ({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) => (
  <div className={cn('block min-w-0 text-sm', className)}>
    <label className='block'>
      <span className='mb-1.5 block font-medium text-ink'>{label}</span>
      {children}
    </label>
    {hint ? <span className='mt-1 block text-xs text-muted'>{hint}</span> : null}
  </div>
)

export const inputClass = 'h-11 w-full rounded-btn border border-line bg-surface px-3 text-base text-ink focus:border-brand focus:outline-none'
