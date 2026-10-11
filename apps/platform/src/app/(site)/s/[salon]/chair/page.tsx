import { formatINR } from '@salon/core'
import { buttonClass } from '@salon/ui'
import { CalendarPlus, Gift, Smartphone, Sparkles, Trophy, Wifi } from 'lucide-react'
import Link from 'next/link'
import { translator } from '@/lib/i18n'
import { getLang } from '@/lib/lang'
import { mediaUrl } from '@/lib/media'
import { salonFeatures } from '@/lib/salon'
import { contestNow, currentCustomer, customerHome, designs, loadSalon } from '@/lib/site'

export async function generateMetadata({ params }: { params: Promise<{ salon: string }> }) {
  const { salon: slug } = await params
  return { title: translator(await getLang((await currentCustomer(await loadSalon(slug)))?.language))('inTheChair') }
}

/** Opened from the mirror QR: what to do while sitting in the chair for 1–2 hours. */
export default async function ChairPage({ params }: { params: Promise<{ salon: string }> }) {
  const { salon: slug } = await params
  const salon = await loadSalon(slug)
  const customer = await currentCustomer(salon)
  const tr = translator(await getLang(customer?.language))
  const features = salonFeatures(salon)
  const base = `/s/${slug}`
  const [ideas, contest, me] = await Promise.all([
    designs(salon, 8),
    features.has('contests') ? contestNow(salon) : Promise.resolve(null),
    customer ? customerHome(salon, customer) : Promise.resolve(null),
  ])
  const scratch = features.has('loyalty') ? me?.rewards.find((r) => r.scratch && !r.revealed) : null
  const settings = (salon.settings ?? {}) as { wifiName?: string; wifiPassword?: string; referralFriendReward?: number }
  const tiles = [
    {
      href: `${base}/book?chair=1${me?.lastVisit ? `&repeat=${me.lastVisit.id}` : ''}`,
      icon: CalendarPlus,
      title: tr('prebookTitle'),
      body: tr('prebookBody'),
    },
    scratch ? { href: `${base}/rewards/scratch/${scratch.id}`, icon: Gift, title: tr('scratchYourCard'), body: tr('scratchYourCardBody') } : null,
    contest ? { href: `${base}/contest`, icon: Trophy, title: contest.title, body: tr('contestTileBody') } : null,
    features.has('referrals')
      ? {
          href: `${base}/invite`,
          icon: Sparkles,
          title: tr('inviteFriend'),
          body: tr('inviteTileBody', { amount: formatINR(settings.referralFriendReward ?? 20000) }),
        }
      : null,
    { href: `${base}?install=1`, icon: Smartphone, title: tr('installTitle'), body: tr('installTileBody') },
  ].filter(Boolean) as { href: string; icon: typeof Gift; title: string; body: string }[]
  return (
    <div className='px-4 pt-6'>
      <p className='text-xs font-semibold uppercase tracking-[0.3em] text-brand'>{tr('inTheChair')}</p>
      <h1 className='mt-1 font-heading text-4xl'>{customer?.name ? tr('relaxName', { name: customer.name.split(' ')[0] }) : tr('relaxEnjoy')}</h1>
      {settings.wifiName ? (
        <p className='mt-3 flex items-center gap-2 text-sm text-muted'>
          <Wifi size={15} /> {settings.wifiName} · {settings.wifiPassword}
        </p>
      ) : null}
      {!customer ? (
        <Link className={buttonClass('primary', 'lg', 'mt-5 w-full')} href={`${base}/login?next=${encodeURIComponent(`${base}/chair`)}`}>
          {tr('loginForPhotos')}
        </Link>
      ) : null}
      <div className='mt-6 space-y-3'>
        {tiles.map((t) => (
          <Link className='flex items-center gap-4 rounded-card border border-line bg-surface p-4' href={t.href} key={t.href}>
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
      <h2 className='mb-3 mt-8 font-heading text-xl'>{tr('ideasNextTime')}</h2>
      <div className='no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4'>
        {ideas.map((d) => (
          <Link className='w-36 shrink-0' href={`${base}/designs/${d.id}`} key={String(d.id)}>
            <img alt={d.title} className='aspect-square w-full rounded-card object-cover' loading='lazy' src={mediaUrl(d.images?.[0], 'thumb') ?? undefined} />
            <p className='mt-1.5 truncate text-sm'>{d.title}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
