import { forTenant, publicUrl } from '@salon/core'
import { buttonClass } from '@salon/ui'
import { ExternalLink, MonitorPlay, Tablet } from 'lucide-react'
import Link from 'next/link'
import QRCode from 'qrcode'
import { SignOut } from '@/components/studio/SignOut'
import { TrackingLinkForm } from '@/components/studio/TrackingLinkForm'
import { getPayloadClient } from '@/lib/payload'
import { canManage, requireStaff } from '@/lib/staff'

export const metadata = { title: 'More' }

export default async function SettingsPage({ params }: { params: Promise<{ salon: string }> }) {
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
  const team = (await payload.find({ collection: 'users', overrideAccess: true, depth: 0, limit: 50, where: { 'tenants.tenant': { equals: salon.id } } }))
    .docs as unknown as { id: string; name: string; role: string; email: string }[]
  const base = `/studio/${slug}`
  return (
    <div>
      <h1 className='font-heading text-3xl'>More</h1>
      <div className='mt-5 grid gap-3 sm:grid-cols-3'>
        <Link className='flex items-center gap-3 rounded-card border border-line bg-surface p-4' href={`${base}/kiosk`}>
          <Tablet className='text-brand' /> Reception kiosk
        </Link>
        <Link className='flex items-center gap-3 rounded-card border border-line bg-surface p-4' href={`${base}/display`}>
          <MonitorPlay className='text-brand' /> Salon TV display
        </Link>
        {canManage(user) ? (
          <Link className='flex items-center gap-3 rounded-card border border-line bg-surface p-4' href='/admin' target='_blank'>
            <ExternalLink className='text-brand' /> Full admin (menu, gallery, rules)
          </Link>
        ) : null}
      </div>

      <section className='mt-10'>
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

      <section className='mt-10'>
        <h2 className='mb-3 font-heading text-xl'>Team</h2>
        <div className='divide-y divide-line rounded-card border border-line bg-surface'>
          {team.map((t) => (
            <div className='flex justify-between px-4 py-3 text-sm' key={t.id}>
              <span>{t.name}</span>
              <span className='text-muted'>{t.role}</span>
            </div>
          ))}
        </div>
      </section>

      <section className='mt-10 rounded-card bg-tint p-4 text-sm'>
        <p className='font-medium'>Need help?</p>
        <p className='text-muted'>WhatsApp our support team any time. We set things up for you.</p>
        <a
          className={buttonClass('secondary', 'sm', 'mt-3')}
          href={`https://wa.me/${(process.env.SUPPORT_WHATSAPP ?? '').replace(/\D/g, '')}`}
          rel='noopener'
          target='_blank'
        >
          WhatsApp support
        </a>
      </section>

      <div className='mt-8'>
        <SignOut />
      </div>
    </div>
  )
}
