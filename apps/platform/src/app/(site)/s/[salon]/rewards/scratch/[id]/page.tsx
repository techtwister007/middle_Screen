import { formatIST } from '@salon/core'
import { buttonClass } from '@salon/ui'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ScratchCard } from '@/components/site/ScratchCard'
import { translator } from '@/lib/i18n'
import { getLang, salonLang } from '@/lib/lang'
import { idOf, loadSalon, repoFor, requireCustomer } from '@/lib/site'
import { requireFeature } from '../../../_lib/gate'

export async function generateMetadata({ params }: { params: Promise<{ salon: string }> }) {
  const { salon: slug } = await params
  return { title: translator(await salonLang(await loadSalon(slug)))('thankYouLittle') }
}

export default async function ScratchPage({ params }: { params: Promise<{ salon: string; id: string }> }) {
  const { salon: slug, id } = await params
  const salon = await loadSalon(slug)
  requireFeature(salon, 'loyalty')
  const customer = await requireCustomer(salon, `/s/${slug}/rewards/scratch/${id}`)
  const tr = translator(await getLang(customer.language))
  const reward = await (await repoFor(salon)).findByID<{ id: string; customer: unknown; title: string; revealed?: boolean; validTo?: string }>('rewards', id)
  if (!reward || String(idOf(reward.customer)) !== String(customer.id)) notFound()
  return (
    <div className='px-4 pt-8 text-center'>
      <h1 className='font-heading text-3xl'>{tr('thankYouLittle')}</h1>
      <p className='mb-6 mt-1 text-muted'>{tr('scratchIntro')}</p>
      <ScratchCard
        labels={{ reward: tr('nextVisitReward'), scratchHere: tr('scratchHere') }}
        revealed={Boolean(reward.revealed)}
        rewardId={reward.id}
        slug={slug}
        title={reward.title}
      />
      {reward.validTo ? (
        <p className='mt-4 text-sm text-muted'>{tr('useBefore', { date: formatIST(reward.validTo, 'd MMMM', salon.timezone ?? 'Asia/Kolkata') })}</p>
      ) : null}
      <Link className={buttonClass('primary', 'lg', 'mt-8 w-full')} href={`/s/${slug}/book?chair=1`}>
        {tr('bookNextNow')}
      </Link>
      <Link className='mt-3 block text-sm text-brand' href={`/s/${slug}/rewards`}>
        {tr('allRewards')}
      </Link>
    </div>
  )
}
