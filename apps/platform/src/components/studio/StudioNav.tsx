'use client'
import { cn } from '@salon/ui'
import { BarChart3, Camera, CreditCard, LayoutList, Megaphone, Settings, Users } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Item = { href: string; label: string; icon: typeof LayoutList; manager?: boolean; feature?: string; desktopOnly?: boolean }

const ITEMS: Item[] = [
  { href: 'today', label: 'Today', icon: LayoutList },
  { href: 'checkout', label: 'Checkout', icon: CreditCard },
  { href: 'photos', label: 'Photos', icon: Camera, feature: 'contentEngine' },
  { href: 'customers', label: 'Customers', icon: Users },
  // On phones Campaigns lives under More (and the Today feed) so the bar keeps 5–6 thumb-sized tabs.
  { href: 'campaigns', label: 'Campaigns', icon: Megaphone, manager: true, feature: 'campaigns', desktopOnly: true },
  { href: 'insights', label: 'Insights', icon: BarChart3, manager: true, feature: 'reports' },
  { href: 'settings', label: 'More', icon: Settings },
]

export const StudioNav = ({ base, manager, features }: { base: string; manager: boolean; features: string[] }) => {
  const path = usePathname()
  const items = ITEMS.filter((i) => (manager || !i.manager) && (!i.feature || features.includes(i.feature)))
  if (path?.endsWith('/display') || path?.endsWith('/kiosk')) return null
  return (
    <>
      <nav className='pb-safe print:hidden fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur md:hidden'>
        <div className='flex justify-around'>
          {items
            .filter((i) => !i.desktopOnly)
            .map((i) => {
              const active = path?.startsWith(`${base}/${i.href}`)
              return (
                <Link
                  className={cn('flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px]', active ? 'text-brand' : 'text-muted')}
                  href={`${base}/${i.href}`}
                  key={i.href}
                >
                  <i.icon size={21} />
                  {i.label}
                </Link>
              )
            })}
        </div>
      </nav>
      <aside className='fixed inset-y-0 left-0 hidden w-56 print:hidden border-r border-line bg-surface px-3 pt-20 md:block'>
        {items.map((i) => {
          const active = path?.startsWith(`${base}/${i.href}`)
          return (
            <Link
              className={cn(
                'mb-1 flex items-center gap-3 rounded-btn px-3 py-2.5 text-sm',
                active ? 'bg-brand/10 font-medium text-brand' : 'text-ink hover:bg-tint',
              )}
              href={`${base}/${i.href}`}
              key={i.href}
            >
              <i.icon size={18} />
              {i.label}
            </Link>
          )
        })}
      </aside>
    </>
  )
}
