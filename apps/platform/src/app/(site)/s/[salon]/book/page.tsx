import { asId, type ID } from '@salon/core'
import { activeRewards, customerCanChange, findGroupBooking } from '@salon/modules'
import { redirect } from 'next/navigation'
import { BookingFlow } from '@/components/site/BookingFlow'
import { rewardLabel, t, translator } from '@/lib/i18n'
import { getLang, salonLang, salonLanguages } from '@/lib/lang'
import { mediaUrl } from '@/lib/media'
import { getPayloadClient } from '@/lib/payload'
import { salonFeatures } from '@/lib/salon'
import { artists, currentCustomer, type DesignRecord, firstName, idOf, loadSalon, repoFor, services } from '@/lib/site'

export async function generateMetadata({ params }: { params: Promise<{ salon: string }> }) {
  const { salon: slug } = await params
  const salon = await loadSalon(slug)
  return { title: translator(await salonLang(salon))('book') }
}

type SP = Promise<{
  service?: string
  services?: string
  design?: string
  repeat?: string
  staff?: string
  start?: string
  chair?: string
  group?: string
  reschedule?: string
}>

export default async function BookPage({ params, searchParams }: { params: Promise<{ salon: string }>; searchParams: SP }) {
  const { salon: slug } = await params
  const sp = await searchParams
  const salon = await loadSalon(slug)
  const [customer, serviceList, artistList, repo] = await Promise.all([currentCustomer(salon), services(salon), artists(salon), repoFor(salon)])
  const lang = await getLang(customer?.language, salonLanguages(salon))
  const features = salonFeatures(salon)
  let initial: ID[] = []
  let design: DesignRecord | null = null
  // staff=any: the customer picked "Anyone available" (kept so a reload does not re-pick the design's artist).
  let staff: ID | null = sp.staff && sp.staff !== 'any' ? sp.staff : null
  let initialStart: string | null = sp.start ?? null
  if (sp.services) initial = sp.services.split(',').filter(Boolean)
  else if (sp.service) initial = [sp.service]
  if (sp.design) {
    design = await repo.findByID<DesignRecord>('designs', sp.design, 1)
    if (design && !initial.length) initial = [idOf(design.service), ...(design.addOns ?? []).map((a) => idOf(a))].filter(Boolean) as ID[]
    // "Book this look" starts with the artist who did it (still changeable on the artist step).
    const designArtist = design ? idOf(design.artist) : null
    if (!sp.staff && designArtist && artistList.some((a) => String(a.id) === String(designArtist))) staff = designArtist
  }
  if (sp.repeat && customer) {
    const visit = await repo.findByID<{
      customer: ID | { id: ID }
      lines: { service?: ID | { id: ID } | null }[]
      design?: ID | null
      staff?: ID | { id: ID } | null
    }>('visits', sp.repeat)
    if (visit && String(idOf(visit.customer)) === String(customer.id)) {
      initial = visit.lines.map((l) => idOf(l.service)).filter(Boolean) as ID[]
      staff = idOf(visit.staff)
      if (visit.design) design = await repo.findByID<DesignRecord>('designs', idOf(visit.design) as ID, 1)
    }
  }

  // Moving an existing appointment: same services and artist, pick a new time.
  let reschedule: { id: ID; start: string } | null = null
  if (sp.reschedule) {
    if (!customer) redirect(`/s/${slug}/login?next=${encodeURIComponent(`/s/${slug}/book?reschedule=${sp.reschedule}`)}`)
    const appt = await repo.findByID<{
      id: ID
      customer: ID | { id: ID }
      services: (ID | { id: ID })[]
      staff?: ID | { id: ID } | null
      design?: ID | { id: ID } | null
      start: string
      status: string
    }>('appointments', asId(sp.reschedule))
    if (
      !appt ||
      String(idOf(appt.customer)) !== String(customer.id) ||
      !customerCanChange(appt, new Date(), Number(salon.settings?.changeCutoffHours ?? 4) || 0)
    )
      redirect(`/s/${slug}/appointments/${sp.reschedule}`)
    reschedule = { id: appt.id, start: appt.start }
    initial = appt.services.map((s) => idOf(s)).filter(Boolean) as ID[]
    staff = idOf(appt.staff)
    initialStart = appt.start
    if (appt.design) design = await repo.findByID<DesignRecord>('designs', idOf(appt.design) as ID, 1)
  }

  // Joining a friend's group: show who invited them and start on the group's day.
  let group: { organiser?: string | null; occasion?: string | null } | null = null
  let groupCode: string | null = null
  if (sp.group && features.has('groupBooking') && !reschedule) {
    const found = await findGroupBooking(await getPayloadClient(), salon.id, sp.group)
    if (found) {
      groupCode = found.code
      group = { organiser: typeof found.organiser === 'object' ? firstName(found.organiser.name) : null, occasion: found.occasion }
      if (!initialStart && new Date(found.start).getTime() > Date.now()) initialStart = found.start
    }
  }

  // Services the appointment already has stay selectable even if one was later hidden from the menu.
  const valid = new Set(serviceList.map((s) => String(s.id)))
  if (!reschedule) initial = initial.filter((id) => valid.has(String(id)))
  const rewards =
    customer && !reschedule && features.has('loyalty')
      ? (await activeRewards(await getPayloadClient(), salon.id, customer.id))
          .filter((r) => !(r.scratch && !r.revealed))
          .map((r) => t(lang, 'rewardWillApply', { reward: rewardLabel(lang, r) }))
      : []
  const settings = (salon.settings ?? {}) as { depositMinMinutes?: number; depositPercent?: number; cancellationPolicy?: string }
  return (
    <BookingFlow
      artists={artistList.map((a) => ({ id: a.id, name: a.name, avatar: mediaUrl(a.avatar, 'thumb'), specialties: a.specialties }))}
      cancellationPolicy={settings.cancellationPolicy}
      depositRule={{ depositMinMinutes: settings.depositMinMinutes ?? 90, depositPercent: settings.depositPercent ?? 20 }}
      // Demo salons book without deposits (the booking module charges none), so the summary shows none either.
      depositsEnabled={features.has('deposits') && salon.status !== 'demo'}
      design={design ? { id: design.id, title: design.title, image: mediaUrl(design.images?.[0], 'thumb') } : null}
      group={group}
      groupBookingEnabled={features.has('groupBooking')}
      groupCode={groupCode}
      initialServiceIds={initial}
      initialStaffId={staff}
      initialStart={initialStart}
      key={reschedule ? `r-${reschedule.id}` : (groupCode ?? 'new')}
      lang={lang}
      loggedIn={Boolean(customer)}
      mapUrl={salon.contact?.mapUrl}
      preBooked={sp.chair === '1'}
      reschedule={reschedule}
      skipArtist={Boolean(sp.repeat && staff && initial.length)}
      rewards={rewards}
      salonName={salon.name}
      services={serviceList.map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        price: s.price,
        durationMinutes: s.durationMinutes,
        isAddOn: s.isAddOn,
      }))}
      slug={slug}
      timezone={salon.timezone ?? 'Asia/Kolkata'}
    />
  )
}
