import { buttonClass } from '@salon/ui'
import {
  BarChart3,
  Clock,
  CreditCard,
  ExternalLink,
  Images,
  ListChecks,
  Megaphone,
  MonitorPlay,
  Palette,
  QrCode,
  ScrollText,
  Tablet,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { SignOut } from '@/components/studio/SignOut'
import { salonFeatures } from '@/lib/salon'
import { canManage, requireStaff } from '@/lib/staff'

export const metadata = { title: 'More' }

const Tile = ({ href, icon, title, body, external }: { href: string; icon: ReactNode; title: string; body: string; external?: boolean }) => (
  <Link
    className='flex items-start gap-3 rounded-card border border-line bg-surface p-4 transition hover:border-brand'
    href={href}
    target={external ? '_blank' : undefined}
  >
    <span className='mt-0.5 text-brand'>{icon}</span>
    <span>
      <span className='block font-medium'>{title}</span>
      <span className='block text-sm text-muted'>{body}</span>
    </span>
  </Link>
)

export default async function SettingsPage({ params }: { params: Promise<{ salon: string }> }) {
  const { salon: slug } = await params
  const { salon, user } = await requireStaff(slug)
  const manager = canManage(user)
  const features = salonFeatures(salon)
  const base = `/studio/${slug}/settings`
  return (
    <div>
      <h1 className='font-heading text-3xl'>More</h1>

      {manager ? (
        <>
          <h2 className='mt-6 mb-3 text-sm font-medium uppercase tracking-wide text-muted'>Your salon</h2>
          <div className='grid gap-3 sm:grid-cols-2'>
            <Tile body='Name, logo, colours, theme, hours, contact, Wi-Fi' href={`${base}/profile`} icon={<Palette />} title='Salon page & brand' />
            <Tile body='Services, prices, durations, refill cycles' href={`${base}/menu`} icon={<ScrollText />} title='Menu & prices' />
            <Tile body='Add designs, approve customer photos, choose featured' href={`${base}/gallery`} icon={<Images />} title='Gallery' />
            <Tile body='Invite artists, working hours, time off' href={`${base}/team`} icon={<Users />} title='Team & hours' />
            <Tile body='Deposits, cancellations, rewards, message timing' href={`${base}/rules`} icon={<ListChecks />} title='Rules & automatic messages' />
            <Tile body='Plan, WhatsApp costs, invoices' href={`${base}/billing`} icon={<CreditCard />} title='Plan & billing' />
            {features.has('campaigns') ? (
              <Tile body='Offers, festival packs, slot fillers' href={`/studio/${slug}/campaigns`} icon={<Megaphone />} title='Campaigns' />
            ) : null}
            {features.has('reports') ? (
              <Tile body='Revenue, repeat visits, what the app earned' href={`/studio/${slug}/insights`} icon={<BarChart3 />} title='Insights' />
            ) : null}
          </div>
        </>
      ) : (
        <>
          <h2 className='mt-6 mb-3 text-sm font-medium uppercase tracking-wide text-muted'>You</h2>
          <div className='grid gap-3 sm:grid-cols-2'>
            <Tile body='Your visits, ratings and portfolio' href={`/studio/${slug}/me`} icon={<BarChart3 />} title='My stats' />
            <Tile body='Working hours and time off' href={`${base}/team/${user.id}`} icon={<Clock />} title='My hours' />
            <Tile body='Upload your work for the owner to approve' href={`${base}/gallery`} icon={<Images />} title='Add designs' />
          </div>
        </>
      )}

      <h2 className='mt-8 mb-3 text-sm font-medium uppercase tracking-wide text-muted'>In the salon</h2>
      <div className='grid gap-3 sm:grid-cols-2'>
        <Tile body='Mirror, counter and window QR codes, with scan counts' href={`${base}/qr`} icon={<QrCode />} title='QR kit' />
        <Tile body='Customers check themselves in on a tablet' href={`/studio/${slug}/kiosk`} icon={<Tablet />} title='Reception kiosk' />
        <Tile body='Gallery and offers on the salon TV' href={`/studio/${slug}/display`} icon={<MonitorPlay />} title='Salon TV display' />
        {manager ? <Tile body='Every field and record (desktop)' external href='/admin' icon={<ExternalLink />} title='Full admin' /> : null}
      </div>

      <section className='mt-10 rounded-card bg-tint p-4 text-sm'>
        <p className='font-medium'>Need help?</p>
        <p className='text-muted'>WhatsApp our support team any time. We set things up for you.</p>
        <a
          className={buttonClass('secondary', 'sm', 'mt-3')}
          href={`https://wa.me/${(process.env.SUPPORT_WHATSAPP ?? '').replace(/\D/g, '')}?text=${encodeURIComponent(`Hi, I need help with ${salon.name} (${slug})`)}`}
          rel='noopener'
          target='_blank'
        >
          WhatsApp support
        </a>
      </section>

      <div className='mt-8'>
        <SignOut />
      </div>
    </div>
  )
}
