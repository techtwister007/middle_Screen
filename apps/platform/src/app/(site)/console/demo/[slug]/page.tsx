import { publicUrl } from '@salon/core'
import { buttonClass } from '@salon/ui'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import QRCode from 'qrcode'
import { Presenter } from '@/components/console/Presenter'
import { getSalonBySlug } from '@/lib/salon'

// Building a demo salon or copying photos can take a minute.
export const maxDuration = 300

export const metadata = { title: 'Presenter' }

export default async function PresenterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const salon = await getSalonBySlug(slug)
  if (!salon) notFound()
  const qr = await QRCode.toDataURL(`${publicUrl()}/s/${slug}`, { margin: 1, width: 360 })
  const chairQr = await QRCode.toDataURL(`${publicUrl()}/s/${slug}/chair`, { margin: 1, width: 360 })
  const expires = (salon.settings as { demoExpiresAt?: string; keepDemo?: boolean } | null) ?? {}
  const phone = String((salon.settings as { demoPhone?: string } | null)?.demoPhone ?? '')
  return (
    <div>
      <div className='mb-6 flex flex-wrap items-center justify-between gap-3'>
        <div>
          <p className='text-xs font-semibold uppercase tracking-widest text-brand'>Presenter controls</p>
          <h1 className='font-heading text-3xl'>{salon.name}</h1>
          {expires.demoExpiresAt && !expires.keepDemo ? (
            <p className='text-xs text-muted'>
              Demo pauses itself on {new Date(expires.demoExpiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })}
            </p>
          ) : null}
        </div>
        <div className='flex flex-wrap gap-2'>
          <Link className={buttonClass('secondary', 'sm')} href={`/s/${slug}`} target='_blank'>
            Customer app
          </Link>
          <Link className={buttonClass('secondary', 'sm')} href={`/console/salons/${slug}/open`} target='_blank'>
            Owner's Today
          </Link>
          <Link className={buttonClass('secondary', 'sm')} href={`/studio/${slug}/insights?days=90`} target='_blank'>
            Jump to day 90
          </Link>
          <Link className={buttonClass('primary', 'sm')} href={`/console/demo/${slug}/roi`}>
            ROI calculator
          </Link>
        </div>
      </div>
      <Presenter chairQr={chairQr} phone={phone} qr={qr} slug={slug} />
    </div>
  )
}
