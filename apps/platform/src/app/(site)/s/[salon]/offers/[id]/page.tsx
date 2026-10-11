import { formatIST } from '@salon/core'
import { buttonClass } from '@salon/ui'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ClaimOfferButton } from '@/components/site/BuyButton'
import { translator } from '@/lib/i18n'
import { getLang, salonLang } from '@/lib/lang'
import { mediaUrl } from '@/lib/media'
import { currentCustomer, loadSalon, repoFor } from '@/lib/site'
import { requireFeature } from '../../_lib/gate'

export async function generateMetadata({ params }: { params: Promise<{ salon: string }> }) {
  const { salon: slug } = await params
  return { title: translator(await salonLang(await loadSalon(slug)))('offerTitle') }
}

export default async function OfferPage({ params }: { params: Promise<{ salon: string; id: string }> }) {
  const { salon: slug, id } = await params
  const salon = await loadSalon(slug)
  requireFeature(salon, 'campaigns')
  const offer = await (await repoFor(salon)).findByID<{
    id: string
    title: string
    description?: string
    image?: unknown
    endsAt?: string
    status: string
    services?: { id: string }[]
  }>('offers', id, 1)
  if (!offer) notFound()
  const customer = await currentCustomer(salon)
  const lang = await getLang(customer?.language)
  const tr = translator(lang)
  const live = offer.status === 'live' && (!offer.endsAt || new Date(offer.endsAt) > new Date())
  const base = `/s/${slug}`
  return (
    <div>
      {mediaUrl(offer.image, 'large') ? (
        <img alt='' className='aspect-[4/3] w-full object-cover' src={mediaUrl(offer.image, 'large') ?? ''} />
      ) : (
        <div className='aspect-[4/3] w-full bg-gradient-to-br from-brand to-accent' />
      )}
      <div className='px-4 pt-5'>
        <h1 className='font-heading text-3xl'>{offer.title}</h1>
        {offer.description ? <p className='mt-2 text-[15px] leading-relaxed text-muted'>{offer.description}</p> : null}
        {offer.endsAt ? (
          <p className='mt-3 text-sm'>{tr('validUntil', { date: formatIST(offer.endsAt, 'EEEE d MMMM', salon.timezone ?? 'Asia/Kolkata') })}</p>
        ) : null}
        <div className='mt-6 space-y-3'>
          {live ? (
            <>
              <ClaimOfferButton
                lang={lang}
                loggedIn={Boolean(customer)}
                loginHref={`${base}/login?next=${encodeURIComponent(`${base}/offers/${offer.id}`)}`}
                offerId={offer.id}
                slug={slug}
              />
              <Link
                className={buttonClass('secondary', 'lg', 'w-full')}
                href={`${base}/book${offer.services?.length ? `?services=${offer.services.map((s) => s.id).join(',')}` : ''}`}
              >
                {tr('bookNow')}
              </Link>
            </>
          ) : (
            <p className='rounded-card bg-tint p-4 text-center text-muted'>{tr('offerEnded')}</p>
          )}
        </div>
      </div>
    </div>
  )
}
