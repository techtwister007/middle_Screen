import type { SectionKey } from '@salon/themes'
import { DEFAULT_SECTIONS_MAP, type HomeData } from '@/components/site/sections'
import { t } from '@/lib/i18n'
import { getLang } from '@/lib/lang'
import { homeSectionOrder, salonFeatures, salonTheme, sectionSalon } from '@/lib/salon'
import { artists, contestNow, currentCustomer, customerHome, designs, firstName, liveOffers, loadSalon, recentRatings, services } from '@/lib/site'

export default async function SalonHome({ params }: { params: Promise<{ salon: string }> }) {
  const { salon: slug } = await params
  const salon = await loadSalon(slug)
  const customer = await currentCustomer(salon)
  const lang = await getLang(customer?.language)
  const features = salonFeatures(salon)
  const { theme } = salonTheme(salon)
  const base = `/s/${salon.slug}`

  const [designList, serviceList, offers, artistList, ratings, contest, me] = await Promise.all([
    designs(salon, 12),
    services(salon),
    features.has('campaigns') ? liveOffers(salon) : Promise.resolve([]),
    artists(salon),
    features.has('reviews') ? recentRatings(salon) : Promise.resolve([]),
    features.has('contests') ? contestNow(salon) : Promise.resolve(null),
    customer ? customerHome(salon, customer) : Promise.resolve(null),
  ])

  const data: HomeData = {
    layout: theme.layout,
    labels: {
      hello: t(lang, 'hello'),
      welcome: t(lang, 'welcome'),
      book: t(lang, 'book'),
      designs: t(lang, 'designs'),
      menu: t(lang, 'menu'),
      offers: t(lang, 'offers'),
      newThisMonth: t(lang, 'newThisMonth'),
      nextVisit: t(lang, 'nextVisit'),
      refillIn: t(lang, 'refillIn'),
      repeatLast: t(lang, 'repeatLast'),
      inviteFriend: t(lang, 'inviteFriend'),
      ourArtists: t(lang, 'ourArtists'),
      lovedBy: t(lang, 'lovedBy'),
      visitUs: t(lang, 'visitUs'),
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
          stampsForReward: Number((salon.settings as { stampsForReward?: number } | null)?.stampsForReward ?? 6),
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
  const sectionProps = { salon: sectionSalon(salon), base, customer: customer ? { firstName: firstName(customer.name) ?? '' } : null, data }

  return (
    <div>
      {order.map((key) => {
        const feature = featureFor[key]
        if (feature && !features.has(feature)) return null
        const Component = theme.components?.[key] ?? DEFAULT_SECTIONS_MAP[key]
        return Component ? <Component key={key} {...sectionProps} /> : null
      })}
    </div>
  )
}
