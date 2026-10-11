import { getSalonBySlug } from '@/lib/salon'
import { getPayloadClient } from '@/lib/payload'
import { getCustomerSession } from '@/lib/session'
import { forTenant, idOf } from '@salon/core'

const stamp = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '')

export async function GET(_: Request, { params }: { params: Promise<{ salon: string; id: string }> }) {
  const { salon: slug, id } = await params
  const salon = await getSalonBySlug(slug)
  if (!salon) return new Response('Not found', { status: 404 })
  const session = await getCustomerSession(slug, salon.id)
  if (!session) return new Response('Please log in', { status: 401 })
  const appt = await forTenant(await getPayloadClient(), salon.id).findByID<{ customer: unknown; start: string; end: string; services: { name: string }[] }>('appointments', id, 1)
  if (!appt || String(idOf(appt.customer)) !== String(session.customerId)) return new Response('Not found', { status: 404 })
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Salon Platform//EN',
    'BEGIN:VEVENT',
    `UID:appt-${id}@${slug}`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(appt.start)}`,
    `DTEND:${stamp(appt.end)}`,
    `SUMMARY:${salon.name}: ${appt.services.map((s) => s.name).join(', ')}`,
    `LOCATION:${(salon.contact?.address ?? '').replace(/\n/g, ' ')}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${salon.name} appointment`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
  return new Response(ics, { headers: { 'content-type': 'text/calendar; charset=utf-8', 'content-disposition': `attachment; filename="${slug}-appointment.ics"` } })
}
