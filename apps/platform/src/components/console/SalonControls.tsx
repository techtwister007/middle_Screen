'use client'
import { cn } from '@salon/ui'
import { useState, useTransition } from 'react'
import { setSalonField, toggleFeature } from '@/app/(site)/console/actions'

export const FieldSelect = ({
  slug,
  field,
  value,
  options,
}: {
  slug: string
  field: 'status' | 'plan' | 'theme'
  value: string
  options: [value: string, label: string][]
}) => {
  const [v, setV] = useState(value)
  const [pending, start] = useTransition()
  return (
    <select
      className='h-10 rounded-btn border border-line bg-surface px-3 text-sm'
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value
        setV(next)
        start(async () => void (await setSalonField(slug, field, next)))
      }}
      value={v}
    >
      {options.map(([o, label]) => (
        <option key={o} value={o}>
          {label}
        </option>
      ))}
    </select>
  )
}

export const FeatureToggle = ({
  slug,
  feature,
  enabled,
  label,
  planDefault,
}: {
  slug: string
  feature: string
  enabled: boolean
  label: string
  /** Whether the plan includes it; a differing state is shown as an override */
  planDefault: boolean
}) => {
  const [on, setOn] = useState(enabled)
  const [pending, start] = useTransition()
  return (
    <button
      className={cn('flex min-h-14 items-center justify-between gap-3 rounded-btn border px-3 py-2 text-sm', on ? 'border-brand bg-brand/8' : 'border-line bg-surface')}
      disabled={pending}
      onClick={() => {
        setOn(!on)
        start(async () => void (await toggleFeature(slug, feature, !on)))
      }}
      type='button'
    >
      <span className='text-left'>
        <span className='block'>{label}</span>
        <span className='block text-[11px] text-muted'>{on === planDefault ? 'plan default' : on ? 'switched on for this salon' : 'switched off for this salon'}</span>
      </span>
      <span className={cn('h-5 w-9 rounded-full p-0.5 transition', on ? 'bg-brand' : 'bg-line')}>
        <span className={cn('block h-4 w-4 rounded-full bg-white transition', on ? 'translate-x-4' : '')} />
      </span>
    </button>
  )
}
