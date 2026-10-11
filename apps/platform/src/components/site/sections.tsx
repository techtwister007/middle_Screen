import { formatDuration } from '@salon/modules'
import { formatINR, formatIST } from '@salon/core'
import type { SectionProps, ThemeLayout } from '@salon/themes'
import { Badge, Reveal, SectionTitle, buttonClass, cn } from '@salon/ui'

import { ArrowRight, CalendarCheck, Clock, Gift, AtSign, MapPin, Sparkles, Star, Trophy } from 'lucide-react'
import Link from 'next/link'
import { mediaUrl, srcSet } from '@/lib/media'
import type { DesignRecord, ServiceRecord } from '@/lib/site'

const cardClass = (layout: ThemeLayout) =>
  layout.cards === 'soft'
    ? 'rounded-card bg-surface shadow-[0_8px_30px_-12px_rgba(60,20,40,0.18)]'
    : layout.cards === 'outline'
      ? 'rounded-card border border-line bg-surface'
      : 'rounded-card bg-tint'

const Wrap = ({ children, className, motion }: { children: React.ReactNode; className?: string; motion: ThemeLayout['motion'] }) =>
  motion === 'none' ? <section className={cn('px-4', className)}>{children}</section> : <Reveal className={cn('px-4', className)}>{children}</Reveal>

export interface HomeData {
  layout: ThemeLayout
  labels: Record<string, string>
  designs: DesignRecord[]
  services: ServiceRecord[]
  offers: { id: string | number; title: string; description?: string | null; image?: unknown; endsAt?: string | null }[]
  artists: { id: string | number; name: string; bio?: string | null; avatar?: unknown; specialties?: string[] | null }[]
  ratings: { id: string | number; score: number; comment?: string | null; customer?: { name?: string | null } | string | number }[]
  contest: { id: string | number; title: string; prize?: string | null; endsAt: string } | null
  me: null | {
    upcoming: { id: string | number; start: string; status: string; staff?: { name?: string } | string | number }[]
    account: { stamps: number; points: number; tier: string } | null
    rewards: { id: string | number; title: string; validTo?: string | null; scratch?: boolean | null; revealed?: boolean | null }[]
    wallet: number
    lastVisit: { id: string | number; designName?: string | null; photos?: unknown[] | null } | null
    nextDueDate?: string | null
    stampsForReward: number
  }
  contact: { address?: string | null; mapUrl?: string | null; parking?: string | null; whatsapp?: string | null; phone?: string | null }
  hours: { day: string; open?: string | null; close?: string | null; closed?: boolean | null }[]
  timezone: string
}

type P = SectionProps & { data: HomeData }

export const Hero = ({ salon, base, customer, data }: P) => {
  const { layout, labels } = data
  const featured = data.designs.find((d) => d.featured) ?? data.designs[0]
  const cover = salon.coverUrl ?? mediaUrl(featured?.images?.[0], 'large')
  const greeting = customer ? `${labels.hello} ${customer.firstName}` : salon.tagline || labels.welcome
  if (layout.hero === 'full')
    return (
      <section className="relative -mt-px h-[78vh] min-h-[520px] overflow-hidden">
        {cover ? <img alt="" className="absolute inset-0 h-full w-full object-cover" src={cover} /> : <div className="absolute inset-0 bg-tint" />}
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/75 to-bg/10" />
        <div className="absolute inset-x-0 bottom-0 px-6 pb-10">
          {salon.openNow ? <p className="mb-4 text-xs uppercase tracking-[0.3em] text-brand">{salon.openNow.label}</p> : null}
          <h1 className="font-heading text-5xl leading-[1.02] text-ink">{greeting}</h1>
          {salon.about ? <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted">{salon.about}</p> : null}
          <div className="mt-7 flex gap-3">
            <Link className={buttonClass('primary', 'lg')} href={`${base}/book`}>
              {labels.book}
            </Link>
            <Link className={buttonClass('outline', 'lg')} href={`${base}/designs`}>
              {labels.designs}
            </Link>
          </div>
        </div>
      </section>
    )
  if (layout.hero === 'editorial')
    return (
      <section className="px-4 pt-8">
        <h1 className="font-heading text-[56px] leading-[0.95] text-ink">{greeting}</h1>
        <div className="mt-6 grid grid-cols-3 gap-1.5">
          {data.designs.slice(0, 6).map((d, i) => (
            <Link className={cn('relative overflow-hidden bg-tint', i === 0 ? 'col-span-2 row-span-2 aspect-square' : 'aspect-square')} href={`${base}/designs/${d.id}`} key={String(d.id)}>
              <img alt={d.title} className="h-full w-full object-cover" loading={i < 3 ? 'eager' : 'lazy'} sizes="(max-width: 512px) 66vw, 340px" src={mediaUrl(d.images?.[0], 'card') ?? ''} srcSet={srcSet(d.images?.[0])} />
            </Link>
          ))}
        </div>
        <div className="mt-6 flex items-center justify-between border-y border-line py-4 text-sm">
          <span className="text-muted">{salon.openNow?.label ?? salon.area}</span>
          <Link className="inline-flex items-center gap-1 font-medium" href={`${base}/book`}>
            {labels.book} <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    )
  return (
    <section className="px-4 pt-6">
      <div className={cn('overflow-hidden', cardClass(layout))}>
        <div className="relative aspect-[4/3]">
          {cover ? <img alt="" className="h-full w-full object-cover" src={cover} /> : <div className="h-full w-full bg-tint" />}
          {salon.openNow ? (
            <span className={cn('absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-medium backdrop-blur', salon.openNow.open ? 'bg-white/85 text-emerald-700' : 'bg-white/85 text-ink')}>
              {salon.openNow.label}
            </span>
          ) : null}
        </div>
        <div className="p-5">
          <h1 className="font-heading text-[34px] leading-[1.05]">{greeting}</h1>
          {salon.about ? <p className="mt-2 text-[15px] leading-relaxed text-muted">{salon.about}</p> : null}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Link className={buttonClass('primary', 'lg')} href={`${base}/book`}>
              <CalendarCheck size={18} /> {labels.book}
            </Link>
            <Link className={buttonClass('secondary', 'lg')} href={`${base}/designs`}>
              {labels.designs}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

export const NextVisit = ({ base, data }: P) => {
  const me = data.me
  if (!me) return null
  const appt = me.upcoming[0]
  const scratch = me.rewards.find((r) => r.scratch && !r.revealed)
  const daysToDue = me.nextDueDate ? Math.ceil((new Date(me.nextDueDate).getTime() - Date.now()) / 86_400_000) : null
  return (
    <Wrap className="mt-6 space-y-3" motion={data.layout.motion}>
      {scratch ? (
        <Link className={cn('flex items-center gap-4 p-4', cardClass(data.layout))} href={`${base}/rewards/scratch/${scratch.id}`}>
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/25 text-brand">
            <Gift size={22} />
          </span>
          <div className="flex-1">
            <p className="font-medium">You have a scratch card!</p>
            <p className="text-sm text-muted">Scratch to reveal your next-visit reward</p>
          </div>
          <ArrowRight className="text-brand" size={18} />
        </Link>
      ) : null}
      {appt ? (
        <Link className={cn('block p-4', cardClass(data.layout))} href={`${base}/appointments/${appt.id}`}>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand">{data.labels.nextVisit}</p>
          <p className="mt-1 font-heading text-xl">{formatIST(appt.start, 'EEEE d MMM · h:mm a', data.timezone)}</p>
          <p className="text-sm text-muted">
            {typeof appt.staff === 'object' && appt.staff?.name ? `with ${appt.staff.name}` : ''} {appt.status === 'requested' ? '· waiting for confirmation' : ''}
          </p>
        </Link>
      ) : daysToDue !== null ? (
        <div className={cn('flex items-center gap-4 p-4', cardClass(data.layout))}>
          <div className="flex h-14 w-14 flex-col items-center justify-center rounded-full border-2 border-brand text-brand">
            <span className="font-heading text-lg leading-none">{Math.max(daysToDue, 0)}</span>
            <span className="text-[9px] uppercase">days</span>
          </div>
          <div className="flex-1">
            <p className="font-medium">{daysToDue <= 0 ? 'Your refill is due now' : `${data.labels.refillIn} in ${daysToDue} days`}</p>
            <Link className="text-sm font-medium text-brand" href={`${base}/book?repeat=${me.lastVisit?.id ?? ''}`}>
              {data.labels.repeatLast} →
            </Link>
          </div>
        </div>
      ) : null}
      <div className="grid grid-cols-3 gap-2">
        <Link className={cn('p-3 text-center', cardClass(data.layout))} href={`${base}/rewards`}>
          <p className="font-heading text-2xl">
            {me.account?.stamps ?? 0}
            <span className="text-sm text-muted">/{me.stampsForReward}</span>
          </p>
          <p className="text-[11px] text-muted">stamps</p>
        </Link>
        <Link className={cn('p-3 text-center', cardClass(data.layout))} href={`${base}/rewards`}>
          <p className="font-heading text-2xl">{me.account?.points ?? 0}</p>
          <p className="text-[11px] text-muted">points</p>
        </Link>
        <Link className={cn('p-3 text-center', cardClass(data.layout))} href={`${base}/rewards`}>
          <p className="font-heading text-2xl">{me.wallet ? formatINR(me.wallet) : me.rewards.filter((r) => !r.scratch || r.revealed).length}</p>
          <p className="text-[11px] text-muted">{me.wallet ? 'wallet' : 'rewards'}</p>
        </Link>
      </div>
    </Wrap>
  )
}

export const Offers = ({ base, data }: P) => {
  if (!data.offers.length) return null
  return (
    <Wrap className="mt-10" motion={data.layout.motion}>
      <SectionTitle title={data.labels.offers} />
      <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4">
        {data.offers.map((o) => (
          <Link className={cn('w-[78%] shrink-0 snap-start overflow-hidden', cardClass(data.layout))} href={`${base}/offers/${o.id}`} key={String(o.id)}>
            {mediaUrl(o.image) ? <img alt="" className="aspect-[16/9] w-full object-cover" src={mediaUrl(o.image) ?? ''} /> : <div className="aspect-[16/9] w-full bg-gradient-to-br from-brand/80 to-accent/80" />}
            <div className="p-4">
              <p className="font-heading text-lg leading-snug">{o.title}</p>
              {o.endsAt ? <p className="mt-1 text-xs text-muted">Until {formatIST(o.endsAt, 'd MMM', data.timezone)}</p> : null}
            </div>
          </Link>
        ))}
      </div>
    </Wrap>
  )
}

export const DesignTile = ({ design, base, tall }: { design: DesignRecord; base: string; tall?: boolean }) => (
  <Link className="group block" href={`${base}/designs/${design.id}`}>
    <div className={cn('relative overflow-hidden rounded-card bg-tint', tall ? 'aspect-[3/4]' : 'aspect-square')}>
      <img
        alt={design.title}
        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        loading="lazy"
        sizes="(max-width: 512px) 50vw, 256px"
        src={mediaUrl(design.images?.[0], 'card') ?? ''}
        srcSet={srcSet(design.images?.[0])}
      />
      {design.source === 'customer' ? <span className="absolute left-2 top-2 rounded-full bg-black/45 px-2 py-0.5 text-[10px] text-white backdrop-blur">Client photo</span> : null}
    </div>
    <div className="mt-2 px-0.5">
      <p className="truncate text-[14px] font-medium">{design.title}</p>
      <p className="text-xs text-muted">
        {design.priceFrom ? `from ${formatINR(design.priceFrom)}` : ''}
        {design.durationMinutes ? ` · ${formatDuration(design.durationMinutes)}` : ''}
      </p>
    </div>
  </Link>
)

export const NewDesigns = ({ base, data }: P) => {
  const items = data.designs.slice(0, data.layout.gallery === 'editorial' ? 5 : 6)
  if (!items.length) return null
  return (
    <Wrap className="mt-10" motion={data.layout.motion}>
      <SectionTitle
        action={
          <Link className="text-sm font-medium text-brand" href={`${base}/designs`}>
            See all
          </Link>
        }
        title={data.labels.newThisMonth}
      />
      {data.layout.gallery === 'editorial' ? (
        <div className="space-y-3">
          {items[0] ? <DesignTile base={base} design={items[0]} tall /> : null}
          <div className="grid grid-cols-2 gap-3">
            {items.slice(1).map((d) => (
              <DesignTile base={base} design={d} key={String(d.id)} />
            ))}
          </div>
        </div>
      ) : data.layout.gallery === 'masonry' ? (
        <div className="columns-2 gap-3 [&>*]:mb-4 [&>*]:break-inside-avoid">
          {items.map((d, i) => (
            <DesignTile base={base} design={d} key={String(d.id)} tall={i % 3 === 0} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-5">
          {items.map((d) => (
            <DesignTile base={base} design={d} key={String(d.id)} />
          ))}
        </div>
      )}
    </Wrap>
  )
}

export const Services = ({ base, data }: P) => {
  const main = data.services.filter((s) => !s.isAddOn).slice(0, 6)
  if (!main.length) return null
  return (
    <Wrap className="mt-10" motion={data.layout.motion}>
      <SectionTitle
        action={
          <Link className="text-sm font-medium text-brand" href={`${base}/menu`}>
            Full menu
          </Link>
        }
        title={data.labels.menu}
      />
      <div className={cn('divide-y divide-line overflow-hidden', cardClass(data.layout))}>
        {main.map((s) => (
          <Link className="flex items-center justify-between gap-4 px-4 py-3.5" href={`${base}/book?service=${s.id}`} key={String(s.id)}>
            <div>
              <p className="font-medium">{s.name}</p>
              <p className="flex items-center gap-1 text-xs text-muted">
                <Clock size={12} /> {formatDuration(s.durationMinutes)}
              </p>
            </div>
            <span className="font-heading text-lg tabular-nums">{formatINR(s.price)}</span>
          </Link>
        ))}
      </div>
    </Wrap>
  )
}

export const Loyalty = ({ base, data }: P) => {
  if (data.me) return null
  return (
    <Wrap className="mt-10" motion={data.layout.motion}>
      <div className={cn('flex items-center gap-4 p-5', cardClass(data.layout))}>
        <div className="flex -space-x-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <span className={cn('h-8 w-8 rounded-full border-2 border-surface', i < 3 ? 'bg-brand' : 'bg-line')} key={i} />
          ))}
        </div>
        <div className="flex-1">
          <p className="font-medium">Collect stamps, earn a free set</p>
          <p className="text-sm text-muted">Digital card. Never lost.</p>
        </div>
        <Link className={buttonClass('outline', 'sm')} href={`${base}/login?next=${encodeURIComponent(`${base}/rewards`)}`}>
          Join
        </Link>
      </div>
    </Wrap>
  )
}

export const Invite = ({ base, data }: P) => (
  <Wrap className="mt-10" motion={data.layout.motion}>
    <Link className="relative block overflow-hidden rounded-card bg-brand p-6 text-on-brand" href={`${base}/invite`}>
      <Gift className="absolute -right-4 -top-4 opacity-15" size={120} />
      <p className="font-heading text-2xl leading-tight">{data.labels.inviteFriend}</p>
      <p className="mt-1 max-w-[16rem] text-sm opacity-85">Send ₹200 off their first visit. You get a reward when they come in.</p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold">
        Send a gift <ArrowRight size={16} />
      </span>
    </Link>
  </Wrap>
)

export const Contest = ({ base, data }: P) => {
  if (!data.contest) return null
  return (
    <Wrap className="mt-10" motion={data.layout.motion}>
      <Link className={cn('flex items-center gap-4 p-5', cardClass(data.layout))} href={`${base}/contest`}>
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/25 text-brand">
          <Trophy size={22} />
        </span>
        <div className="flex-1">
          <p className="font-medium">{data.contest.title}</p>
          <p className="text-sm text-muted">Vote for your favourite · prize: {data.contest.prize ?? 'a free set'}</p>
        </div>
        <ArrowRight className="text-brand" size={18} />
      </Link>
    </Wrap>
  )
}

export const Artists = ({ data }: P) => {
  if (!data.artists.length) return null
  return (
    <Wrap className="mt-10" motion={data.layout.motion}>
      <SectionTitle title={data.labels.ourArtists} />
      <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4">
        {data.artists.map((a) => (
          <div className="w-28 shrink-0 text-center" key={String(a.id)}>
            {mediaUrl(a.avatar, 'thumb') ? (
              <img alt={a.name} className="mx-auto h-20 w-20 rounded-full object-cover" src={mediaUrl(a.avatar, 'thumb') ?? ''} />
            ) : (
              <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-tint font-heading text-2xl text-brand">{a.name.slice(0, 1)}</span>
            )}
            <p className="mt-2 text-sm font-medium">{a.name.split(' ')[0]}</p>
            {a.specialties?.[0] ? <p className="text-[11px] text-muted">{a.specialties[0]}</p> : null}
          </div>
        ))}
      </div>
    </Wrap>
  )
}

export const Reviews = ({ data }: P) => {
  if (!data.ratings.length) return null
  return (
    <Wrap className="mt-10" motion={data.layout.motion}>
      <SectionTitle title={data.labels.lovedBy} />
      <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4">
        {data.ratings.map((r) => (
          <figure className={cn('w-72 shrink-0 p-4', cardClass(data.layout))} key={String(r.id)}>
            <div className="flex gap-0.5 text-accent">
              {Array.from({ length: r.score }).map((_, i) => (
                <Star fill="currentColor" key={i} size={14} />
              ))}
            </div>
            <blockquote className="mt-2 text-[15px] leading-relaxed">“{r.comment}”</blockquote>
            <figcaption className="mt-2 text-xs text-muted">{typeof r.customer === 'object' && r.customer?.name ? r.customer.name.split(' ')[0] : 'A client'}</figcaption>
          </figure>
        ))}
      </div>
    </Wrap>
  )
}

const DAY_LABEL: Record<string, string> = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' }

export const Visit = ({ salon, data }: P) => (
  <Wrap className="mt-10" motion={data.layout.motion}>
    <SectionTitle title={data.labels.visitUs} />
    <div className={cn('space-y-4 p-5', cardClass(data.layout))}>
      {data.contact.address ? (
        <p className="flex gap-3 text-[15px]">
          <MapPin className="mt-0.5 shrink-0 text-brand" size={18} />
          <span>
            {data.contact.address}
            {data.contact.parking ? <span className="block text-sm text-muted">{data.contact.parking}</span> : null}
          </span>
        </p>
      ) : null}
      {data.hours.length ? (
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
          {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((d) => {
            const h = data.hours.find((x) => x.day === d)
            return (
              <div className="flex justify-between" key={d}>
                <span className="text-muted">{DAY_LABEL[d]}</span>
                <span className="tabular-nums">{!h || h.closed ? 'Closed' : `${h.open}–${h.close}`}</span>
              </div>
            )
          })}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {data.contact.mapUrl ? (
          <a className={buttonClass('secondary', 'sm')} href={data.contact.mapUrl} rel="noopener" target="_blank">
            <MapPin size={14} /> Directions
          </a>
        ) : null}
        {data.contact.whatsapp ? (
          <a className={buttonClass('secondary', 'sm')} href={`https://wa.me/${data.contact.whatsapp.replace(/\D/g, '')}`} rel="noopener" target="_blank">
            WhatsApp
          </a>
        ) : null}
        {salon.instagram ? (
          <a className={buttonClass('secondary', 'sm')} href={`https://instagram.com/${salon.instagram}`} rel="noopener" target="_blank">
            <AtSign size={14} /> @{salon.instagram}
          </a>
        ) : null}
      </div>
    </div>
  </Wrap>
)

export const Gallery = NewDesigns

export const DEFAULT_SECTIONS_MAP = {
  hero: Hero,
  nextVisit: NextVisit,
  offers: Offers,
  newDesigns: NewDesigns,
  services: Services,
  gallery: Gallery,
  loyalty: Loyalty,
  invite: Invite,
  contest: Contest,
  artists: Artists,
  reviews: Reviews,
  visit: Visit,
}

export { Badge, Sparkles }
