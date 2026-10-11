import { formatINR, formatIST, PLAN_LABELS, PLAN_PRICES, type Plan } from '@salon/core'
import { salonHealth } from '@salon/modules'
import { Badge, buttonClass, Stat } from '@salon/ui'
import Link from 'next/link'
import type { Where } from 'payload'
import { getPayloadClient } from '@/lib/payload'

export const metadata = { title: 'Console' }

const PAGE = 25
const STATUS = ['all', 'active', 'trial', 'demo', 'suspended'] as const
const RISK = ['any', 'high', 'medium', 'low'] as const

interface Row {
  id: string
  name: string
  slug: string
  plan: Plan
  status: string
  createdAt: string
  contact?: { city?: string | null; area?: string | null } | null
  settings?: { demoExpiresAt?: string | null; keepDemo?: boolean | null } | null
}

export default async function ConsoleHome({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; plan?: string; risk?: string; page?: string; sort?: string }> }) {
  const sp = await searchParams
  const payload = await getPayloadClient()
  const and: Where[] = []
  if (sp.q) and.push({ or: [{ name: { like: sp.q } }, { slug: { like: sp.q } }, { 'contact.city': { like: sp.q } }, { 'contact.area': { like: sp.q } }] })
  if (sp.status && sp.status !== 'all') and.push({ status: { equals: sp.status } })
  if (sp.plan && sp.plan !== 'all') and.push({ plan: { equals: sp.plan } })
  const all = (
    await payload.find({ collection: 'salons', overrideAccess: true, depth: 0, limit: 2000, sort: sp.sort === 'name' ? 'name' : '-createdAt', where: and.length ? { and } : undefined })
  ).docs as unknown as Row[]
  const withHealth = await Promise.all(all.map(async (s) => ({ s, h: await salonHealth(payload, s) })))
  const filtered = sp.risk && sp.risk !== 'any' ? withHealth.filter((x) => x.h.churnRisk === sp.risk) : withHealth
  const page = Math.max(1, Number(sp.page ?? 1) || 1)
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE))
  const rows = filtered.slice((page - 1) * PAGE, page * PAGE)

  const everyone = (await payload.find({ collection: 'salons', overrideAccess: true, depth: 0, limit: 2000 })).docs as unknown as Row[]
  const live = everyone.filter((s) => s.status === 'active')
  const mrr = live.reduce((n, s) => n + (PLAN_PRICES[s.plan] ?? 0), 0)
  const soon = Date.now() + 2 * 86_400_000
  const expiring = everyone.filter((s) => s.status === 'demo' && !s.settings?.keepDemo && s.settings?.demoExpiresAt && new Date(s.settings.demoExpiresAt).getTime() < soon)
  const attention = withHealth.filter((x) => x.s.status === 'active' && (x.h.churnRisk === 'high' || x.h.failedMessages > 0 || x.h.billingStatus === 'past-due'))
  const qs = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v && v !== 'all' && v !== 'any') as [string, string][])
    return `?${next.toString()}`
  }
  return (
    <div>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <h1 className='font-heading text-3xl'>Salons</h1>
        <div className='flex gap-2'>
          <Link className={buttonClass('secondary')} href='/console/support'>
            Find a customer
          </Link>
          <Link className={buttonClass('primary')} href='/console/new'>
            New salon or demo
          </Link>
        </div>
      </div>
      <div className='mt-6 grid grid-cols-2 gap-3 md:grid-cols-4'>
        <Stat label='Live salons' value={live.length} />
        <Stat label='MRR (list price)' value={formatINR(mrr)} />
        <Stat hint={expiring.length ? `${expiring.length} pause within 2 days` : undefined} label='Demos' value={everyone.filter((s) => s.status === 'demo').length} />
        <Stat hint='High churn risk, failed messages or unpaid' label='Need attention' value={attention.length} />
      </div>

      {attention.length ? (
        <div className='mt-4 rounded-card border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950'>
          <p className='font-medium'>Need attention</p>
          <ul className='mt-1 space-y-0.5'>
            {attention.slice(0, 6).map(({ s, h }) => (
              <li key={s.id}>
                <Link className='underline' href={`/console/salons/${s.slug}`}>
                  {s.name}
                </Link>
                : {[h.churnRisk === 'high' ? 'quiet for over a week' : '', h.failedMessages ? `${h.failedMessages} failed messages` : '', h.billingStatus === 'past-due' ? 'payment overdue' : '']
                  .filter(Boolean)
                  .join(' · ')}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <form className='mt-6 flex flex-wrap items-end gap-2' role='search'>
        <label className='min-w-48 flex-1 text-sm'>
          <span className='mb-1 block text-muted'>Search</span>
          <input className='h-11 w-full rounded-btn border border-line bg-surface px-3' defaultValue={sp.q} name='q' placeholder='Name, link, city or area' />
        </label>
        {[
          ['status', 'Status', STATUS],
          ['plan', 'Plan', ['all', 'starter', 'studio', 'growth']],
          ['risk', 'Churn risk', RISK],
        ].map(([name, label, options]) => (
          <label className='text-sm' key={name as string}>
            <span className='mb-1 block text-muted'>{label as string}</span>
            <select className='h-11 rounded-btn border border-line bg-surface px-3' defaultValue={sp[name as 'status'] ?? (options as readonly string[])[0]} name={name as string}>
              {(options as readonly string[]).map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
        ))}
        <label className='text-sm'>
          <span className='mb-1 block text-muted'>Sort</span>
          <select className='h-11 rounded-btn border border-line bg-surface px-3' defaultValue={sp.sort ?? 'new'} name='sort'>
            <option value='new'>Newest</option>
            <option value='name'>Name</option>
          </select>
        </label>
        <button className={buttonClass('secondary', 'md', 'h-11')} type='submit'>
          Apply
        </button>
      </form>

      <p className='mt-4 text-sm text-muted'>
        {filtered.length} salon{filtered.length === 1 ? '' : 's'}
      </p>
      <div className='mt-2 overflow-x-auto rounded-card border border-line bg-surface'>
        <table className='w-full text-sm'>
          <thead className='border-b border-line text-left text-xs uppercase tracking-wider text-muted'>
            <tr>
              <th className='px-4 py-3'>Salon</th>
              <th className='px-4 py-3'>Plan</th>
              <th className='px-4 py-3'>Status</th>
              <th className='px-4 py-3 text-right'>Customers</th>
              <th className='px-4 py-3 text-right'>Bookings (month)</th>
              <th className='px-4 py-3 text-right'>Failed msgs</th>
              <th className='px-4 py-3'>Billing</th>
              <th className='px-4 py-3'>Churn risk</th>
              <th className='px-4 py-3' />
            </tr>
          </thead>
          <tbody className='divide-y divide-line'>
            {rows.map(({ s, h }) => (
              <tr key={s.id}>
                <td className='px-4 py-3'>
                  <Link className='font-medium' href={`/console/salons/${s.slug}`}>
                    {s.name}
                  </Link>
                  <p className='text-xs text-muted'>
                    {[s.contact?.area, s.contact?.city].filter(Boolean).join(', ') || s.slug} · since {formatIST(s.createdAt, 'd MMM yyyy')}
                  </p>
                </td>
                <td className='px-4 py-3'>{PLAN_LABELS[s.plan] ?? s.plan}</td>
                <td className='px-4 py-3'>
                  <Badge tone={s.status === 'active' ? 'success' : s.status === 'demo' ? 'brand' : s.status === 'trial' ? 'warning' : 'danger'}>{s.status}</Badge>
                  {s.status === 'demo' && s.settings?.demoExpiresAt ? (
                    <p className='mt-1 text-xs text-muted'>{s.settings.keepDemo ? 'kept' : `pauses ${formatIST(s.settings.demoExpiresAt, 'd MMM')}`}</p>
                  ) : null}
                </td>
                <td className='px-4 py-3 text-right tabular-nums'>{h.customers}</td>
                <td className='px-4 py-3 text-right tabular-nums'>{h.bookingsThisMonth}</td>
                <td className={`px-4 py-3 text-right tabular-nums ${h.failedMessages ? 'text-red-700' : ''}`}>{h.failedMessages}</td>
                <td className='px-4 py-3'>{h.billingStatus ?? '—'}</td>
                <td className='px-4 py-3'>
                  <Badge tone={h.churnRisk === 'high' ? 'danger' : h.churnRisk === 'medium' ? 'warning' : 'success'}>{h.churnRisk}</Badge>
                </td>
                <td className='px-4 py-3 text-right'>
                  {s.status === 'demo' ? (
                    <Link className='text-brand' href={`/console/demo/${s.slug}`}>
                      Present
                    </Link>
                  ) : (
                    <Link className='text-brand' href={`/console/salons/${s.slug}/open`}>
                      Studio
                    </Link>
                  )}
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td className='px-4 py-8 text-center text-muted' colSpan={9}>
                  No salons match.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {pages > 1 ? (
        <nav aria-label='Pages' className='mt-4 flex items-center justify-center gap-2 text-sm'>
          {page > 1 ? (
            <Link className={buttonClass('secondary', 'sm')} href={qs({ page: String(page - 1) })}>
              ← Previous
            </Link>
          ) : null}
          <span className='text-muted'>
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link className={buttonClass('secondary', 'sm')} href={qs({ page: String(page + 1) })}>
              Next →
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  )
}
