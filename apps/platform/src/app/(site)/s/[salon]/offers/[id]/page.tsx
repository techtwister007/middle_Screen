import { formatIST } from '@salon/core'
import { buttonClass } from '@salon/ui'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ClaimOfferButton } from '@/components/site/BuyButton'
import { mediaUrl } from '@/lib/media'
import { currentCustomer, loadSalon, repoFor } from '@/lib/site'

export const metadata = { title: 'Offer' }

export default async function OfferPage({ params }: { params: Promise<{ salon: string; id: string }> }) {
  const { salon: slug, id } = await params
  const salon = await loadSalon(slug)
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
        {offer.endsAt ? <p className='mt-3 text-sm'>Valid until {formatIST(offer.endsAt, 'EEEE d MMMM', salon.timezone ?? 'Asia/Kolkata')}</p> : null}
        <div className='mt-6 space-y-3'>
          {live ? (
            <>
              <ClaimOfferButton
                loggedIn={Boolean(customer)}
                loginHref={`${base}/login?next=${encodeURIComponent(`${base}/offers/${offer.id}`)}`}
                offerId={offer.id}
                slug={slug}
              />
              <Link
                className={buttonClass('secondary', 'lg', 'w-full')}
                href={`${base}/book${offer.services?.length ? `?services=${offer.services.map((s) => s.id).join(',')}` : ''}`}
              >
                Book now
              </Link>
            </>
          ) : (
            <p className='rounded-card bg-tint p-4 text-center text-muted'>This offer has ended. New ones arrive every month!</p>
          )}
        </div>
      </div>
    </div>
  )
}
