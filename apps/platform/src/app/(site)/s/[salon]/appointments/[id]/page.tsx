import { formatINR, formatIST } from '@salon/core'
import { Badge, buttonClass } from '@salon/ui'
import { Calendar, Clock, MapPin, ParkingCircle } from 'lucide-react'
import { notFound } from 'next/navigation'
import { AppointmentActions } from '@/components/site/AppointmentActions'
import { mediaUrl } from '@/lib/media'
import { idOf, loadSalon, repoFor, requireCustomer } from '@/lib/site'

export const metadata = { title: 'Your appointment' }

const STATUS: Record<string, { label: string; tone: 'brand' | 'success' | 'warning' | 'danger' | 'muted' }> = {
  requested: { label: 'Waiting for confirmation', tone: 'warning' },
  confirmed: { label: 'Confirmed', tone: 'success' },
  completed: { label: 'Completed', tone: 'muted' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
  'no-show': { label: 'Missed', tone: 'danger' },
}

export default async function AppointmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ salon: string; id: string }>
  searchParams: Promise<{ paid?: string }>
}) {
  const { salon: slug, id } = await params
  const { paid } = await searchParams
  const salon = await loadSalon(slug)
  const customer = await requireCustomer(salon, `/s/${slug}/appointments/${id}`)
  const repo = await repoFor(salon)
  const appt = await repo.findByID<{
    id: string
    customer: string | { id: string }
    start: string
    end: string
    status: string
    quotedTotal?: number
    depositRequired?: number
    depositPaid?: boolean
    staff?: { name: string; avatar?: unknown } | null
    services: { id: string; name: string }[]
    design?: { title: string; images?: unknown[] } | null
    inspiration?: unknown[]
  }>('appointments', id, 1)
  if (!appt || String(idOf(appt.customer)) !== String(customer.id)) notFound()
  const tz = salon.timezone ?? 'Asia/Kolkata'
  const s = STATUS[appt.status] ?? STATUS.requested
  const upcoming = new Date(appt.start).getTime() > Date.now() && ['requested', 'confirmed'].includes(appt.status)
  const policy = (salon.settings as { cancellationPolicy?: string } | null)?.cancellationPolicy
  return (
    <div className='px-4 pt-5'>
      {paid ? <p className='mb-4 rounded-btn bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800'>Deposit received. Your booking is confirmed.</p> : null}
      <Badge tone={s.tone}>{s.label}</Badge>
      <h1 className='mt-2 font-heading text-3xl'>{formatIST(appt.start, 'EEEE d MMMM', tz)}</h1>
      <p className='flex items-center gap-2 text-muted'>
        <Clock size={15} /> {formatIST(appt.start, 'h:mm a', tz)} – {formatIST(appt.end, 'h:mm a', tz)}
        {appt.staff ? ` · with ${appt.staff.name}` : ''}
      </p>
      {appt.design ? (
        <div className='mt-5 flex items-center gap-3 rounded-card border border-line bg-surface p-3'>
          <img alt='' className='h-16 w-16 rounded-xl object-cover' src={mediaUrl(appt.design.images?.[0], 'thumb') ?? ''} />
          <div>
            <p className='text-xs text-muted'>Your design</p>
            <p className='font-medium'>{appt.design.title}</p>
          </div>
        </div>
      ) : null}
      <div className='mt-4 rounded-card border border-line bg-surface p-4 text-sm'>
        {appt.services.map((sv) => (
          <p key={sv.id}>{sv.name}</p>
        ))}
        {appt.quotedTotal ? <p className='mt-2 font-medium'>Estimated {formatINR(appt.quotedTotal)}</p> : null}
        {appt.depositRequired ? (
          <p className='text-muted'>
            Deposit {formatINR(appt.depositRequired)} · {appt.depositPaid ? 'paid' : 'pending'}
          </p>
        ) : null}
      </div>
      {upcoming ? (
        <div className='mt-5 space-y-3'>
          <div className='rounded-card bg-tint p-4 text-sm'>
            <p className='font-medium'>Before you come</p>
            <ul className='mt-2 list-disc space-y-1 pl-5 text-muted'>
              <li>Arrive 5 minutes early so we can start on time.</li>
              <li>Wearing gel from elsewhere? Tell us. Removal takes 20 extra minutes.</li>
              <li>Bring a photo of your outfit if you want a matching design.</li>
            </ul>
          </div>
          <div className='flex flex-wrap gap-2'>
            <a className={buttonClass('secondary', 'sm')} href={`/s/${slug}/appointments/${appt.id}/ics`}>
              <Calendar size={14} /> Add to calendar
            </a>
            {salon.contact?.mapUrl ? (
              <a className={buttonClass('secondary', 'sm')} href={salon.contact.mapUrl} rel='noopener' target='_blank'>
                <MapPin size={14} /> Directions
              </a>
            ) : null}
          </div>
          {salon.contact?.parking ? (
            <p className='flex items-center gap-2 text-sm text-muted'>
              <ParkingCircle size={15} /> {salon.contact.parking}
            </p>
          ) : null}
          <AppointmentActions id={appt.id} policy={policy} rebookHref={`/s/${slug}/book?services=${appt.services.map((x) => x.id).join(',')}`} slug={slug} />
        </div>
      ) : null}
    </div>
  )
}
