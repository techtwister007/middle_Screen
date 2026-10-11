import { FEATURES, formatINR, formatIST, forTenant, PLAN_PRICES } from '@salon/core'
import { salonHealth } from '@salon/modules'
import { buttonClass, Stat } from '@salon/ui'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { FeatureToggle, FieldSelect } from '@/components/console/SalonControls'
import { ActionForm } from '@/components/studio/ActionForm'
import { Field, inputClass } from '@/components/studio/Field'
import { getPayloadClient } from '@/lib/payload'
import { getSalonAnyStatus, salonFeatures } from '@/lib/salon'
import { saveSubscription } from '../../actions'

export const metadata = { title: 'Salon' }

export default async function SalonDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const salon = await getSalonAnyStatus(slug)
  if (!salon) notFound()
  const payload = await getPayloadClient()
  const health = await salonHealth(payload, salon)
  const features = salonFeatures(salon)
  const repo = forTenant(payload, salon.id)
  const [costs, sub, messages, audit] = await Promise.all([
    repo.find<{ kind: string; total: number; period: string }>('cost-ledger', { limit: 5000 }).then((r) => r.docs),
    repo.findOne<{
      status?: string
      monthlyPrice?: number
      setupFee?: number
      billingCycle?: string
      foundingCustomer?: boolean
      nextBillingDate?: string
      supportMinutesThisMonth?: number
    }>('subscriptions', {}),
    repo.find<{ id: string; createdAt: string; to: string; template: string; status: string; skipReason?: string; body?: string; audience?: string }>(
      'messages',
      {
        sort: '-createdAt',
        limit: 30,
        depth: 0,
      },
    ),
    payload
      .find({ collection: 'audit-log', overrideAccess: true, sort: '-createdAt', limit: 15, depth: 1, where: { 'details.slug': { equals: slug } } })
      .catch(() => ({ docs: [] })),
  ])
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
          <a className={buttonClass('secondary', 'sm')} download href={`/console/salons/${slug}/export`}>
            Export data
          </a>
          <Link className={buttonClass('secondary', 'sm')} href={`/console/salons/${slug}/open`}>
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
          <FieldSelect field='theme' options={['default', 'luxe', 'minimal']} slug={slug} value={salon.theme ?? 'default'} />
        </label>
      </div>
      <h2 className='mb-3 mt-10 font-heading text-xl'>Features</h2>
      <div className='grid grid-cols-2 gap-2 md:grid-cols-4'>
        {FEATURES.map((f) => (
          <FeatureToggle enabled={features.has(f)} feature={f} key={f} slug={slug} />
        ))}
      </div>
      <h2 className='mb-3 mt-10 font-heading text-xl'>Billing</h2>
      <div className='rounded-card border border-line bg-surface p-4'>
        <p className='mb-4 text-sm text-muted'>
          {sub?.status ? `Status: ${sub.status}` : 'No billing record yet.'}
          {sub?.supportMinutesThisMonth ? ` · ${sub.supportMinutesThisMonth} support minutes this month` : ''}
          {health.churnRisk !== 'low' ? ` · churn risk ${health.churnRisk}` : ''}
        </p>
        <ActionForm action={saveSubscription.bind(null, slug)} submit='Save billing'>
          <div className='grid gap-3 sm:grid-cols-3'>
            <Field label='Monthly price (₹)'>
              <input className={inputClass} defaultValue={(sub?.monthlyPrice ?? PLAN_PRICES[salon.plan]) / 100} name='monthlyPrice' type='number' />
            </Field>
            <Field label='Setup fee (₹)'>
              <input className={inputClass} defaultValue={(sub?.setupFee ?? 0) / 100} name='setupFee' type='number' />
            </Field>
            <Field label='Status'>
              <select className={inputClass} defaultValue={sub?.status ?? 'pending'} name='status'>
                {['pending', 'active', 'past-due', 'cancelled'].map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </Field>
            <Field label='Billing'>
              <select className={inputClass} defaultValue={sub?.billingCycle ?? 'monthly'} name='billingCycle'>
                <option value='monthly'>monthly</option>
                <option value='annual'>annual</option>
              </select>
            </Field>
            <Field label='Next bill'>
              <input className={inputClass} defaultValue={sub?.nextBillingDate?.slice(0, 10) ?? ''} name='nextBillingDate' type='date' />
            </Field>
            <Field label='Add support minutes'>
              <input className={inputClass} min={0} name='addSupportMinutes' placeholder='0' type='number' />
            </Field>
          </div>
          <label className='flex items-center gap-2 text-sm'>
            <input defaultChecked={Boolean(sub?.foundingCustomer)} name='foundingCustomer' type='checkbox' /> Founding salon (price locked)
          </label>
        </ActionForm>
      </div>

      <h2 className='mb-3 mt-10 font-heading text-xl'>Messages (latest 30)</h2>
      <p className='mb-3 text-sm text-muted'>Everything the platform sent or skipped for this salon, including with the fake provider in development.</p>
      <div className='divide-y divide-line rounded-card border border-line bg-surface text-sm'>
        {messages.docs.map((m) => (
          <details className='px-4 py-2' key={m.id}>
            <summary className='flex cursor-pointer list-none flex-wrap justify-between gap-2'>
              <span>
                {m.audience === 'owner' ? 'Owner · ' : ''}
                {m.template} → {m.to}
              </span>
              <span className={m.status === 'sent' ? 'text-muted' : 'text-red-700'}>
                {m.status}
                {m.skipReason ? ` (${m.skipReason})` : ''} · {formatIST(m.createdAt, 'd MMM, h:mm a')}
              </span>
            </summary>
            <p className='mt-2 whitespace-pre-wrap rounded-md bg-tint p-2'>{m.body}</p>
          </details>
        ))}
        {messages.docs.length === 0 ? <p className='p-4 text-muted'>No messages yet.</p> : null}
      </div>

      <h2 className='mb-3 mt-10 font-heading text-xl'>Audit trail</h2>
      <div className='divide-y divide-line rounded-card border border-line bg-surface text-sm'>
        {(audit.docs as unknown as { id: string; action: string; createdAt: string; actor?: { name?: string } }[]).map((a) => (
          <div className='flex justify-between px-4 py-2' key={a.id}>
            <span>
              {a.action} <span className='text-muted'>by {a.actor?.name ?? 'system'}</span>
            </span>
            <span className='text-muted'>{formatIST(a.createdAt, 'd MMM, h:mm a')}</span>
          </div>
        ))}
        {audit.docs.length === 0 ? <p className='p-4 text-muted'>Nothing yet.</p> : null}
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
