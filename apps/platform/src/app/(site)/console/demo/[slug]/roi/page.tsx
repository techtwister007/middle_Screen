import { RoiCalculator } from '@/components/console/RoiCalculator'
import { getSalonBySlug } from '@/lib/salon'
import { notFound } from 'next/navigation'

export const metadata = { title: 'ROI calculator' }

export default async function RoiPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const salon = await getSalonBySlug(slug)
  if (!salon) notFound()
  return (
    <div>
      <h1 className="mb-6 font-heading text-3xl">What {salon.name} could earn</h1>
      <RoiCalculator salonName={salon.name} />
    </div>
  )
}
