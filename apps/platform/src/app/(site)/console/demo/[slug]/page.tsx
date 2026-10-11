import { Presenter } from '@/components/console/Presenter'
import { getSalonBySlug } from '@/lib/salon'
import { publicUrl } from '@salon/core'
import { buttonClass } from '@salon/ui'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import QRCode from 'qrcode'

export const metadata = { title: 'Presenter' }

export default async function PresenterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const salon = await getSalonBySlug(slug)
  if (!salon) notFound()
  const qr = await QRCode.toDataURL(`${publicUrl()}/s/${slug}`, { margin: 1, width: 360 })
  const phone = String((salon.settings as { demoPhone?: string } | null)?.demoPhone ?? '')
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand">Presenter controls</p>
          <h1 className="font-heading text-3xl">{salon.name}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className={buttonClass('secondary', 'sm')} href={`/s/${slug}`} target="_blank">
            Customer app
          </Link>
          <Link className={buttonClass('secondary', 'sm')} href={`/studio/${slug}/today`} target="_blank">
            Owner's Today
          </Link>
          <Link className={buttonClass('secondary', 'sm')} href={`/studio/${slug}/insights?days=90`} target="_blank">
            Jump to day 90
          </Link>
          <Link className={buttonClass('primary', 'sm')} href={`/console/demo/${slug}/roi`}>
            ROI calculator
          </Link>
        </div>
      </div>
      <Presenter phone={phone} qr={qr} slug={slug} />
    </div>
  )
}
