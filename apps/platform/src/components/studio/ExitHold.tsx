'use client'
import { cn } from '@salon/ui'
import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'

const HOLD_MS = 1500

/**
 * Leave a customer-facing screen (kiosk, TV). Customers tapping around can't exit by accident:
 * staff press and hold, then confirm.
 */
export const ExitHold = ({ href, className }: { href: string; className?: string }) => {
  const router = useRouter()
  const [holding, setHolding] = useState(false)
  const [ask, setAsk] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stop = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    setHolding(false)
  }
  if (ask)
    return (
      <div className={cn('flex items-center gap-2 rounded-btn bg-surface/95 p-2 shadow-lg', className)} role='dialog' aria-label='Leave this screen?'>
        <span className='px-2 text-sm'>Leave this screen?</span>
        <button className='min-h-11 rounded-btn px-4 text-sm' onClick={() => setAsk(false)} type='button'>
          Stay
        </button>
        <button className='min-h-11 rounded-btn bg-brand px-4 text-sm text-on-brand' onClick={() => router.push(href)} type='button'>
          Exit to Studio
        </button>
      </div>
    )
  return (
    <button
      aria-label='Exit (press and hold)'
      className={cn(
        'relative flex h-12 min-w-12 select-none items-center justify-center gap-2 overflow-hidden rounded-full px-3 text-xs text-muted/70',
        className,
      )}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') setAsk(true)
      }}
      onPointerCancel={stop}
      onPointerDown={() => {
        setHolding(true)
        timer.current = setTimeout(() => {
          setHolding(false)
          setAsk(true)
        }, HOLD_MS)
      }}
      onPointerLeave={stop}
      onPointerUp={stop}
      title='Press and hold to exit'
      type='button'
    >
      <span
        aria-hidden
        className='absolute inset-y-0 left-0 bg-brand/20'
        style={{ width: holding ? '100%' : '0%', transition: holding ? `width ${HOLD_MS}ms linear` : 'none' }}
      />
      <LogOut className='relative' size={16} />
      <span className='relative'>{holding ? 'Keep holding…' : 'Hold to exit'}</span>
    </button>
  )
}
