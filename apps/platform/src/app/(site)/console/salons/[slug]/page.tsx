import { FEATURES, formatINR, forTenant } from '@salon/core'
import { salonHealth } from '@salon/modules'
import { buttonClass, Stat } from '@salon/ui'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { FeatureToggle, FieldSelect } from '@/components/console/SalonControls'
import { getPayloadClient } from '@/lib/payload'
import { getSalonBySlug, salonFeatures } from '@/lib/salon'

export const metadata = { title: 'Salon' }

export default async function SalonDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const salon = await getSalonBySlug(slug)
  if (!salon) notFound()
  const payload = await getPayloadClient()
  const health = await salonHealth(payload, salon)
  const features = salonFeatures(salon)
  const costs = (await forTenant(payload, salon.id).find<{ kind: string; total: number; period: string }>('cost-ledger', { limit: 5000 })).docs
  const byKind = new Map<string, number>()
  for (const c of costs) byKind.set(`${c.period} · ${c.kind}`, (byKind.get(`${c.period} · ${c.kind}`) ?? 0) + c.total)
  return (
    <div>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <h1 className='font-heading text-3xl'>{salon.name}</h1>
        <div className='flex gap-2'>
          <Link className={buttonClass('secondary', 'sm')} href={`/s/${slug}`} target='_blank'>
            Customer app
          </Link>
          <Link className={buttonClass('secondary', 'sm')} href={`/studio/${slug}/today`}>
            Studio (impersonate)
          </Link>
          {salon.status === 'demo' ? (
            <Link className={buttonClass('primary', 'sm')} href={`/console/demo/${slug}`}>
              Present demo
            </Link>
          ) : null}
        </div>
      </div>
      <div className='mt-6 grid grid-cols-2 gap-3 md:grid-cols-4'>
        <Stat label='Customers' value={health.customers} />
        <Stat label='Bookings this month' value={health.bookingsThisMonth} />
        <Stat label='Visits this month' value={health.visitsThisMonth} />
        <Stat label='Pass-through costs' value={formatINR(health.passThroughCost)} />
      </div>
      <div className='mt-8 flex flex-wrap gap-6'>
        <label className='text-sm'>
          <span className='mb-1 block text-muted'>Status</span>
          <FieldSelect field='status' options={['trial', 'active', 'suspended', 'demo']} slug={slug} value={salon.status} />
        </label>
        <label className='text-sm'>
          <span className='mb-1 block text-muted'>Plan</span>
          <FieldSelect field='plan' options={['starter', 'studio', 'growth']} slug={slug} value={salon.plan} />
        </label>
        <label className='text-sm'>
          <span className='mb-1 block text-muted'>Theme</span>
          <FieldSelect field='theme' options={['default', 'luxe', 'minimal', 'custom']} slug={slug} value={salon.theme ?? 'default'} />
        </label>
      </div>
      <h2 className='mb-3 mt-10 font-heading text-xl'>Features</h2>
      <div className='grid grid-cols-2 gap-2 md:grid-cols-4'>
        {FEATURES.map((f) => (
          <FeatureToggle enabled={features.has(f)} feature={f} key={f} slug={slug} />
        ))}
      </div>
      <h2 className='mb-3 mt-10 font-heading text-xl'>Cost ledger (billed at cost)</h2>
      <div className='divide-y divide-line rounded-card border border-line bg-surface text-sm'>
        {[...byKind.entries()].map(([k, v]) => (
          <div className='flex justify-between px-4 py-2' key={k}>
            <span>{k}</span>
            <span className='tabular-nums'>{formatINR(v)}</span>
          </div>
        ))}
        {byKind.size === 0 ? <p className='p-4 text-muted'>No costs yet.</p> : null}
      </div>
    </div>
  )
}
