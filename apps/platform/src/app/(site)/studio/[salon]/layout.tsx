import Link from 'next/link'
import type { ReactNode } from 'react'
import { StudioNav } from '@/components/studio/StudioNav'
import { salonFeatures } from '@/lib/salon'
import { canManage, requireStaff } from '@/lib/staff'

export default async function StudioLayout({ children, params }: { children: ReactNode; params: Promise<{ salon: string }> }) {
  const { salon: slug } = await params
  const { salon, user } = await requireStaff(slug)
  const base = `/studio/${slug}`
  return (
    <div className='min-h-dvh bg-bg'>
      <link
        href='https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap'
        precedence='default'
        rel='stylesheet'
      />
      <header className='fixed inset-x-0 top-0 z-20 print:hidden border-b border-line bg-surface/95 backdrop-blur'>
        <div className='flex h-14 items-center justify-between px-4 md:px-6'>
          <Link className='font-heading text-lg' href={`${base}/today`}>
            {salon.name} <span className='text-xs font-normal text-muted'>Studio</span>
          </Link>
          <div className='flex items-center gap-3 text-sm'>
            <Link className='hidden text-brand sm:inline' href={`/s/${slug}`} target='_blank'>
              Customer app ↗
            </Link>
            <span className='text-muted'>{user.name.split(' ')[0]}</span>
          </div>
        </div>
      </header>
      <StudioNav base={base} features={[...salonFeatures(salon)]} manager={canManage(user)} />
      <main className='mx-auto max-w-4xl px-4 pb-28 pt-20 md:pl-64 md:pr-8 print:max-w-none print:p-0'>{children}</main>
    </div>
  )
}
