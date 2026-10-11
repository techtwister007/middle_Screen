import { OfferBuilder } from '@/components/studio/OfferBuilder'
import { getPayloadClient } from '@/lib/payload'
import { requireStaff } from '@/lib/staff'
import { messagePrice } from '@salon/integrations'

export const metadata = { title: 'New offer' }

export default async function NewOfferPage({ params, searchParams }: { params: Promise<{ salon: string }>; searchParams: Promise<{ kind?: string; pack?: string; date?: string }> }) {
  const { salon: slug } = await params
  const sp = await searchParams
  const { salon } = await requireStaff(slug, { manager: true })
  let initial: Parameters<typeof OfferBuilder>[0]['initial'] = { kind: sp.kind === 'slot-filler' ? 'slot-filler' : 'offer' }
  if (sp.kind === 'slot-filler') initial = { ...initial, title: `${sp.date ? 'Tomorrow' : 'This week'} 2–5 pm: 20% off gel polish`, slot: { date: sp.date, from: '14:00', to: '17:00' }, endsAt: sp.date }
  if (sp.pack) {
    const pack = (await (await getPayloadClient()).findByID({ collection: 'campaign-packs', id: sp.pack, overrideAccess: true })) as unknown as {
      id: string
      offerTitle: string
      offerDescription?: string
      valueType: 'amount' | 'percent' | 'freebie'
      value: number
      endsOn: string
    }
    initial = {
      kind: 'festival',
      title: pack.offerTitle,
      description: pack.offerDescription,
      valueType: pack.valueType,
      value: pack.valueType === 'amount' ? pack.value / 100 : pack.value,
      endsAt: pack.endsOn.slice(0, 10),
      audience: ['new', 'regular', 'due', 'at-risk', 'lapsed'],
      packId: pack.id,
    }
  }
  return (
    <div>
      <h1 className="mb-6 font-heading text-3xl">{initial.kind === 'slot-filler' ? 'Fill quiet slots' : initial.kind === 'festival' ? 'Festival campaign' : 'New offer'}</h1>
      <OfferBuilder initial={initial} marketingPricePaise={messagePrice('marketing')} salonName={salon.name} slug={slug} />
    </div>
  )
}
