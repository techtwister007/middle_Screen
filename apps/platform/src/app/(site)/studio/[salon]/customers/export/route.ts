import { formatIST, forTenant } from '@salon/core'
import { getPayloadClient } from '@/lib/payload'
import { requireStaff } from '@/lib/staff'

const cell = (v: unknown) => {
  const s = v == null ? '' : String(v)
  // Quote, and stop spreadsheet apps treating the value as a formula.
  return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`
}

/** Owner's customer list as CSV (their data, always exportable). */
export async function GET(_req: Request, { params }: { params: Promise<{ salon: string }> }) {
  const { salon: slug } = await params
  const { salon, user } = await requireStaff(slug, { manager: true })
  const payload = await getPayloadClient()
  const repo = forTenant(payload, salon.id)
  const rows = (
    await repo.find<{
      name?: string
      phone: string
      segment?: string
      visitCount?: number
      lifetimeSpend?: number
      lastVisitAt?: string
      nextDueDate?: string
      birthday?: string
      source?: string
      consents?: { marketing?: boolean }
      createdAt: string
    }>('customers', { limit: 50_000, depth: 0, sort: 'createdAt' })
  ).docs
  const tz = salon.timezone ?? 'Asia/Kolkata'
  const head = ['Name', 'Phone', 'Segment', 'Visits', 'Total spent (₹)', 'Last visit', 'Next due', 'Birthday', 'Source', 'Offers consent', 'Joined']
  const lines = rows.map((c) =>
    [
      c.name,
      c.phone,
      c.segment,
      c.visitCount ?? 0,
      ((c.lifetimeSpend ?? 0) / 100).toFixed(0),
      c.lastVisitAt ? formatIST(c.lastVisitAt, 'yyyy-MM-dd', tz) : '',
      c.nextDueDate ? formatIST(c.nextDueDate, 'yyyy-MM-dd', tz) : '',
      c.birthday ? formatIST(c.birthday, 'yyyy-MM-dd', tz) : '',
      c.source,
      c.consents?.marketing ? 'yes' : 'no',
      formatIST(c.createdAt, 'yyyy-MM-dd', tz),
    ]
      .map(cell)
      .join(','),
  )
  await payload.create({
    collection: 'audit-log',
    overrideAccess: true,
    data: { actor: user.id, action: 'customers.exported', details: { slug, rows: rows.length } } as never,
  })
  return new Response(`﻿${[head.map(cell).join(','), ...lines].join('\r\n')}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${slug}-customers-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
