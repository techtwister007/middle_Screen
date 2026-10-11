import { forTenant, publicUrl } from '@salon/core'
import Link from 'next/link'
import QRCode from 'qrcode'
import { TrackingLinkForm } from '@/components/studio/TrackingLinkForm'
import { getPayloadClient } from '@/lib/payload'
import { canManage, requireStaff } from '@/lib/staff'

export const metadata = { title: 'QR kit' }

export default async function QrPage({ params }: { params: Promise<{ salon: string }> }) {
  const { salon: slug } = await params
  const { salon, user } = await requireStaff(slug)
  const payload = await getPayloadClient()
  const repo = forTenant(payload, salon.id)
  const links = (
    await repo.find<{ id: string; label: string; code: string; source: string; target: string; clicks: number }>('tracking-links', {
      sort: '-clicks',
      limit: 50,
    })
  ).docs
  const qrs = await Promise.all(links.map((l) => QRCode.toDataURL(`${publicUrl()}/s/${slug}/l/${l.code}`, { margin: 1, width: 300 })))
  return (
    <div>
      <Link className='text-sm text-brand' href={`/studio/${slug}/settings`}>
        ← More
      </Link>
      <div className='mt-3 flex items-center justify-between'>
        <h1 className='font-heading text-3xl'>QR kit</h1>
        <Link className='text-sm text-brand' href={`/studio/${slug}/settings/qr/print`} target='_blank'>
          Printable posters ↗
        </Link>
      </div>
      <section className='mt-6'>
        <h2 className='font-heading text-xl'>QR kit & tracked links</h2>
        <p className='mb-4 text-sm text-muted'>
          Print these for the mirror, counter, window and aftercare cards. Every scan is counted so you know what works.
        </p>
        <div className='grid gap-3 sm:grid-cols-2'>
          {links.map((l, i) => (
            <div className='flex gap-4 rounded-card border border-line bg-surface p-4' key={l.id}>
              <img alt={`QR for ${l.label}`} className='h-28 w-28 rounded-lg' src={qrs[i]} />
              <div className='min-w-0'>
                <p className='font-medium'>{l.label}</p>
                <p className='text-xs text-muted'>
                  {l.source} → {l.target}
                </p>
                <p className='mt-2 font-heading text-2xl'>{l.clicks}</p>
                <p className='text-xs text-muted'>scans / clicks</p>
                <a className='mt-1 block truncate text-xs text-brand' download={`${slug}-${l.code}.png`} href={qrs[i]}>
                  Download QR
                </a>
              </div>
            </div>
          ))}
        </div>
        {canManage(user) ? (
          <div className='mt-4'>
            <TrackingLinkForm slug={slug} />
          </div>
        ) : null}
      </section>
    </div>
  )
}
