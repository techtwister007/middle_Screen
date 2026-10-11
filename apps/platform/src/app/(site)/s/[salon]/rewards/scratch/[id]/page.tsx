import { ScratchCard } from '@/components/site/ScratchCard'
import { idOf, loadSalon, repoFor, requireCustomer } from '@/lib/site'
import { formatIST } from '@salon/core'
import { buttonClass } from '@salon/ui'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const metadata = { title: 'Scratch card' }

export default async function ScratchPage({ params }: { params: Promise<{ salon: string; id: string }> }) {
  const { salon: slug, id } = await params
  const salon = await loadSalon(slug)
  const customer = await requireCustomer(salon, `/s/${slug}/rewards/scratch/${id}`)
  const reward = await (await repoFor(salon)).findByID<{ id: string; customer: unknown; title: string; revealed?: boolean; validTo?: string }>('rewards', id)
  if (!reward || String(idOf(reward.customer)) !== String(customer.id)) notFound()
  return (
    <div className="px-4 pt-8 text-center">
      <h1 className="font-heading text-3xl">A little thank-you</h1>
      <p className="mb-6 mt-1 text-muted">Scratch to reveal what's waiting on your next visit.</p>
      <ScratchCard revealed={Boolean(reward.revealed)} rewardId={reward.id} slug={slug} title={reward.title} />
      {reward.validTo ? <p className="mt-4 text-sm text-muted">Use it before {formatIST(reward.validTo, 'd MMMM', salon.timezone ?? 'Asia/Kolkata')}</p> : null}
      <Link className={buttonClass('primary', 'lg', 'mt-8 w-full')} href={`/s/${slug}/book?chair=1`}>
        Book my next visit now
      </Link>
      <Link className="mt-3 block text-sm text-brand" href={`/s/${slug}/rewards`}>
        All rewards
      </Link>
    </div>
  )
}
