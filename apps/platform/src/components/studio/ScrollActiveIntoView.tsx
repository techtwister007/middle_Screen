'use client'
import { type ReactNode, useEffect, useRef } from 'react'

/** Horizontal chip row that scrolls the active chip ([data-active]) into view. */
export const ScrollActiveIntoView = ({ className, children }: { className?: string; children: ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>('[data-active]')
    if (el && ref.current) ref.current.scrollTo({ left: el.offsetLeft - ref.current.clientWidth / 2 + el.clientWidth / 2, behavior: 'smooth' })
  })
  return (
    <div className={className} ref={ref}>
      {children}
    </div>
  )
}
