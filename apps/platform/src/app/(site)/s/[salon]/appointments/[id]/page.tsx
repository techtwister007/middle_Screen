import { formatINR } from '@salon/core'
import { customerCanChange } from '@salon/modules'
import { Badge, buttonClass } from '@salon/ui'
import { Calendar, Clock, MapPin, MessageCircle, ParkingCircle, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppointmentActions } from '@/components/site/AppointmentActions'
import { GroupShare } from '@/components/site/BookingFlow'
import { StickyBar } from '@/components/site/StickyBar'
import { type DictKey, formatDateIn, translator } from '@/lib/i18n'
import { getLang, salonLang, salonLanguages } from '@/lib/lang'
import { mediaUrl } from '@/lib/media'
import { salonFeatures } from '@/lib/salon'
import { idOf, loadSalon, repoFor, requireCustomer } from '@/lib/site'
import { STATUS_TONE } from '../../_lib/status'

export async function generateMetadata({ params }: { params: Promise<{ salon: string }> }) {
  const { salon: slug } = await params
  const salon = await loadSalon(slug)
  return { title: translator(await salonLang(salon))('yourAppointment') }
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
  const tr = translator(await getLang(customer?.language, salonLanguages(salon)))
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
    design?: { id: string; title: string; images?: unknown[] } | null
    inspiration?: unknown[]
    group?: { code: string; status: string; organiser: string | { id: string } } | null
    updatedAt?: string
  }>('appointments', id, 2)
  if (!appt || String(idOf(appt.customer)) !== String(customer.id)) notFound()
  const tz = salon.timezone ?? 'Asia/Kolkata'
  const settings = (salon.settings ?? {}) as { cancellationPolicy?: string; changeCutoffHours?: number; depositRefundHours?: number }
  const cutoffHours = Number(settings.changeCutoffHours ?? 4) || 0
  const refundHours = Number(settings.depositRefundHours ?? 24) || 0
  const upcoming = customerCanChange(appt, new Date(), cutoffHours)
  const cancelled = appt.status === 'cancelled'
  // Still ahead but inside the salon's cut-off: changes go through the salon.
  const lockedIn = !upcoming && ['requested', 'confirmed'].includes(appt.status) && new Date(appt.start).getTime() > Date.now()
  const policy = settings.cancellationPolicy
  const base = `/s/${slug}`
  const showGroup = upcoming && salonFeatures(salon).has('groupBooking') && appt.group && typeof appt.group === 'object' && appt.group.status === 'open'
  const deposit = appt.depositRequired
    ? ((
        await repo.find<{ status: string; amount: number; refundedAt?: string | null }>('payments', {
          where: { and: [{ appointment: { equals: appt.id } }, { kind: { equals: 'deposit' } }, { status: { in: ['captured', 'refunded'] } }] },
          sort: '-createdAt',
          limit: 1,
        })
      ).docs[0] ?? null)
    : null
  const depositAmount = formatINR(deposit?.amount ?? appt.depositRequired ?? 0)
  const depositPaid = Boolean(appt.depositPaid) || deposit?.status === 'captured' || deposit?.status === 'refunded'
  const hoursToStart = (new Date(appt.start).getTime() - Date.now()) / 3_600_000
  // When cancelled: refunded, on its way (cancelled in time, refund still processing) or kept (cancelled late).
  const cancelledInTime =
    hoursToStart >= refundHours || (appt.updatedAt ? (new Date(appt.start).getTime() - new Date(appt.updatedAt).getTime()) / 3_600_000 >= refundHours : false)
  const depositText = !appt.depositRequired
    ? null
    : deposit?.status === 'refunded'
      ? tr('depositRefunded', { amount: depositAmount, date: deposit.refundedAt ? formatDateIn(tr.lang, deposit.refundedAt, 'd MMM', tz) : '' })
      : cancelled && depositPaid
        ? cancelledInTime
          ? tr('depositRefundOnWay', { amount: depositAmount })
          : tr('depositKept', { amount: depositAmount })
        : tr('depositLine', { amount: depositAmount, state: depositPaid ? tr('paid') : tr('pending') })
  const rebookHref = `${base}/book?services=${appt.services.map((sv) => sv.id).join(',')}${appt.design?.id ? `&design=${appt.design.id}` : ''}`
  const whatsapp = salon.contact?.whatsapp?.replace(/\D/g, '')
  return (
    <div className='px-4 pt-5'>
      {paid && !cancelled ? <p className='mb-4 rounded-btn bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800'>{tr('depositReceived')}</p> : null}
      {moved && !cancelled ? (
        <p className='mb-4 rounded-btn bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800' data-testid='moved'>
          {tr('apptMoved')}
        </p>
      ) : null}
      <Badge tone={STATUS_TONE[appt.status] ?? 'warning'}>{tr.or(`ap_${appt.status}`, appt.status)}</Badge>
      <h1 className={cancelled ? 'mt-2 font-heading text-3xl text-muted line-through decoration-1' : 'mt-2 font-heading text-3xl'} data-testid='appt-date'>
        {formatDateIn(tr.lang, appt.start, 'EEEE d MMMM', tz)}
      </h1>
      <p className='flex flex-wrap items-center gap-x-2 text-muted' data-testid='appt-time'>
        <Clock size={15} /> {formatDateIn(tr.lang, appt.start, 'h:mm a', tz)} – {formatDateIn(tr.lang, appt.end, 'h:mm a', tz)}
        {appt.staff ? ` · ${tr('withName', { name: appt.staff.name })}` : ''}
      </p>
      {appt.design ? (
        <div className='mt-5 flex items-center gap-3 rounded-card border border-line bg-surface p-3'>
          {mediaUrl(appt.design.images?.[0], 'thumb') ? (
            <img alt='' className='h-16 w-16 rounded-xl object-cover' src={mediaUrl(appt.design.images?.[0], 'thumb') ?? undefined} />
          ) : (
            <span className='h-16 w-16 rounded-xl bg-tint' />
          )}
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
        {depositText ? (
          <p className='text-muted' data-testid='deposit-line'>
            {depositText}
          </p>
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
            <a className={buttonClass('secondary', 'md')} href={`${base}/appointments/${appt.id}/ics`}>
              <Calendar size={16} /> {tr('addToCalendar')}
            </a>
            {salon.contact?.mapUrl ? (
              <a className={buttonClass('secondary', 'md')} href={salon.contact.mapUrl} rel='noopener' target='_blank'>
                <MapPin size={16} /> {tr('directions')}
              </a>
            ) : null}
          </div>
          {salon.contact?.parking ? (
            <p className='flex items-center gap-2 text-sm text-muted'>
              <ParkingCircle size={15} /> {salon.contact.parking}
            </p>
          ) : null}
          {cutoffHours > 0 ? <p className='text-xs text-muted'>{tr('changeCutoffNote', { hours: cutoffHours })}</p> : null}
          <StickyBar testId='appt-actions'>
            <AppointmentActions
              deposit={
                appt.depositRequired && depositPaid && deposit?.status !== 'refunded'
                  ? hoursToStart >= refundHours
                    ? tr('cancelRefundYes', { amount: depositAmount })
                    : tr('cancelRefundNo', { amount: depositAmount, hours: refundHours })
                  : null
              }
              id={appt.id}
              labels={{
                reschedule: tr('reschedule'),
                cancel: tr('cancel'),
                cancelTitle: tr('cancelTitle'),
                cancelling: tr('cancelling'),
                yesCancel: tr('yesCancel'),
                keep: tr('keepAppointment'),
              }}
              policy={policy}
              slug={slug}
            />
          </StickyBar>
        </div>
      ) : lockedIn ? (
        <div className='mt-5 rounded-card border border-line bg-surface p-4 text-sm' data-testid='change-closed'>
          <p>{tr('changeClosed', { hours: cutoffHours })}</p>
          {whatsapp ? (
            <a className={buttonClass('secondary', 'md', 'mt-3 w-full')} href={`https://wa.me/${whatsapp}`} rel='noopener' target='_blank'>
              <MessageCircle size={16} /> {tr('whatsapp')}
            </a>
          ) : null}
        </div>
      ) : cancelled ? (
        <StickyBar testId='appt-actions'>
          <Link className={buttonClass('primary', 'lg', 'w-full')} data-testid='book-again' href={rebookHref}>
            <RotateCcw size={18} /> {tr('bookAgain')}
          </Link>
        </StickyBar>
      ) : null}
      <Link className='mt-6 flex min-h-11 items-center justify-center text-sm font-medium text-brand' href={`${base}/appointments`}>
        {tr('myAppointments')}
      </Link>
    </div>
  )
}
