import { formatINR } from '@salon/core'
import { notFound } from 'next/navigation'
import { GiftReveal } from '@/components/site/GiftReveal'
import { translator } from '@/lib/i18n'
import { getLang, salonLang, salonLanguages } from '@/lib/lang'
import { currentCustomer, firstName, loadSalon, repoFor } from '@/lib/site'
import { requireFeature } from '../../_lib/gate'

export async function generateMetadata({ params }: { params: Promise<{ salon: string }> }) {
  const { salon: slug } = await params
  return { title: translator(await salonLang(await loadSalon(slug)))('giftForYou') }
}

export default async function GiftPage({ params }: { params: Promise<{ salon: string; code: string }> }) {
  const { salon: slug, code } = await params
  const salon = await loadSalon(slug)
  requireFeature(salon, 'giftCards')
  const repo = await repoFor(salon)
  const card = await repo.findOne<{ code: string; value: number; message?: string; status: string; buyer?: { name?: string } | null }>(
    'gift-cards',
    { code: { equals: code.toUpperCase() } },
    1,
  )
  if (!card || card.status === 'pending') notFound()
  const customer = await currentCustomer(salon)
  const lang = await getLang(customer?.language, salonLanguages(salon))
  return (
    <div className='px-6 pt-14 text-center'>
      <GiftReveal
        amount={formatINR(card.value)}
        code={card.code}
        from={firstName(card.buyer?.name) ?? translator(lang)('aFriend')}
        lang={lang}
        loggedIn={Boolean(customer)}
        message={card.message}
        salonName={salon.name}
        slug={slug}
        status={card.status}
      />
    </div>
  )
}
