import { GiftReveal } from '@/components/site/GiftReveal'
import { currentCustomer, firstName, loadSalon, repoFor } from '@/lib/site'
import { formatINR } from '@salon/core'
import { notFound } from 'next/navigation'

export const metadata = { title: 'A gift for you' }

export default async function GiftPage({ params }: { params: Promise<{ salon: string; code: string }> }) {
  const { salon: slug, code } = await params
  const salon = await loadSalon(slug)
  const repo = await repoFor(salon)
  const card = await repo.findOne<{ code: string; value: number; message?: string; status: string; buyer?: { name?: string } | null }>('gift-cards', { code: { equals: code.toUpperCase() } }, 1)
  if (!card || card.status === 'pending') notFound()
  const customer = await currentCustomer(salon)
  return (
    <div className="px-6 pt-14 text-center">
      <GiftReveal
        amount={formatINR(card.value)}
        code={card.code}
        from={firstName(card.buyer?.name) ?? 'a friend'}
        loggedIn={Boolean(customer)}
        message={card.message}
        salonName={salon.name}
        slug={slug}
        status={card.status}
      />
    </div>
  )
}
