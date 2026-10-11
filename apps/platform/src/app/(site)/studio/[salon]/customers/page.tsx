import { formatINR, formatIST, forTenant, normalizePhone } from '@salon/core'
import { Badge, cn, Input } from '@salon/ui'
import Link from 'next/link'
import type { Where } from 'payload'
import { getPayloadClient } from '@/lib/payload'
import { requireStaff } from '@/lib/staff'

export const metadata = { title: 'Customers' }

const SEGMENTS = [
  ['', 'All'],
  ['due', 'Due'],
  ['at-risk', 'At risk'],
  ['lapsed', 'Lapsed'],
  ['new', 'New'],
  ['regular', 'Regular'],
  ['vip', 'VIP'],
] as const

const TONE: Record<string, 'brand' | 'warning' | 'danger' | 'success' | 'muted'> = {
  due: 'warning',
  'at-risk': 'danger',
  lapsed: 'muted',
  new: 'brand',
  regular: 'success',
  lead: 'muted',
}

export default async function CustomersPage({
  params,
  searchParams,
}: {
  params: Promise<{ salon: string }>
  searchParams: Promise<{ segment?: string; q?: string; filter?: string }>
}) {
  const { salon: slug } = await params
  const sp = await searchParams
  const { salon } = await requireStaff(slug)
  const payload = await getPayloadClient()
  const repo = forTenant(payload, salon.id)
  const tz = salon.timezone ?? 'Asia/Kolkata'
  const and: Where[] = []
  if (sp.segment === 'vip') and.push({ isVip: { equals: true } })
  else if (sp.segment) and.push({ segment: { equals: sp.segment } })
  if (sp.q) {
    const phone = normalizePhone(sp.q)
    and.push(phone ? { phone: { equals: phone } } : { name: { like: sp.q } })
  }
  if (sp.filter === 'follow-up') {
    const ratings = await repo.find<{ customer: string | { id: string } }>('ratings', { where: { followUp: { equals: 'needed' } }, limit: 100 })
    and.push({ id: { in: ratings.docs.map((r) => (typeof r.customer === 'object' ? r.customer.id : r.customer)) } })
  }
  const res = await repo.find<{
    id: string
    name?: string
    phone: string
    segment?: string
    isVip?: boolean
    visitCount?: number
    lifetimeSpend?: number
    lastVisitAt?: string
    nextDueDate?: string
  }>('customers', {
    where: and.length ? { and } : undefined,
    sort: sp.segment === 'due' || sp.segment === 'at-risk' ? 'nextDueDate' : '-lastVisitAt',
    limit: 100,
  })
  const base = `/studio/${slug}`
  const counts = await Promise.all(
    SEGMENTS.slice(1).map(([k]) => (k === 'vip' ? repo.count('customers', { isVip: { equals: true } }) : repo.count('customers', { segment: { equals: k } }))),
  )
  return (
    <div>
      <h1 className='font-heading text-3xl'>Customers</h1>
      <form className='mt-4'>
        <Input defaultValue={sp.q} name='q' placeholder='Search by name or phone' />
        {sp.segment ? <input name='segment' type='hidden' value={sp.segment} /> : null}
      </form>
      <div className='no-scrollbar mt-3 flex gap-2 overflow-x-auto'>
        {SEGMENTS.map(([k, label], i) => (
          <Link
            className={cn(
              'shrink-0 rounded-full border px-4 py-1.5 text-sm',
              (sp.segment ?? '') === k ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface',
            )}
            href={`${base}/customers${k ? `?segment=${k}` : ''}`}
            key={k}
          >
            {label}
            {i > 0 ? <span className='ml-1 opacity-70'>{counts[i - 1]}</span> : null}
          </Link>
        ))}
      </div>
      {sp.segment === 'due' || sp.segment === 'at-risk' ? (
        <p className='mt-4 rounded-card bg-tint p-3 text-sm'>Reminders go out automatically. Open a customer to send a personal WhatsApp in one tap.</p>
      ) : null}
      <div className='mt-4 divide-y divide-line overflow-hidden rounded-card border border-line bg-surface'>
        {res.docs.map((c) => (
          <Link className='flex items-center justify-between gap-3 px-4 py-3' href={`${base}/customers/${c.id}`} key={c.id}>
            <div className='min-w-0'>
              <p className='truncate font-medium'>
                {c.name ?? c.phone} {c.isVip ? <Badge tone='warning'>VIP</Badge> : null}
              </p>
              <p className='text-xs text-muted'>
                {c.visitCount ?? 0} visits · {formatINR(c.lifetimeSpend ?? 0)}
                {c.lastVisitAt ? ` · last ${formatIST(c.lastVisitAt, 'd MMM', tz)}` : ''}
              </p>
            </div>
            {c.segment ? <Badge tone={TONE[c.segment] ?? 'muted'}>{c.segment}</Badge> : null}
          </Link>
        ))}
        {res.docs.length === 0 ? <p className='p-6 text-center text-sm text-muted'>No customers here.</p> : null}
      </div>
    </div>
  )
}
