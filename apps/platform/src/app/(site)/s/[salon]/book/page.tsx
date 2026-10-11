import type { ID } from '@salon/core'
import { BookingFlow } from '@/components/site/BookingFlow'
import { mediaUrl } from '@/lib/media'
import { salonFeatures } from '@/lib/salon'
import { artists, currentCustomer, type DesignRecord, idOf, loadSalon, repoFor, services } from '@/lib/site'

export const metadata = { title: 'Book' }

type SP = Promise<{ service?: string; services?: string; design?: string; repeat?: string; staff?: string; start?: string; chair?: string; group?: string }>

export default async function BookPage({ params, searchParams }: { params: Promise<{ salon: string }>; searchParams: SP }) {
  const { salon: slug } = await params
  const sp = await searchParams
  const salon = await loadSalon(slug)
  const [customer, serviceList, artistList, repo] = await Promise.all([currentCustomer(salon), services(salon), artists(salon), repoFor(salon)])
  let initial: ID[] = []
  let design: DesignRecord | null = null
  let staff: ID | null = sp.staff ?? null
  if (sp.services) initial = sp.services.split(',').filter(Boolean)
  else if (sp.service) initial = [sp.service]
  if (sp.design) {
    design = await repo.findByID<DesignRecord>('designs', sp.design, 1)
    if (design && !initial.length) initial = [idOf(design.service), ...(design.addOns ?? []).map((a) => idOf(a))].filter(Boolean) as ID[]
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
  const valid = new Set(serviceList.map((s) => String(s.id)))
  initial = initial.filter((id) => valid.has(String(id)))
  const settings = (salon.settings ?? {}) as { depositMinMinutes?: number; depositPercent?: number; cancellationPolicy?: string }
  return (
    <BookingFlow
      artists={artistList.map((a) => ({ id: a.id, name: a.name, avatar: mediaUrl(a.avatar, 'thumb'), specialties: a.specialties }))}
      cancellationPolicy={settings.cancellationPolicy}
      depositRule={{ depositMinMinutes: settings.depositMinMinutes ?? 90, depositPercent: settings.depositPercent ?? 20 }}
      depositsEnabled={salonFeatures(salon).has('deposits')}
      design={design ? { id: design.id, title: design.title, image: mediaUrl(design.images?.[0], 'thumb') } : null}
      groupCode={sp.group ?? null}
      initialServiceIds={initial}
      initialStaffId={staff}
      initialStart={sp.start ?? null}
      loggedIn={Boolean(customer)}
      mapUrl={salon.contact?.mapUrl}
      preBooked={sp.chair === '1'}
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
