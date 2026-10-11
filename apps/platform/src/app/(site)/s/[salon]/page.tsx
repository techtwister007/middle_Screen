import { formatINR } from '@salon/core'
import type { SectionKey } from '@salon/themes'
import { DEFAULT_SECTIONS_MAP, type HomeData, QuickLinks, SeasonBanner } from '@/components/site/sections'
import { translator } from '@/lib/i18n'
import { getLang } from '@/lib/lang'
import { mediaUrl } from '@/lib/media'
import { homeSectionOrder, salonFeatures, salonTheme, sectionSalon } from '@/lib/salon'
import { artists, contestNow, currentCustomer, customerHome, designs, firstName, liveOffers, loadSalon, recentRatings, services } from '@/lib/site'
import { currentSeason, openStatusIn } from './_lib/gate'

export default async function SalonHome({ params }: { params: Promise<{ salon: string }> }) {
  const { salon: slug } = await params
  const salon = await loadSalon(slug)
  const customer = await currentCustomer(salon)
  const lang = await getLang(customer?.language)
  const tr = translator(lang)
  const features = salonFeatures(salon)
  const { theme } = salonTheme(salon)
  const base = `/s/${salon.slug}`
  const settings = (salon.settings ?? {}) as { stampsForReward?: number; referralFriendReward?: number }

  const [designList, serviceList, offers, artistList, ratings, contest, me, season] = await Promise.all([
    designs(salon, 12),
    services(salon),
    features.has('campaigns') ? liveOffers(salon) : Promise.resolve([]),
    artists(salon),
    features.has('reviews') ? recentRatings(salon) : Promise.resolve([]),
    features.has('contests') ? contestNow(salon) : Promise.resolve(null),
    customer ? customerHome(salon, customer) : Promise.resolve(null),
    currentSeason(salon, tr).catch(() => null),
  ])

  const data: HomeData = {
    lang,
    layout: theme.layout,
    show: { loyalty: features.has('loyalty'), wallet: features.has('wallet'), tryOn: features.has('tryOn'), referrals: features.has('referrals') },
    inviteAmount: formatINR(settings.referralFriendReward ?? 20000),
    season: season ? { festival: season.festival, label: season.label, title: season.title, image: mediaUrl(season.image, 'large') } : null,
    labels: {
      hello: tr('hello'),
      welcome: tr('welcome'),
      book: tr('book'),
      designs: tr('designs'),
      menu: tr('menu'),
      offers: tr('offers'),
      newThisMonth: tr('newThisMonth'),
      nextVisit: tr('nextVisit'),
      refillIn: tr('refillIn'),
      repeatLast: tr('repeatLast'),
      inviteFriend: tr('inviteFriend'),
      ourArtists: tr('ourArtists'),
      lovedBy: tr('lovedBy'),
      visitUs: tr('visitUs'),
    },
    designs: designList,
    services: serviceList,
    offers: offers.filter((o) => o.showOnHome !== false),
    artists: artistList,
    ratings,
    contest: contest ? { id: contest.id, title: contest.title, prize: contest.prize, endsAt: contest.endsAt } : null,
    me: me
      ? {
          ...me,
          nextDueDate: customer?.nextDueDate,
          stampsForReward: Number(settings.stampsForReward ?? 6),
        }
      : null,
    contact: {
      address: salon.contact?.address,
      mapUrl: salon.contact?.mapUrl,
      parking: salon.contact?.parking,
      whatsapp: salon.contact?.whatsapp,
      phone: salon.contact?.phone,
    },
    hours: salon.hours ?? [],
    timezone: salon.timezone ?? 'Asia/Kolkata',
  }

  const featureFor: Partial<Record<SectionKey, Parameters<typeof features.has>[0]>> = {
    offers: 'campaigns',
    loyalty: 'loyalty',
    invite: 'referrals',
    contest: 'contests',
    reviews: 'reviews',
  }

  const order = homeSectionOrder(salon) as SectionKey[]
  const sectionProps = {
    salon: { ...sectionSalon(salon), openNow: openStatusIn(salon, tr) },
    base,
    customer: customer ? { firstName: firstName(customer.name) ?? '' } : null,
    data,
  }

  return (
    <div>
      {order.includes('hero') ? null : (
        <>
          <SeasonBanner {...sectionProps} />
          <QuickLinks {...sectionProps} />
        </>
      )}
      {order.map((key) => {
        const feature = featureFor[key]
        if (feature && !features.has(feature)) return null
        const Component = theme.components?.[key] ?? DEFAULT_SECTIONS_MAP[key]
        if (!Component) return null
        if (key === 'hero')
          // Season banner and shortcuts sit right under the hero, whatever the salon's section order.
          return (
            <div key={key}>
              <Component {...sectionProps} />
              <SeasonBanner {...sectionProps} />
              <QuickLinks {...sectionProps} />
            </div>
          )
        return <Component key={key} {...sectionProps} />
      })}
    </div>
  )
}
