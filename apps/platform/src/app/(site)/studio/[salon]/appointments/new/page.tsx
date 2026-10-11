import { forTenant, localDate } from '@salon/core'
import Link from 'next/link'
import { NewAppointment } from '@/components/studio/NewAppointment'
import { getPayloadClient } from '@/lib/payload'
import { canManage, requireStaff } from '@/lib/staff'
import { teamOf } from '../../_lib/team'

export const metadata = { title: 'Add appointment' }

export default async function NewAppointmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ salon: string }>
  searchParams: Promise<{ date?: string; time?: string; staff?: string; customer?: string }>
}) {
  const { salon: slug } = await params
  const sp = await searchParams
  const { salon, user } = await requireStaff(slug)
  const payload = await getPayloadClient()
  const repo = forTenant(payload, salon.id)
  const tz = salon.timezone ?? 'Asia/Kolkata'
  const [services, team, customer] = await Promise.all([
    repo
      .find<{ id: string; name: string; price: number; durationMinutes: number; isAddOn?: boolean }>('services', {
        where: { active: { equals: true } },
        sort: 'order',
        limit: 200,
      })
      .then((r) => r.docs),
    teamOf(payload, salon.id, { bookableOnly: true }),
    sp.customer ? repo.findByID<{ id: string; name?: string; phone: string; visitCount?: number }>('customers', sp.customer) : null,
  ])
  const chips = (canManage(user) ? team : team.filter((t) => String(t.id) === String(user.id))).map((t) => ({ id: t.id, name: t.name }))
  return (
    <div>
      <Link className='inline-flex min-h-11 items-center text-sm text-brand' href={`/studio/${slug}/calendar`}>
        ← Calendar
      </Link>
      <h1 className='font-heading text-3xl'>Add appointment</h1>
      <p className='mt-1 text-sm text-muted'>Book for a customer who called or walked in. They get a WhatsApp confirmation.</p>
      <NewAppointment
        customer={customer}
        initialDate={sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : localDate(new Date(), tz)}
        initialStaff={sp.staff ?? (user.role === 'artist' ? String(user.id) : null)}
        initialTime={sp.time && /^\d{2}:\d{2}$/.test(sp.time) ? sp.time : null}
        services={services}
        slug={slug}
        team={chips}
        timezone={tz}
      />
    </div>
  )
}
