import { Checkout } from '@/components/studio/Checkout'
import { getPayloadClient } from '@/lib/payload'
import { requireStaff } from '@/lib/staff'
import { forTenant, idOf } from '@salon/core'

export const metadata = { title: 'Checkout' }

export default async function CheckoutPage({ params, searchParams }: { params: Promise<{ salon: string }>; searchParams: Promise<{ appointment?: string; customer?: string }> }) {
  const { salon: slug } = await params
  const sp = await searchParams
  const { salon } = await requireStaff(slug)
  const repo = forTenant(await getPayloadClient(), salon.id)
  const services = (await repo.find<{ id: string; name: string; price: number; durationMinutes: number; isAddOn?: boolean; cycleDays?: number }>('services', { where: { active: { equals: true } }, sort: 'order', limit: 200 })).docs
  let initial: { appointmentId?: string | null; customer?: { id: string; name?: string; phone: string; visitCount?: number; notes?: string } | null; serviceIds: string[]; designName?: string | null; staffId?: string | null } = { serviceIds: [] }
  if (sp.appointment) {
    const appt = await repo.findByID<{ id: string; customer: { id: string; name?: string; phone: string; visitCount?: number; notes?: string }; services: (string | { id: string })[]; design?: { title: string } | null; staff?: string | { id: string } | null }>('appointments', sp.appointment, 1)
    if (appt) initial = { appointmentId: appt.id, customer: appt.customer, serviceIds: appt.services.map((s) => String(idOf(s))), designName: appt.design?.title, staffId: idOf(appt.staff) as string | null }
  } else if (sp.customer) {
    const c = await repo.findByID<{ id: string; name?: string; phone: string; visitCount?: number; notes?: string }>('customers', sp.customer)
    if (c) initial = { customer: c, serviceIds: [] }
  }
  return (
    <div>
      <h1 className="mb-5 font-heading text-3xl">Checkout</h1>
      <Checkout initial={initial} services={services} slug={slug} timezone={salon.timezone ?? 'Asia/Kolkata'} />
    </div>
  )
}
