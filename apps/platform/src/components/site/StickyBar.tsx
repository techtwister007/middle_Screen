import { cn } from '@salon/ui'
import type { ReactNode } from 'react'

/**
 * The page's main action, pinned just above the bottom nav (in thumb reach, never under it).
 * Solid background so the list scrolling behind never shows through. Leaves a spacer so content can scroll clear.
 * The extra bottom padding keeps the nav's raised centre Book button off the action.
 */
export const StickyBar = ({ children, className, testId }: { children: ReactNode; className?: string; testId?: string }) => (
  <>
    <div aria-hidden className='h-20' />
    <div
      className='fixed inset-x-0 z-20 border-t border-line bg-bg shadow-[0_-8px_24px_-16px_rgba(0,0,0,0.35)]'
      data-testid={testId}
      style={{ bottom: 'calc(4rem + 1px + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className={cn('mx-auto max-w-lg px-4 pb-6 pt-3', className)}>{children}</div>
    </div>
  </>
)
