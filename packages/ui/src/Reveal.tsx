import type { ReactNode } from 'react'
import { cn } from './cn'

/**
 * Fades and lifts content in on load with pure CSS, so content is never hidden if JavaScript
 * is slow or off, and screenshots and crawlers always see it. Respects reduced-motion.
 */
export const Reveal = ({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) => (
  <div className={cn('animate-fade-up', className)} style={delay ? { animationDelay: `${delay}s` } : undefined}>
    {children}
  </div>
)
