import { BuyPackageButton } from '@/components/site/BuyButton'
import { mediaUrl } from '@/lib/media'
import { salonFeatures } from '@/lib/salon'
import { customerHome, loadSalon, repoFor, requireCustomer } from '@/lib/site'
import { formatINR, formatIST } from '@salon/core'
import { googleWalletSaveUrl } from '@salon/integrations'
import { Badge, cn } from '@salon/ui'
import { Gift, Sparkles, Wallet } from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'Rewards' }

const TIERS = { member: 'Member', silver: 'Silver', gold: 'Gold' } as Record<string, string>

export default async function RewardsPage({ params, searchParams }: { params: Promise<{ salon: string }>; searchParams: Promise<{ buy?: string; package?: string }> }) {
  const { salon: slug } = await params
  const sp = await searchParams
  const salon = await loadSalon(slug)
  const customer = await requireCustomer(salon, `/s/${slug}/rewards`)
  const { account, rewards, wallet } = await customerHome(salon, customer)
  const repo = await repoFor(salon)
  const features = salonFeatures(salon)
  const settings = (salon.settings ?? {}) as { stampsForReward?: number; silverAfterVisits?: number; goldAfterVisits?: number }
  const need = settings.stampsForReward ?? 6
  const stamps = account?.stamps ?? 0
  const tz = salon.timezone ?? 'Asia/Kolkata'
  const base = `/s/${slug}`
  const packages = (await repo.find<{ id: string; name: string; description?: string; price: number }>('packages', { where: { active: { equals: true } } })).docs
  const myPackages = (
    await repo.find<{ id: string; package: { name: string }; remaining: { service: { name: string }; quantity: number }[]; expiresAt?: string; status: string }>('customer-packages', {
      where: { and: [{ customer: { equals: customer.id } }, { status: { equals: 'active' } }] },
      depth: 2,
    })
  ).docs
  const walletUrl = features.has('walletPass')
    ? await googleWalletSaveUrl({
        objectId: `${salon.slug}-${customer.id}`,
        classId: `${salon.slug}-rewards`,
        salonName: salon.name,
        customerName: customer.name ?? 'Member',
        stamps,
        stampsForReward: need,
        points: account?.points ?? 0,
        tier: TIERS[account?.tier ?? 'member'],
        logoUrl: mediaUrl(salon.brand?.logo, 'thumb') ?? undefined,
        barcodeValue: customer.referralCode ?? String(customer.id),
      }).catch(() => null)
    : null
  return (
    <div className="px-4 pt-5">
      {sp.package ? <p className="mb-4 rounded-btn bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800">Payment received. Your package is ready to use.</p> : null}
      <div className="relative overflow-hidden rounded-card bg-brand p-5 text-on-brand">
        <Sparkles className="absolute -right-3 -top-3 opacity-20" size={110} />
        <div className="flex items-center justify-between">
          <p className="font-heading text-2xl">{salon.name} Rewards</p>
          <Badge className="bg-white/20 text-current">{TIERS[account?.tier ?? 'member']}</Badge>
        </div>
        <p className="mt-1 text-sm opacity-85">{customer.name ?? customer.phone}</p>
        <div className="mt-5 grid grid-cols-6 gap-2">
          {Array.from({ length: need }).map((_, i) => (
            <span className={cn('flex aspect-square items-center justify-center rounded-full border-2 border-white/60', i < stamps ? 'bg-white text-brand' : '')} key={i}>
              {i < stamps ? '✓' : i === need - 1 ? '🎁' : ''}
            </span>
          ))}
        </div>
        <p className="mt-3 text-sm opacity-90">
          {need - stamps} more visit{need - stamps === 1 ? '' : 's'} to a free nail art set · {account?.points ?? 0} points
        </p>
      </div>
      {walletUrl ? (
        <a className="mt-3 flex h-12 items-center justify-center gap-2 rounded-btn bg-black text-sm font-medium text-white" href={walletUrl} rel="noopener" target="_blank">
          <Wallet size={16} /> Add to Google Wallet
        </a>
      ) : null}

      {features.has('wallet') ? (
        <div className="mt-6 flex items-center justify-between rounded-card border border-line bg-surface p-4">
          <div>
            <p className="text-xs text-muted">Wallet balance</p>
            <p className="font-heading text-2xl">{formatINR(wallet)}</p>
          </div>
          <Wallet className="text-brand" />
        </div>
      ) : null}

      <h2 className="mb-3 mt-8 font-heading text-xl">Your rewards</h2>
      {rewards.length === 0 ? (
        <p className="rounded-card border border-dashed border-line p-6 text-center text-sm text-muted">Rewards appear here after visits, referrals and birthdays.</p>
      ) : (
        <div className="space-y-3">
          {rewards.map((r) =>
            r.scratch && !r.revealed ? (
              <Link className="flex items-center gap-4 rounded-card border-2 border-dashed border-brand/50 bg-brand/5 p-4" href={`${base}/rewards/scratch/${r.id}`} key={String(r.id)}>
                <Gift className="text-brand" />
                <div className="flex-1">
                  <p className="font-medium">Scratch card waiting</p>
                  <p className="text-sm text-muted">Tap to scratch and reveal</p>
                </div>
              </Link>
            ) : (
              <div className="flex items-center gap-4 rounded-card border border-line bg-surface p-4" key={String(r.id)}>
                <Gift className="text-brand" />
                <div className="flex-1">
                  <p className="font-medium">{r.title}</p>
                  <p className="text-xs text-muted">
                    {r.validTo ? `Valid till ${formatIST(r.validTo, 'd MMM', tz)}` : ''}
                    {r.code ? ` · show code ${r.code}` : ''}
                  </p>
                </div>
              </div>
            ),
          )}
        </div>
      )}

      {myPackages.length ? (
        <>
          <h2 className="mb-3 mt-8 font-heading text-xl">My packages</h2>
          {myPackages.map((p) => (
            <div className="mb-3 rounded-card border border-line bg-surface p-4" key={p.id}>
              <p className="font-medium">{p.package?.name}</p>
              {p.remaining.map((r, i) => (
                <p className="text-sm text-muted" key={i}>
                  {r.quantity} × {r.service?.name} left
                </p>
              ))}
            </div>
          ))}
        </>
      ) : null}

      {features.has('wallet') && packages.length ? (
        <>
          <h2 className="mb-3 mt-8 font-heading text-xl">Prepaid packages</h2>
          <div className="space-y-3">
            {packages.map((p) => (
              <div className={cn('flex items-center justify-between gap-4 rounded-card border p-4', sp.buy === p.id ? 'border-brand' : 'border-line bg-surface')} key={p.id}>
                <div>
                  <p className="font-medium">{p.name}</p>
                  {p.description ? <p className="text-sm text-muted">{p.description}</p> : null}
                </div>
                <BuyPackageButton label={formatINR(p.price)} packageId={p.id} slug={slug} />
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}
