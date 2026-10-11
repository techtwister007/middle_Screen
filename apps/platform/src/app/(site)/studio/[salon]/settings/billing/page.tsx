import { FEATURES, type FeatureKey, formatINR, forTenant, PLAN_LABELS, PLAN_PRICES, PLANS } from '@salon/core'
import { buttonClass } from '@salon/ui'
import Link from 'next/link'
import { getPayloadClient } from '@/lib/payload'
import { salonFeatures } from '@/lib/salon'
import { requireStaff } from '@/lib/staff'

export const metadata = { title: 'Plan & billing' }

const KIND_LABEL: Record<string, string> = {
  'whatsapp-utility': 'Reminders & receipts (WhatsApp)',
  'whatsapp-marketing': 'Offers (WhatsApp)',
  'whatsapp-auth': 'Login codes (WhatsApp)',
  sms: 'SMS',
  'ai-image': 'AI try-on images',
}

const FEATURE_LABEL: Partial<Record<FeatureKey, string>> = {
  deposits: 'Booking deposits',
  wallet: 'Customer wallet',
  giftCards: 'Gift cards',
  loyalty: 'Points & rewards',
  tiers: 'Silver / Gold tiers',
  walletPass: 'Google Wallet card',
  referrals: 'Gift-a-friend referrals',
  campaigns: 'Offers & campaigns',
  festivalPacks: 'Festival packs',
  contests: 'Monthly contests',
  contentEngine: 'Photo corner & share kit',
  reports: 'Insights & ROI report',
  tryOn: 'Try-on',
  aiTryOn: 'AI try-on',
  groupBooking: 'Group bookings',
  multiBranch: 'Multiple branches',
  customTheme: 'Custom theme',
}

const monthKey = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }).slice(0, 7)

export default async function BillingPage({ params }: { params: Promise<{ salon: string }> }) {
  const { salon: slug } = await params
  const { salon } = await requireStaff(slug, { manager: true })
  const payload = await getPayloadClient()
  const repo = forTenant(payload, salon.id)
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - i)
    return monthKey(d)
  })
  const [ledger, subscription] = await Promise.all([
    repo.find<{ kind: string; units?: number; total?: number; period: string }>('cost-ledger', { where: { period: { in: months } }, limit: 5000, depth: 0 }),
    repo.findOne<{ status?: string; nextBillingDate?: string; monthlyPrice?: number; foundingCustomer?: boolean }>('subscriptions', {}),
  ])
  const byMonth = new Map<string, { total: number; kinds: Map<string, { units: number; total: number }> }>()
  for (const l of ledger.docs) {
    const m = byMonth.get(l.period) ?? { total: 0, kinds: new Map() }
    const k = m.kinds.get(l.kind) ?? { units: 0, total: 0 }
    k.units += l.units ?? 1
    k.total += l.total ?? 0
    m.kinds.set(l.kind, k)
    m.total += l.total ?? 0
    byMonth.set(l.period, m)
  }
  const thisMonth = byMonth.get(months[0])
  const features = salonFeatures(salon)
  const price = subscription?.monthlyPrice ?? PLAN_PRICES[salon.plan]
  const support = (process.env.SUPPORT_WHATSAPP ?? '').replace(/\D/g, '')
  return (
    <div>
      <Link className='text-sm text-brand' href={`/studio/${slug}/settings`}>
        ← More
      </Link>
      <h1 className='mt-3 font-heading text-3xl'>Plan & billing</h1>

      <section className='mt-6 rounded-card border border-line bg-surface p-4'>
        <p className='text-sm text-muted'>Your plan</p>
        <p className='font-heading text-2xl'>
          {PLAN_LABELS[salon.plan]} · {formatINR(price)}/month
        </p>
        <p className='mt-1 text-sm text-muted'>
          {salon.status === 'demo' ? 'Demo: nothing is billed.' : subscription?.status ? `Status: ${subscription.status}` : 'Billing starts after go-live.'}
          {subscription?.nextBillingDate
            ? ` · Next bill ${new Date(subscription.nextBillingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })}`
            : ''}
          {subscription?.foundingCustomer ? ' · Founding salon price locked' : ''}
        </p>
        <p className='mt-3 text-sm'>
          WhatsApp and AI usage is passed through at cost, with no markup. Customer payments go straight to your own account; we never hold your money.
        </p>
      </section>

      <section className='mt-6 rounded-card border border-line bg-surface p-4'>
        <h2 className='font-heading text-xl'>This month's usage</h2>
        {thisMonth ? (
          <div className='mt-3 divide-y divide-line text-sm'>
            {[...thisMonth.kinds].map(([kind, v]) => (
              <div className='flex justify-between py-2' key={kind}>
                <span>
                  {KIND_LABEL[kind] ?? kind} <span className='text-muted'>× {v.units}</span>
                </span>
                <span>{formatINR(v.total)}</span>
              </div>
            ))}
            <div className='flex justify-between py-2 font-medium'>
              <span>Total usage</span>
              <span>{formatINR(thisMonth.total)}</span>
            </div>
          </div>
        ) : (
          <p className='mt-2 text-sm text-muted'>No messages sent yet this month.</p>
        )}
        <p className='mt-4 text-sm text-muted'>Earlier months</p>
        <div className='mt-1 grid grid-cols-5 gap-2 text-center text-xs'>
          {months.slice(1).map((m) => (
            <div className='rounded-md bg-tint p-2' key={m}>
              <p className='text-muted'>{new Date(`${m}-01T00:00:00Z`).toLocaleDateString('en-IN', { month: 'short' })}</p>
              <p className='font-medium'>{formatINR(byMonth.get(m)?.total ?? 0)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className='mt-6 rounded-card border border-line bg-surface p-4'>
        <h2 className='font-heading text-xl'>What's switched on</h2>
        <div className='mt-3 flex flex-wrap gap-2'>
          {FEATURES.filter((f) => FEATURE_LABEL[f]).map((f) => (
            <span className={`rounded-full px-3 py-1 text-xs ${features.has(f) ? 'bg-brand/10 text-brand' : 'bg-tint text-muted line-through'}`} key={f}>
              {FEATURE_LABEL[f]}
            </span>
          ))}
        </div>
        <p className='mt-4 text-sm text-muted'>
          Other plans:{' '}
          {PLANS.filter((p) => p !== salon.plan)
            .map((p) => `${PLAN_LABELS[p]} ${formatINR(PLAN_PRICES[p])}/month`)
            .join(' · ')}
        </p>
        {support ? (
          <a
            className={buttonClass('secondary', 'sm', 'mt-3')}
            href={`https://wa.me/${support}?text=${encodeURIComponent(`Hi, I'd like to change the plan for ${salon.name} (${slug})`)}`}
            rel='noopener'
            target='_blank'
          >
            Change plan
          </a>
        ) : null}
      </section>
    </div>
  )
}
