'use client'
import { cn } from '@salon/ui'
import { CalendarPlus, Gift, Home, Sparkles, UserRound } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export const BottomNav = ({ base, labels }: { base: string; labels: { home: string; designs: string; book: string; myNails: string; rewards: string } }) => {
  const path = usePathname()
  const items = [
    { href: base, label: labels.home, icon: Home, exact: true },
    { href: `${base}/designs`, label: labels.designs, icon: Sparkles },
    { href: `${base}/book`, label: labels.book, icon: CalendarPlus, primary: true },
    { href: `${base}/rewards`, label: labels.rewards, icon: Gift },
    { href: `${base}/me`, label: labels.myNails, icon: UserRound },
  ]
  if (path?.includes('/chair') || path?.includes('/display') || path?.includes('/kiosk')) return null
  return (
    <nav className='pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/92 backdrop-blur-md'>
      <div className='mx-auto flex max-w-lg items-stretch justify-around px-2'>
        {items.map((item) => {
          const active = item.exact ? path === item.href || path === `${item.href}/` : path?.startsWith(item.href)
          const Icon = item.icon
          if (item.primary)
            return (
              <Link className='-mt-5 flex flex-col items-center gap-1 px-2 pb-2' href={item.href} key={item.href}>
                <span className='flex h-14 w-14 items-center justify-center rounded-full bg-brand text-on-brand shadow-lg shadow-brand/30'>
                  <Icon size={24} />
                </span>
                <span className='text-[11px] font-medium text-ink'>{item.label}</span>
              </Link>
            )
          return (
            <Link
              className={cn('flex min-w-[64px] flex-col items-center gap-1 px-2 pb-2 pt-2.5 text-[11px]', active ? 'text-brand' : 'text-muted')}
              href={item.href}
              key={item.href}
            >
              <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
              <span className={active ? 'font-semibold' : ''}>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
