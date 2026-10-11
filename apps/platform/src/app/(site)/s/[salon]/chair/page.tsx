import { buttonClass } from '@salon/ui'
import { CalendarPlus, Gift, Smartphone, Sparkles, Trophy, Wifi } from 'lucide-react'
import Link from 'next/link'
import { mediaUrl } from '@/lib/media'
import { contestNow, currentCustomer, customerHome, designs, loadSalon } from '@/lib/site'

export const metadata = { title: 'Relax, you are in good hands' }

/** Opened from the mirror QR: what to do while sitting in the chair for 1–2 hours. */
export default async function ChairPage({ params }: { params: Promise<{ salon: string }> }) {
  const { salon: slug } = await params
  const salon = await loadSalon(slug)
  const customer = await currentCustomer(salon)
  const base = `/s/${slug}`
  const [ideas, contest, me] = await Promise.all([designs(salon, 8), contestNow(salon), customer ? customerHome(salon, customer) : Promise.resolve(null)])
  const scratch = me?.rewards.find((r) => r.scratch && !r.revealed)
  const wifi = (salon.settings as { wifiName?: string; wifiPassword?: string } | null) ?? {}
  const tiles = [
    {
      href: `${base}/book?chair=1${me?.lastVisit ? `&repeat=${me.lastVisit.id}` : ''}`,
      icon: CalendarPlus,
      title: 'Pre-book my next refill',
      body: 'Lock your favourite slot now. +50 points.',
    },
    scratch ? { href: `${base}/rewards/scratch/${scratch.id}`, icon: Gift, title: 'Scratch your card', body: 'Your next-visit reward is waiting.' } : null,
    contest ? { href: `${base}/contest`, icon: Trophy, title: contest.title, body: 'Enter your new set and get votes.' } : null,
    { href: `${base}/invite`, icon: Sparkles, title: 'Gift a friend', body: 'They get ₹200 off, you get rewarded.' },
    { href: `${base}?install=1`, icon: Smartphone, title: 'Add us to your home screen', body: 'Your nail diary and rewards, one tap away.' },
  ].filter(Boolean) as { href: string; icon: typeof Gift; title: string; body: string }[]
  return (
    <div className='px-4 pt-6'>
      <p className='text-xs font-semibold uppercase tracking-[0.3em] text-brand'>In the chair</p>
      <h1 className='mt-1 font-heading text-4xl'>{customer?.name ? `Relax, ${customer.name.split(' ')[0]}` : 'Relax and enjoy'}</h1>
      {wifi.wifiName ? (
        <p className='mt-3 flex items-center gap-2 text-sm text-muted'>
          <Wifi size={15} /> {wifi.wifiName} · {wifi.wifiPassword}
        </p>
      ) : null}
      {!customer ? (
        <Link className={buttonClass('primary', 'lg', 'mt-5 w-full')} href={`${base}/login?next=${encodeURIComponent(`${base}/chair`)}`}>
          Log in to get today's photos & rewards
        </Link>
      ) : null}
      <div className='mt-6 space-y-3'>
        {tiles.map((t) => (
          <Link className='flex items-center gap-4 rounded-card border border-line bg-surface p-4' href={t.href} key={t.title}>
            <span className='flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand'>
              <t.icon size={22} />
            </span>
            <span>
              <span className='block font-medium'>{t.title}</span>
              <span className='text-sm text-muted'>{t.body}</span>
            </span>
          </Link>
        ))}
      </div>
      <h2 className='mb-3 mt-8 font-heading text-xl'>Ideas for next time</h2>
      <div className='no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4'>
        {ideas.map((d) => (
          <Link className='w-36 shrink-0' href={`${base}/designs/${d.id}`} key={String(d.id)}>
            <img alt={d.title} className='aspect-square w-full rounded-card object-cover' loading='lazy' src={mediaUrl(d.images?.[0], 'thumb') ?? ''} />
            <p className='mt-1.5 truncate text-sm'>{d.title}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
