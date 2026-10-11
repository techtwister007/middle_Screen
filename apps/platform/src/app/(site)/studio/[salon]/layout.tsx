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
  const admin = user.role === 'platform-admin'
  const showBanner = salon.status === 'demo' || admin
  const demoSettings = (salon.settings ?? {}) as { keepDemo?: boolean | null; demoExpiresAt?: string | null }
  const demoEnds =
    salon.status === 'demo' && !demoSettings.keepDemo && demoSettings.demoExpiresAt
      ? new Date(demoSettings.demoExpiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: salon.timezone ?? 'Asia/Kolkata' })
      : null
  return (
    <div className='min-h-dvh bg-bg'>
      <link
        href='https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap'
        precedence='default'
        rel='stylesheet'
      />
      <StudioShell
        banner={
          showBanner ? (
            // One line at every width: its height must match the space StudioShell reserves, or it covers the page title.
            <div className='fixed inset-x-0 top-14 z-20 flex h-11 items-center justify-between gap-3 bg-ink px-4 text-xs text-bg print:hidden md:pl-64'>
              <span className='min-w-0 truncate'>
                {salon.status === 'demo' ? `Demo · sample data${demoEnds ? ` · ends ${demoEnds}` : ''}` : ''}
                {salon.status === 'demo' && admin ? ' · ' : ''}
                {admin ? <span className='hidden sm:inline'>Viewing as platform support</span> : null}
                {admin ? <span className='sm:hidden'>Support view</span> : null}
              </span>
              {admin ? (
                <Link className='inline-flex min-h-8 shrink-0 items-center rounded-btn bg-bg px-3 font-medium text-ink' href={`/console/salons/${slug}`}>
                  Exit to console
                </Link>
              ) : null}
            </div>
          ) : null
        }
        hasBanner={showBanner}
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
      <StudioNav banner={showBanner} base={base} features={[...salonFeatures(salon)]} manager={canManage(user)} />
      <Toaster />
    </div>
  )
}
