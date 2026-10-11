import { forTenant, publicUrl } from '@salon/core'
import QRCode from 'qrcode'
import { Kiosk } from '@/components/studio/Kiosk'
import { getPayloadClient } from '@/lib/payload'
import { requireStaff } from '@/lib/staff'

export const metadata = { title: 'Reception kiosk' }

export default async function KioskPage({ params }: { params: Promise<{ salon: string }> }) {
  const { salon: slug } = await params
  const { salon } = await requireStaff(slug)
  const services = (
    await forTenant(await getPayloadClient(), salon.id).find<{ id: string; name: string; isAddOn?: boolean }>('services', {
      where: { and: [{ active: { equals: true } }, { isAddOn: { not_equals: true } }] },
      sort: 'order',
      limit: 8,
    })
  ).docs
  const qr = await QRCode.toDataURL(`${publicUrl()}/s/${slug}/designs`, { margin: 1, width: 400 })
  return <Kiosk qr={qr} salonName={salon.name} services={services} slug={slug} timezone={salon.timezone ?? 'Asia/Kolkata'} />
}
