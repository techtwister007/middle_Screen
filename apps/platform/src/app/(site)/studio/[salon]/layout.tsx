import Link from 'next/link'
import type { ReactNode } from 'react'
import { StudioNav } from '@/components/studio/StudioNav'
import { StudioShell } from '@/components/studio/StudioShell'
import { Toaster } from '@/components/studio/Toast'
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
      <StudioShell
        banner={
          salon.status === 'demo' || user.role === 'platform-admin' ? (
            <div className='fixed inset-x-0 top-14 z-20 flex justify-center gap-2 bg-ink px-4 py-1 text-center text-xs text-bg print:hidden'>
              {salon.status === 'demo' ? (
                <span>
                  Demo salon with sample data
                  {salon.settings?.keepDemo
                    ? ''
                    : ` · ends ${new Date(new Date(salon.createdAt).getTime() + 7 * 86_400_000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })}`}
                </span>
              ) : null}
              {user.role === 'platform-admin' ? <span>{salon.status === 'demo' ? '·' : ''} Viewing as platform support</span> : null}
            </div>
          ) : null
        }
        header={
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
        }
      >
        {children}
      </StudioShell>
      <StudioNav base={base} features={[...salonFeatures(salon)]} manager={canManage(user)} />
      <Toaster />
    </div>
  )
}
