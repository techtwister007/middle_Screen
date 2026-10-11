import { formatINR, formatIST } from '@salon/core'
import { salonHealth } from '@salon/modules'
import { Badge, buttonClass, Stat } from '@salon/ui'
import Link from 'next/link'
import { getPayloadClient } from '@/lib/payload'

export const metadata = { title: 'Console' }

export default async function ConsoleHome() {
  const payload = await getPayloadClient()
  const salons = (await payload.find({ collection: 'salons', overrideAccess: true, depth: 0, limit: 500, sort: '-createdAt' })).docs as unknown as {
    id: string
    name: string
    slug: string
    plan: string
    status: string
    createdAt: string
  }[]
  const health = await Promise.all(salons.map((s) => salonHealth(payload, s)))
  const active = salons.filter((s) => s.status === 'active').length
  const prices: Record<string, number> = { starter: 49900, studio: 99900, growth: 249900 }
  const mrr = salons.filter((s) => s.status === 'active').reduce((n, s) => n + (prices[s.plan] ?? 0), 0)
  const passThrough = health.reduce((n, h) => n + h.passThroughCost, 0)
  return (
    <div>
      <div className='flex items-center justify-between'>
        <h1 className='font-heading text-3xl'>Salons</h1>
        <Link className={buttonClass('primary')} href='/console/new'>
          New salon or demo
        </Link>
      </div>
      <div className='mt-6 grid grid-cols-2 gap-3 md:grid-cols-4'>
        <Stat label='Active salons' value={active} />
        <Stat label='MRR (list price)' value={formatINR(mrr)} />
        <Stat label='Demos' value={salons.filter((s) => s.status === 'demo').length} />
        <Stat label='Pass-through costs this month' value={formatINR(passThrough)} />
      </div>
      <div className='mt-8 overflow-x-auto rounded-card border border-line bg-surface'>
        <table className='w-full text-sm'>
          <thead className='border-b border-line text-left text-xs uppercase tracking-wider text-muted'>
            <tr>
              <th className='px-4 py-3'>Salon</th>
              <th className='px-4 py-3'>Plan</th>
              <th className='px-4 py-3'>Status</th>
              <th className='px-4 py-3'>Activated</th>
              <th className='px-4 py-3 text-right'>Customers</th>
              <th className='px-4 py-3 text-right'>Bookings (month)</th>
              <th className='px-4 py-3 text-right'>Costs (month)</th>
              <th className='px-4 py-3'>Churn risk</th>
              <th className='px-4 py-3' />
            </tr>
          </thead>
          <tbody className='divide-y divide-line'>
            {salons.map((s, i) => (
              <tr key={s.id}>
                <td className='px-4 py-3'>
                  <Link className='font-medium' href={`/console/salons/${s.slug}`}>
                    {s.name}
                  </Link>
                  <p className='text-xs text-muted'>since {formatIST(s.createdAt, 'd MMM yyyy')}</p>
                </td>
                <td className='px-4 py-3'>{s.plan}</td>
                <td className='px-4 py-3'>
                  <Badge tone={s.status === 'active' ? 'success' : s.status === 'demo' ? 'brand' : 'danger'}>{s.status}</Badge>
                </td>
                <td className='px-4 py-3'>{health[i].activated ? 'Yes' : 'Not yet'}</td>
                <td className='px-4 py-3 text-right tabular-nums'>{health[i].customers}</td>
                <td className='px-4 py-3 text-right tabular-nums'>{health[i].bookingsThisMonth}</td>
                <td className='px-4 py-3 text-right tabular-nums'>{formatINR(health[i].passThroughCost)}</td>
                <td className='px-4 py-3'>
                  <Badge tone={health[i].churnRisk === 'high' ? 'danger' : health[i].churnRisk === 'medium' ? 'warning' : 'success'}>
                    {health[i].churnRisk}
                  </Badge>
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
          </tbody>
        </table>
      </div>
    </div>
  )
}
