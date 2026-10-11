import { type Slide, Display } from '@/components/studio/Display'
import { getPayloadClient } from '@/lib/payload'
import { mediaUrl } from '@/lib/media'
import { requireStaff } from '@/lib/staff'
import { forTenant, formatINR, publicUrl } from '@salon/core'
import { currentContest } from '@salon/modules'
import QRCode from 'qrcode'

export const metadata = { title: 'Salon display' }

export default async function DisplayPage({ params }: { params: Promise<{ salon: string }> }) {
  const { salon: slug } = await params
  const { salon } = await requireStaff(slug)
  const payload = await getPayloadClient()
  const repo = forTenant(payload, salon.id)
  const designs = (await repo.find<{ id: string; title: string; images: unknown[]; priceFrom?: number }>('designs', { where: { published: { equals: true } }, sort: '-featured', limit: 8, depth: 1 })).docs
  const offers = (await repo.find<{ id: string; title: string; description?: string; image?: unknown }>('offers', { where: { status: { equals: 'live' } }, limit: 3, depth: 1 })).docs
  const contest = await currentContest(payload, salon.id)
  const qr = (path: string) => QRCode.toDataURL(`${publicUrl()}/s/${slug}${path}`, { margin: 1, width: 320 })
  const slides: Slide[] = []
  for (const d of designs)
    slides.push({ kind: 'design', title: d.title, subtitle: d.priceFrom ? `from ${formatINR(d.priceFrom)}` : undefined, image: mediaUrl(d.images?.[0], 'large'), qr: await qr(`/designs/${d.id}`), cta: 'Scan to see the price and book' })
  for (const o of offers) slides.splice(Math.min(2, slides.length), 0, { kind: 'offer', title: o.title, subtitle: o.description ?? undefined, image: mediaUrl(o.image, 'large') ?? mediaUrl(designs[0]?.images?.[0], 'large'), qr: await qr(`/offers/${o.id}`), cta: 'Scan to claim' })
  if (contest) slides.push({ kind: 'contest', title: contest.title, subtitle: `Vote for your favourite. Prize: ${contest.prize ?? 'a free set'}`, image: mediaUrl(designs[1]?.images?.[0], 'large'), qr: await qr('/contest'), cta: 'Scan to vote' })
  return <Display salonName={salon.name} slides={slides} />
}
