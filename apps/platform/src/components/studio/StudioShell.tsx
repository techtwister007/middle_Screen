'use client'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

const isFullScreen = (path: string | null) => Boolean(path && /\/(kiosk|display)$/.test(path))

/**
 * Studio chrome (header, demo banner, padded main). Kiosk and TV display are customer-facing,
 * so they get the whole screen with no staff header or links.
 */
export const StudioShell = ({ header, banner, children }: { header: ReactNode; banner?: ReactNode; children: ReactNode }) => {
  const path = usePathname()
  if (isFullScreen(path)) return <main className='min-h-dvh'>{children}</main>
  return (
    <>
      {header}
      {banner}
      <main className='mx-auto max-w-4xl px-4 pb-36 pt-20 md:pl-64 md:pr-8 md:pb-28 print:max-w-none print:p-0'>{children}</main>
    </>
  )
}
