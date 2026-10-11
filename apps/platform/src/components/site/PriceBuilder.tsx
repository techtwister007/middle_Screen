'use client'
import { formatINR } from '@salon/core'
import { buttonClass, cn } from '@salon/ui'
import { Check, Clock } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'

export interface BuilderService {
  id: string | number
  name: string
  price: number
  durationMinutes: number
}

const fmt = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`)

export const PriceBuilder = ({
  base,
  designId,
  main,
  addOns,
  included,
  bookLabel,
}: {
  base: string
  designId: string | number
  main: BuilderService | null
  addOns: BuilderService[]
  included: (string | number)[]
  bookLabel: string
}) => {
  const [selected, setSelected] = useState<Set<string>>(new Set(included.map(String)))
  const chosen = addOns.filter((a) => selected.has(String(a.id)))
  const total = useMemo(() => (main?.price ?? 0) + chosen.reduce((n, a) => n + a.price, 0), [main, chosen])
  const minutes = (main?.durationMinutes ?? 0) + chosen.reduce((n, a) => n + a.durationMinutes, 0)
  const ids = [main?.id, ...chosen.map((a) => a.id)].filter(Boolean).join(',')
  return (
    <div className="rounded-card border border-line bg-surface p-4">
      {main ? (
        <div className="flex items-center justify-between text-[15px]">
          <span>{main.name}</span>
          <span className="tabular-nums">{formatINR(main.price)}</span>
        </div>
      ) : null}
      {addOns.length ? (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Add-ons</p>
          {addOns.map((a) => {
            const on = selected.has(String(a.id))
            return (
              <button
                className={cn('flex w-full items-center justify-between rounded-btn border px-3 py-2.5 text-sm transition', on ? 'border-brand bg-brand/8' : 'border-line')}
                key={String(a.id)}
                onClick={() =>
                  setSelected((s) => {
                    const n = new Set(s)
                    if (n.has(String(a.id))) n.delete(String(a.id))
                    else n.add(String(a.id))
                    return n
                  })
                }
                type="button"
              >
                <span className="flex items-center gap-2">
                  <span className={cn('flex h-5 w-5 items-center justify-center rounded-full border', on ? 'border-brand bg-brand text-on-brand' : 'border-line')}>{on ? <Check size={12} /> : null}</span>
                  {a.name}
                </span>
                <span className="tabular-nums text-muted">+{formatINR(a.price)}</span>
              </button>
            )
          })}
        </div>
      ) : null}
      <div className="mt-4 flex items-end justify-between border-t border-line pt-4">
        <div>
          <p className="text-xs text-muted">Total</p>
          <p className="font-heading text-3xl tabular-nums">{formatINR(total)}</p>
          <p className="flex items-center gap-1 text-xs text-muted">
            <Clock size={12} /> {fmt(minutes)}
          </p>
        </div>
        <Link className={buttonClass('primary', 'lg')} href={`${base}/book?design=${designId}&services=${ids}`}>
          {bookLabel}
        </Link>
      </div>
    </div>
  )
}
