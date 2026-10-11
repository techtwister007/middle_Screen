import type { ReactNode } from 'react'
import { ConsoleHeader } from '@/components/console/ConsoleHeader'
import { requirePlatformAdmin } from '@/lib/staff'

export default async function ConsoleLayout({ children }: { children: ReactNode }) {
  await requirePlatformAdmin()
  return (
    <div className='min-h-dvh bg-bg'>
      <link
        href='https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap'
        precedence='default'
        rel='stylesheet'
      />
      <ConsoleHeader />
      <main className='mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8'>{children}</main>
    </div>
  )
}
