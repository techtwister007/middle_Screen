import { addDays, DAY_MS, forTenant, idOf, localDate, localWeekday, zonedDateTime } from '@salon/core'
import type { Where } from 'payload'
import { type CalAppt, Calendar } from '@/components/studio/Calendar'
import { getPayloadClient } from '@/lib/payload'
import { canManage, requireStaff } from '@/lib/staff'
import { teamOf } from '../_lib/team'

export const metadata = { title: 'Calendar' }

const DAY = /^\d{4}-\d{2}-\d{2}$/

export default async function CalendarPage({ params, searchParams }: { params: Promise<{ salon: string }>; searchParams: Promise<{ date?: string }> }) {
  const { salon: slug } = await params
  const sp = await searchParams
  const { salon, user } = await requireStaff(slug)
  const manager = canManage(user)
  const tz = salon.timezone ?? 'Asia/Kolkata'
  const payload = await getPayloadClient()
  const repo = forTenant(payload, salon.id)
  const today = localDate(new Date(), tz)
  const date = sp.date && DAY.test(sp.date) ? sp.date : today
  // The week (Mon–Sun) around the chosen day; phones show one day of it at a time.
  const anchor = zonedDateTime(date, '12:00', tz)
  const weekStartDate = localDate(addDays(anchor, -((localWeekday(anchor, tz) + 6) % 7)), tz)
  const weekStart = zonedDateTime(weekStartDate, '00:00', tz)
  const weekEnd = new Date(weekStart.getTime() + 7 * DAY_MS + 2 * 3600_000)
  const days = Array.from({ length: 7 }, (_, i) => localDate(new Date(weekStart.getTime() + i * DAY_MS + 12 * 3600_000), tz))
  const mine: Where[] = manager ? [] : [{ or: [{ staff: { equals: user.id } }, { staff: { exists: false } }] }]
  const [appts, team] = await Promise.all([
    repo.find<{
      id: string
      start: string
      end: string
      status: string
      source?: string
      customer: { id: string; name?: string; phone: string; allergies?: string | null; visitCount?: number } | null
      staff?: { id: string; name: string } | null
      services: { id: string; name: string }[]
      notes?: string | null
    }>('appointments', {
      where: {
        and: [
          { start: { greater_than_equal: weekStart.toISOString() } },
          { start: { less_than: weekEnd.toISOString() } },
          { status: { not_in: ['cancelled'] } },
          ...mine,
        ],
      },
      sort: 'start',
      depth: 1,
      limit: 500,
    }),
    teamOf(payload, salon.id, { bookableOnly: true }),
  ])
  const columns = (manager ? team : team.filter((t) => String(t.id) === String(user.id))).map((t) => ({ id: String(t.id), name: t.name }))
  const items: CalAppt[] = appts.docs.map((a) => ({
    id: String(a.id),
    start: a.start,
    end: a.end,
    status: a.status,
    source: a.source ?? null,
    customerId: a.customer ? String(a.customer.id) : null,
    customerName: a.customer?.name ?? a.customer?.phone ?? 'Customer',
    phone: a.customer?.phone ?? null,
    allergies: a.customer?.allergies ?? null,
    firstVisit: Boolean(a.customer && !a.customer.visitCount),
    staffId: a.staff ? String(idOf(a.staff)) : null,
    staffName: a.staff?.name ?? null,
    services: a.services.map((s) => (typeof s === 'object' ? s.name : '')).filter(Boolean),
    serviceIds: a.services.map((s) => String(idOf(s))),
    notes: a.notes ?? null,
  }))
  const hours = salon.hours ?? []
  const open = hours.filter((h) => !h.closed).map((h) => h.open ?? '10:00')
  const close = hours.filter((h) => !h.closed).map((h) => h.close ?? '20:00')
  const startHour = Math.max(6, Math.min(10, ...open.map((o) => Number(o.slice(0, 2)))) - 1)
  const endHour = Math.min(24, Math.max(20, ...close.map((c) => Number(c.slice(0, 2)) + (c.slice(3) === '00' ? 0 : 1))) + 1)
  return (
    <Calendar
      appts={items}
      columns={columns}
      date={date}
      days={days}
      endHour={endHour}
      manager={manager}
      slug={slug}
      startHour={startHour}
      timezone={tz}
      today={today}
    />
  )
}
