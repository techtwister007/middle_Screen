'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  ['/console', 'Salons'],
  ['/console/new', 'New salon / demo'],
  ['/console/library', 'Design library'],
  ['/console/content', 'Content'],
  ['/admin', 'Admin'],
] as const

/** Console navigation. Hidden on prospect-facing screens (ROI calculator) so a projected laptop shows only the pitch. */
export const ConsoleHeader = () => {
  const path = usePathname() ?? ''
  if (path.endsWith('/roi')) return null
  return (
    <header className='border-b border-line bg-surface'>
      <div className='mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2 sm:px-6'>
        <Link className='flex min-h-11 items-center font-heading text-lg' href='/console'>
          Platform console
        </Link>
        <nav className='no-scrollbar -mx-1 flex gap-1 overflow-x-auto text-sm'>
          {LINKS.map(([href, label]) => {
            const active = href === '/console' ? path === '/console' || path.startsWith('/console/salons') : path.startsWith(href)
            return (
              <Link
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-11 shrink-0 items-center rounded-btn px-3 ${active ? 'bg-tint font-medium text-brand' : 'hover:bg-tint'}`}
                href={href}
                key={href}
              >
                {label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
