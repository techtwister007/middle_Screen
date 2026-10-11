import { forTenant, idOf, isEnabled } from '@salon/core'
import { Checkout } from '@/components/studio/Checkout'
import { getPayloadClient } from '@/lib/payload'
import { requireStaff } from '@/lib/staff'
import { teamOf } from '../_lib/team'

export const metadata = { title: 'Checkout' }

interface CustomerLite {
  id: string
  name?: string
  phone: string
  visitCount?: number
  notes?: string
  allergies?: string
}

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ salon: string }>
  searchParams: Promise<{ appointment?: string; customer?: string }>
}) {
  const { salon: slug } = await params
  const sp = await searchParams
  const { salon, user } = await requireStaff(slug)
  const payload = await getPayloadClient()
  const repo = forTenant(payload, salon.id)
  const [services, team] = await Promise.all([
    repo
      .find<{ id: string; name: string; price: number; durationMinutes: number; isAddOn?: boolean; cycleDays?: number }>('services', {
        where: { active: { equals: true } },
        sort: 'order',
        limit: 200,
      })
      .then((r) => r.docs),
    teamOf(payload, salon.id, { bookableOnly: true }),
  ])
  let initial: {
    appointmentId?: string | null
    customer?: CustomerLite | null
    serviceIds: string[]
    designName?: string | null
    staffId?: string | null
  } = { serviceIds: [] }
  if (sp.appointment) {
    const appt = await repo.findByID<{
      id: string
      customer: CustomerLite
      services: (string | { id: string })[]
      design?: { title: string } | null
      staff?: string | { id: string } | null
    }>('appointments', sp.appointment, 1)
    if (appt)
      initial = {
        appointmentId: appt.id,
        customer: appt.customer,
        serviceIds: appt.services.map((s) => String(idOf(s))),
        designName: appt.design?.title,
        staffId: idOf(appt.staff) as string | null,
      }
  } else if (sp.customer) {
    const c = await repo.findByID<CustomerLite>('customers', sp.customer)
    if (c) initial = { customer: c, serviceIds: [] }
  }
  const settings = (salon.settings ?? {}) as { firstVisitDiscount?: number }
  const firstVisitGift = isEnabled(salon, 'loyalty') ? (settings.firstVisitDiscount ?? 20000) : 0
  return (
    <div>
      <h1 className='mb-5 font-heading text-3xl'>Checkout</h1>
      <Checkout
        firstVisitGift={firstVisitGift}
        initial={initial}
        meId={user.id}
        services={services}
        slug={slug}
        team={team.map((t) => ({ id: t.id, name: t.name }))}
        timezone={salon.timezone ?? 'Asia/Kolkata'}
      />
    </div>
  )
}
