import { formatINR, formatIST, forTenant, normalizePhone } from '@salon/core'
import { messagePrice } from '@salon/integrations'
import { Badge, buttonClass, cn, Input } from '@salon/ui'
import { MessageCircle, Phone } from 'lucide-react'
import Link from 'next/link'
import type { Where } from 'payload'
import { plural, waLink } from '@/components/studio/format'
import { RemindDueButton } from '@/components/studio/RemindDueButton'
import { ScrollActiveIntoView } from '@/components/studio/ScrollActiveIntoView'
import { getPayloadClient } from '@/lib/payload'
import { canManage, requireStaff } from '@/lib/staff'

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
const SEGMENT_LABEL: Record<string, string> = { due: 'due', 'at-risk': 'at risk', lapsed: 'lapsed', new: 'new', regular: 'regular', lead: 'lead' }

const PAGE = 50

interface Row {
  id: string
  name?: string
  phone: string
  segment?: string
  isVip?: boolean
  visitCount?: number
  lifetimeSpend?: number
  lastVisitAt?: string
  nextDueDate?: string
  allergies?: string
}

export default async function CustomersPage({
  params,
  searchParams,
}: {
  params: Promise<{ salon: string }>
  searchParams: Promise<{ segment?: string; q?: string; filter?: string; n?: string }>
}) {
  const { salon: slug } = await params
  const sp = await searchParams
  const { salon, user } = await requireStaff(slug)
  const manager = canManage(user)
  const payload = await getPayloadClient()
  const repo = forTenant(payload, salon.id)
  const tz = salon.timezone ?? 'Asia/Kolkata'
  const show = Math.min(2000, Math.max(PAGE, Number(sp.n) || PAGE))
  const and: Where[] = []
  if (sp.segment === 'vip') and.push({ isVip: { equals: true } })
  else if (sp.segment) and.push({ segment: { equals: sp.segment } })
  const q = sp.q?.trim()
  if (q) {
    const digits = q.replace(/\D/g, '')
    const phone = digits.length >= 10 ? normalizePhone(q) : null
    and.push(
      phone
        ? { phone: { equals: phone } }
        : { or: [...(/[a-z]/i.test(q) ? [{ name: { contains: q } }] : []), ...(digits.length >= 3 ? [{ phone: { contains: digits } }] : [])] },
    )
  }
  if (sp.filter === 'follow-up') {
    const ratings = await repo.find<{ customer: string | { id: string } }>('ratings', { where: { followUp: { equals: 'needed' } }, limit: 100 })
    and.push({ id: { in: ratings.docs.map((r) => (typeof r.customer === 'object' ? r.customer.id : r.customer)) } })
  }
  const byDue = sp.segment === 'due' || sp.segment === 'at-risk'
  // Most recent visitors first; people who never visited (leads) come after, newest first.
  const visited = await repo.find<Row>('customers', {
    where: byDue ? (and.length ? { and } : undefined) : { and: [...and, { lastVisitAt: { exists: true } }] },
    sort: byDue ? 'nextDueDate' : '-lastVisitAt',
    limit: show,
  })
  const leads =
    !byDue && visited.docs.length < show
      ? await repo.find<Row>('customers', {
          where: { and: [...and, { lastVisitAt: { exists: false } }] },
          sort: '-createdAt',
          limit: show - visited.docs.length,
        })
      : { docs: [] as Row[], totalDocs: byDue ? 0 : await repo.count('customers', { and: [...and, { lastVisitAt: { exists: false } }] }) }
  const docs = [...visited.docs, ...leads.docs]
  const total = visited.totalDocs + leads.totalDocs
  const base = `/studio/${slug}`
  const counts = await Promise.all(
    SEGMENTS.slice(1).map(([k]) => (k === 'vip' ? repo.count('customers', { isVip: { equals: true } }) : repo.count('customers', { segment: { equals: k } }))),
  )
  const qs = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams()
    for (const [k, v] of Object.entries({ segment: sp.segment, q: sp.q, filter: sp.filter, ...extra })) if (v) p.set(k, v)
    const s = p.toString()
    return `${base}/customers${s ? `?${s}` : ''}`
  }
  return (
    <div>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <h1 className='font-heading text-3xl'>Customers</h1>
        {manager ? (
          <div className='flex gap-1 text-sm'>
            <Link className='inline-flex min-h-11 items-center px-2 text-brand' href={`${base}/customers/import`}>
              Import
            </Link>
            <a className='inline-flex min-h-11 items-center px-2 text-brand' download href={`${base}/customers/export`}>
              Export CSV
            </a>
          </div>
        ) : null}
      </div>
      <form className='mt-4'>
        <Input aria-label='Search customers' defaultValue={sp.q} name='q' placeholder='Search by name or phone' type='search' />
        {sp.segment ? <input name='segment' type='hidden' value={sp.segment} /> : null}
      </form>
      <ScrollActiveIntoView className='no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4'>
        {SEGMENTS.map(([k, label], i) => (
          <Link
            aria-current={(sp.segment ?? '') === k ? 'page' : undefined}
            className={cn(
              'inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm',
              (sp.segment ?? '') === k ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface',
            )}
            data-active={(sp.segment ?? '') === k || undefined}
            href={`${base}/customers${k ? `?segment=${k}` : ''}`}
            key={k}
          >
            {label}
            {i > 0 ? <span className='ml-1 opacity-70'>{counts[i - 1]}</span> : null}
          </Link>
        ))}
      </ScrollActiveIntoView>
      {sp.segment === 'due' ? (
        <div className='mt-4 space-y-3 rounded-card bg-tint p-3 text-sm'>
          <p>
            Reminders go out on their own at the right time. Want to nudge everyone now? Customers who already booked or got a reminder this week are skipped.
          </p>
          {manager ? <RemindDueButton count={total} pricePaise={messagePrice('utility')} slug={slug} /> : null}
        </div>
      ) : sp.segment === 'at-risk' ? (
        <p className='mt-4 rounded-card bg-tint p-3 text-sm'>
          Win-back messages go out automatically. Open a customer to send a personal WhatsApp in one tap, or launch an offer from Campaigns.
        </p>
      ) : null}
      <p className='mt-4 text-xs text-muted'>{total ? `Showing ${docs.length} of ${plural(total, 'customer')}` : ''}</p>
      <div className='mt-1 divide-y divide-line overflow-hidden rounded-card border border-line bg-surface'>
        {docs.map((c) => (
          <div className='flex items-center gap-1 pr-2' data-testid='customer-row' key={c.id}>
            <Link className='flex min-h-16 min-w-0 flex-1 items-center justify-between gap-2 py-3 pl-4' href={`${base}/customers/${c.id}`}>
              <div className='min-w-0'>
                <p className='flex items-center gap-1.5 truncate font-medium'>
                  <span className='truncate'>{c.name ?? c.phone}</span>
                  {c.isVip ? <Badge tone='warning'>VIP</Badge> : null}
                  {c.allergies ? <Badge tone='danger'>Allergy</Badge> : null}
                </p>
                <p className='truncate text-xs text-muted'>
                  {c.visitCount ? plural(c.visitCount, 'visit') : 'No visits yet'}
                  {c.visitCount ? ` · ${formatINR(c.lifetimeSpend ?? 0)}` : ''}
                  {c.lastVisitAt ? ` · last ${formatIST(c.lastVisitAt, 'd MMM', tz)}` : ''}
                </p>
              </div>
              {c.segment ? (
                <Badge className='shrink-0' tone={TONE[c.segment] ?? 'muted'}>
                  {SEGMENT_LABEL[c.segment] ?? c.segment}
                </Badge>
              ) : null}
            </Link>
            <a
              aria-label={`Call ${c.name ?? c.phone}`}
              className='flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-brand hover:bg-tint'
              href={`tel:${c.phone}`}
            >
              <Phone size={18} />
            </a>
            <a
              aria-label={`WhatsApp ${c.name ?? c.phone}`}
              className='flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-emerald-700 hover:bg-tint'
              href={waLink(c.phone, `Hi ${c.name?.split(' ')[0] ?? ''}, `)}
              rel='noopener'
              target='_blank'
            >
              <MessageCircle size={18} />
            </a>
          </div>
        ))}
        {docs.length === 0 ? <p className='p-6 text-center text-sm text-muted'>No customers here.</p> : null}
      </div>
      {docs.length < total ? (
        <Link className={buttonClass('secondary', 'lg', 'mt-4 w-full')} href={qs({ n: String(show + PAGE) })} scroll={false}>
          Load more ({total - docs.length} more)
        </Link>
      ) : null}
    </div>
  )
}
