'use client'
import useEmblaCarousel from 'embla-carousel-react'
import { type ReactNode, useCallback, useEffect, useState } from 'react'
import { cn } from './cn'

/** Swipeable carousel (Embla) with dots. */
export const Carousel = ({ children, className, dots = true }: { children: ReactNode[]; className?: string; dots?: boolean }) => {
  const [ref, api] = useEmblaCarousel({ loop: false, align: 'start' })
  const [index, setIndex] = useState(0)
  const onSelect = useCallback(() => setIndex(api?.selectedScrollSnap() ?? 0), [api])
  useEffect(() => {
    api?.on('select', onSelect)
    return () => {
      api?.off('select', onSelect)
    }
  }, [api, onSelect])
  return (
    <div className={cn('relative', className)}>
      <div className="overflow-hidden" ref={ref}>
        <div className="flex">
          {children.map((child, i) => (
            <div className="min-w-0 shrink-0 grow-0 basis-full" key={i}>
              {child}
            </div>
          ))}
        </div>
      </div>
      {dots && children.length > 1 ? (
        <div className="mt-3 flex justify-center gap-1.5">
          {children.map((_, i) => (
            <button
              aria-label={`Go to slide ${i + 1}`}
              className={cn('h-1.5 rounded-full transition-all', i === index ? 'w-6 bg-brand' : 'w-1.5 bg-line')}
              key={i}
              onClick={() => api?.scrollTo(i)}
              type="button"
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
