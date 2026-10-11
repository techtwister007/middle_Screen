import { formatINR, formatIST } from '@salon/core'
import { customerCanChange } from '@salon/modules'
import { Badge, buttonClass } from '@salon/ui'
import { Calendar, Clock, MapPin, ParkingCircle } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppointmentActions } from '@/components/site/AppointmentActions'
import { GroupShare } from '@/components/site/BookingFlow'
import { type DictKey, translator } from '@/lib/i18n'
import { getLang } from '@/lib/lang'
import { mediaUrl } from '@/lib/media'
import { salonFeatures } from '@/lib/salon'
import { currentCustomer, idOf, loadSalon, repoFor, requireCustomer } from '@/lib/site'
import { STATUS_TONE } from '../../_lib/status'

export async function generateMetadata({ params }: { params: Promise<{ salon: string }> }) {
  const { salon: slug } = await params
  const salon = await loadSalon(slug)
  return { title: translator(await getLang((await currentCustomer(salon))?.language))('yourAppointment') }
}

export default async function AppointmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ salon: string; id: string }>
  searchParams: Promise<{ paid?: string; moved?: string }>
}) {
  const { salon: slug, id } = await params
  const { paid, moved } = await searchParams
  const salon = await loadSalon(slug)
  const customer = await requireCustomer(salon, `/s/${slug}/appointments/${id}`)
  const tr = translator(await getLang(customer.language))
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
    group?: { code: string; status: string; organiser: string | { id: string } } | null
  }>('appointments', id, 1)
  if (!appt || String(idOf(appt.customer)) !== String(customer.id)) notFound()
  const tz = salon.timezone ?? 'Asia/Kolkata'
  const upcoming = customerCanChange(appt)
  const policy = (salon.settings as { cancellationPolicy?: string } | null)?.cancellationPolicy
  const base = `/s/${slug}`
  const showGroup = upcoming && salonFeatures(salon).has('groupBooking') && appt.group && typeof appt.group === 'object' && appt.group.status === 'open'
  return (
    <div className='px-4 pt-5'>
      {paid ? <p className='mb-4 rounded-btn bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800'>{tr('depositReceived')}</p> : null}
      {moved ? (
        <p className='mb-4 rounded-btn bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800' data-testid='moved'>
          {tr('apptMoved')}
        </p>
      ) : null}
      <Badge tone={STATUS_TONE[appt.status] ?? 'warning'}>{tr.or(`ap_${appt.status}`, appt.status)}</Badge>
      <h1 className='mt-2 font-heading text-3xl' data-testid='appt-date'>
        {formatIST(appt.start, 'EEEE d MMMM', tz)}
      </h1>
      <p className='flex items-center gap-2 text-muted' data-testid='appt-time'>
        <Clock size={15} /> {formatIST(appt.start, 'h:mm a', tz)} – {formatIST(appt.end, 'h:mm a', tz)}
        {appt.staff ? ` · ${tr('withName', { name: appt.staff.name })}` : ''}
      </p>
      {appt.design ? (
        <div className='mt-5 flex items-center gap-3 rounded-card border border-line bg-surface p-3'>
          <img alt='' className='h-16 w-16 rounded-xl object-cover' src={mediaUrl(appt.design.images?.[0], 'thumb') ?? ''} />
          <div>
            <p className='text-xs text-muted'>{tr('yourDesign')}</p>
            <p className='font-medium'>{appt.design.title}</p>
          </div>
        </div>
      ) : null}
      <div className='mt-4 rounded-card border border-line bg-surface p-4 text-sm'>
        {appt.services.map((sv) => (
          <p key={sv.id}>{sv.name}</p>
        ))}
        {appt.quotedTotal ? <p className='mt-2 font-medium'>{tr('estimated', { amount: formatINR(appt.quotedTotal) })}</p> : null}
        {appt.depositRequired ? (
          <p className='text-muted'>{tr('depositLine', { amount: formatINR(appt.depositRequired), state: appt.depositPaid ? tr('paid') : tr('pending') })}</p>
        ) : null}
      </div>
      {showGroup && appt.group ? (
        <div className='mt-4'>
          <GroupShare code={appt.group.code} lang={tr.lang} salonName={salon.name} slug={slug} start={appt.start} timezone={tz} />
        </div>
      ) : null}
      {upcoming ? (
        <div className='mt-5 space-y-3'>
          <div className='rounded-card bg-tint p-4 text-sm'>
            <p className='font-medium'>{tr('beforeYouCome')}</p>
            <ul className='mt-2 list-disc space-y-1 pl-5 text-muted'>
              {(['tipArrive', 'tipGel', 'tipOutfit'] as DictKey[]).map((k) => (
                <li key={k}>{tr(k)}</li>
              ))}
            </ul>
          </div>
          <div className='flex flex-wrap gap-2'>
            <a className={buttonClass('secondary', 'sm')} href={`${base}/appointments/${appt.id}/ics`}>
              <Calendar size={14} /> {tr('addToCalendar')}
            </a>
            {salon.contact?.mapUrl ? (
              <a className={buttonClass('secondary', 'sm')} href={salon.contact.mapUrl} rel='noopener' target='_blank'>
                <MapPin size={14} /> {tr('directions')}
              </a>
            ) : null}
          </div>
          {salon.contact?.parking ? (
            <p className='flex items-center gap-2 text-sm text-muted'>
              <ParkingCircle size={15} /> {salon.contact.parking}
            </p>
          ) : null}
          <AppointmentActions
            id={appt.id}
            labels={{
              reschedule: tr('reschedule'),
              cancel: tr('cancel'),
              cancelTitle: tr('cancelTitle'),
              cancelling: tr('cancelling'),
              yesCancel: tr('yesCancel'),
            }}
            policy={policy}
            slug={slug}
          />
        </div>
      ) : null}
      <Link className='mt-8 block text-center text-sm font-medium text-brand' href={`${base}/appointments`}>
        {tr('myAppointments')}
      </Link>
    </div>
  )
}
