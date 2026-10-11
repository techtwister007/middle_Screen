import { FEATURES, formatINR, formatIST, forTenant, type ID, PLAN_FEATURES, PLAN_PRICES } from '@salon/core'
import { salonHealth } from '@salon/modules'
import { buttonClass, Stat } from '@salon/ui'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { FeatureToggle, FieldSelect } from '@/components/console/SalonControls'
import { ActionForm } from '@/components/studio/ActionForm'
import { Field, inputClass } from '@/components/studio/Field'
import { getPayloadClient } from '@/lib/payload'
import { FlagButton } from '@/components/studio/FlagButton'
import { ResetPasswordButton } from '@/components/console/ResetPasswordButton'
import { FEATURE_LABELS } from '@/lib/featureLabels'
import { getSalonAnyStatus, salonFeatures } from '@/lib/salon'
import { demoLifecycle, saveSubscription } from '../../actions'

export const metadata = { title: 'Salon' }

export default async function SalonDetail({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ messages?: string }> }) {
  const { slug } = await params
  const { messages: messageFilter } = await searchParams
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
        where: messageFilter && ['failed', 'skipped', 'sent'].includes(messageFilter) ? { status: { equals: messageFilter } } : undefined,
      },
    ),
    payload
      .find({ collection: 'audit-log', overrideAccess: true, sort: '-createdAt', limit: 15, depth: 1, where: { 'details.slug': { equals: slug } } })
      .catch(() => ({ docs: [] })),
  ])
  const byKind = new Map<string, number>()
  for (const c of costs) byKind.set(`${c.period} · ${c.kind}`, (byKind.get(`${c.period} · ${c.kind}`) ?? 0) + c.total)
  const settings = (salon.settings ?? {}) as Record<string, unknown>
  const team = (
    await payload.find({ collection: 'users', overrideAccess: true, depth: 0, limit: 50, where: { 'tenants.tenant': { equals: salon.id } } })
  ).docs as unknown as { id: ID; name: string; role: string; email: string }[]
  const [serviceCount, designCount, linkScans] = await Promise.all([
    repo.count('services', { active: { equals: true } }),
    repo.count('designs', { published: { equals: true } }),
    repo.find<{ clicks?: number }>('tracking-links', { limit: 50 }).then((r) => r.docs.reduce((n, l) => n + (l.clicks ?? 0), 0)),
  ])
  const c = salon.contact ?? {}
  const checklist = [
    { label: 'Menu with real prices', done: serviceCount > 0, hint: 'Studio → More → Menu & prices' },
    { label: 'At least 6 designs in the gallery', done: designCount >= 6, hint: 'Their photos, or copy looks from the design library' },
    { label: 'Logo and colours', done: Boolean(salon.brand?.logo), hint: 'Studio → More → Salon page & brand' },
    { label: 'Address and opening hours', done: Boolean(c.address && salon.hours?.length), hint: 'Studio → More → Salon page & brand' },
    { label: 'WhatsApp number for owner alerts', done: Boolean(c.whatsapp || c.phone) },
    { label: 'Google review link', done: Boolean(settings.googleReviewUrl), hint: 'Studio → More → Rules' },
    { label: 'Payments: Razorpay account or UPI ID', done: Boolean((salon as { razorpayAccountId?: string }).razorpayAccountId || salon.upiVpa), hint: 'Set in /admin → Salons → Payments & messaging' },
    { label: 'Staff invited (owner plus artists)', done: team.length >= 2 },
    { label: 'Billing record', done: Boolean(sub?.status && sub.status !== 'pending') },
    { label: 'QR kit printed and scanned', done: linkScans > 0, hint: 'Studio → More → QR kit → printable posters' },
  ]
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
          <FieldSelect field='status' options={[
              ['trial', 'Trial'],
              ['active', 'Live'],
              ['suspended', 'Paused'],
              ['demo', 'Demo'],
            ]} slug={slug} value={salon.status} />
        </label>
        <label className='text-sm'>
          <span className='mb-1 block text-muted'>Plan</span>
          <FieldSelect field='plan' options={[
              ['starter', 'Starter'],
              ['studio', 'Studio'],
              ['growth', 'Growth'],
            ]} slug={slug} value={salon.plan} />
        </label>
        <label className='text-sm'>
          <span className='mb-1 block text-muted'>Theme</span>
          <FieldSelect field='theme' options={[
              ['default', 'Blush'],
              ['luxe', 'Noir & Gold'],
              ['minimal', 'Studio White'],
            ]} slug={slug} value={salon.theme ?? 'default'} />
        </label>
      </div>
      {salon.status === 'demo' ? (
        <section className='mt-8 rounded-card border border-brand/40 bg-brand/5 p-4'>
          <h2 className='font-heading text-xl'>Demo</h2>
          <p className='mt-1 text-sm text-muted'>
            {settings.keepDemo
              ? 'Kept: this demo does not pause.'
              : settings.demoExpiresAt
                ? `Pauses itself on ${formatIST(String(settings.demoExpiresAt), 'd MMM yyyy')}.`
                : 'Pauses itself 7 days after it was built.'}
          </p>
          <div className='mt-3 flex flex-wrap gap-2'>
            <Link className={buttonClass('primary', 'sm')} href={`/console/demo/${slug}`}>
              Present
            </Link>
            <FlagButton run={demoLifecycle.bind(null, slug, 'extend')}>Extend 7 days</FlagButton>
            <FlagButton run={demoLifecycle.bind(null, slug, 'keep')}>Keep (never pause)</FlagButton>
            <FlagButton confirm='Make this demo a live salon? Sample customers and history stay until you remove them.' run={demoLifecycle.bind(null, slug, 'go-live')}>
              They said yes: go live
            </FlagButton>
            <FlagButton className='text-red-700' confirm='Delete this demo and everything in it?' run={demoLifecycle.bind(null, slug, 'delete')} then='/console'>
              Delete demo
            </FlagButton>
          </div>
        </section>
      ) : null}

      {salon.status !== 'demo' ? (
        <section className='mt-8 rounded-card border border-line bg-surface p-4'>
          <h2 className='font-heading text-xl'>Go-live checklist</h2>
          <ul className='mt-3 space-y-2 text-sm'>
            {checklist.map((c) => (
              <li className='flex items-start gap-2' key={c.label}>
                <span aria-hidden className={c.done ? 'text-green-700' : 'text-amber-700'}>
                  {c.done ? '✓' : '○'}
                </span>
                <span>
                  <span className={c.done ? 'text-muted' : ''}>{c.label}</span>
                  {!c.done && c.hint ? <span className='block text-xs text-muted'>{c.hint}</span> : null}
                </span>
              </li>
            ))}
          </ul>
          <p className='mt-3 text-xs text-muted'>
            {checklist.filter((c) => c.done).length} of {checklist.length} done
          </p>
        </section>
      ) : null}

      <section className='mt-8'>
        <h2 className='mb-3 font-heading text-xl'>Team logins</h2>
        <div className='divide-y divide-line rounded-card border border-line bg-surface text-sm'>
          {team.map((u) => (
            <div className='flex flex-wrap items-center justify-between gap-2 px-4 py-2' key={String(u.id)}>
              <span>
                {u.name} <span className='text-muted'>· {u.role} · {u.email}</span>
              </span>
              <ResetPasswordButton slug={slug} userId={u.id} />
            </div>
          ))}
        </div>
      </section>

      <h2 className='mb-3 mt-10 font-heading text-xl'>Features</h2>
      <div className='grid grid-cols-2 gap-2 md:grid-cols-4'>
        {FEATURES.map((f) => (
          <FeatureToggle enabled={features.has(f)} feature={f} key={f} label={FEATURE_LABELS[f]} planDefault={(PLAN_FEATURES[salon.plan] ?? []).includes(f)} slug={slug} />
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
      <nav className='mb-3 flex flex-wrap gap-2 text-sm'>
        {[
          ['', 'All'],
          ['failed', 'Failed'],
          ['skipped', 'Not sent'],
          ['sent', 'Sent'],
        ].map(([k, label]) => (
          <Link
            className={`inline-flex min-h-10 items-center rounded-full border px-3 ${(messageFilter ?? '') === k ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface'}`}
            href={k ? `?messages=${k}` : '?'}
            key={k || 'all'}
            scroll={false}
          >
            {label}
          </Link>
        ))}
      </nav>
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
