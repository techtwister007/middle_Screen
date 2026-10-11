import { formatINR, formatIST } from '@salon/core'
import { googleWalletSaveUrl } from '@salon/integrations'
import { Badge, cn } from '@salon/ui'
import { Gift, Sparkles, Wallet } from 'lucide-react'
import Link from 'next/link'
import { BuyPackageButton } from '@/components/site/BuyButton'
import { type DictKey, translator } from '@/lib/i18n'
import { getLang, salonLang } from '@/lib/lang'
import { mediaUrl } from '@/lib/media'
import { salonFeatures } from '@/lib/salon'
import { customerHome, loadSalon, repoFor, requireCustomer } from '@/lib/site'
import { requireFeature } from '../_lib/gate'

export async function generateMetadata({ params }: { params: Promise<{ salon: string }> }) {
  const { salon: slug } = await params
  return { title: translator(await salonLang(await loadSalon(slug)))('rewards') }
}

interface HistoryReward {
  id: string
  title: string
  kind: string
  status: string
  scratch?: boolean | null
  revealed?: boolean | null
  createdAt: string
  validTo?: string | null
  redeemedVisit?: { createdAt?: string } | string | null
  updatedAt: string
}

export default async function RewardsPage({
  params,
  searchParams,
}: {
  params: Promise<{ salon: string }>
  searchParams: Promise<{ buy?: string; package?: string }>
}) {
  const { salon: slug } = await params
  const sp = await searchParams
  const salon = await loadSalon(slug)
  // The stamp card lives here; wallet and packages too, so either feature keeps the page.
  requireFeature(salon, 'loyalty', 'wallet')
  const customer = await requireCustomer(salon, `/s/${slug}/rewards`)
  const tr = translator(await getLang(customer.language))
  const tierLabel = (tier?: string | null) => tr.or(`tier_${tier ?? 'member'}`, tier ?? 'member')
  const { account, rewards, wallet } = await customerHome(salon, customer)
  const repo = await repoFor(salon)
  const features = salonFeatures(salon)
  const settings = (salon.settings ?? {}) as { stampsForReward?: number; silverAfterVisits?: number; goldAfterVisits?: number }
  const need = settings.stampsForReward ?? 6
  const stamps = account?.stamps ?? 0
  const tz = salon.timezone ?? 'Asia/Kolkata'
  const base = `/s/${slug}`
  const packages = (await repo.find<{ id: string; name: string; description?: string; price: number }>('packages', { where: { active: { equals: true } } }))
    .docs
  const myPackages = (
    await repo.find<{
      id: string
      package: { name: string }
      remaining: { service: { name: string }; quantity: number }[]
      expiresAt?: string
      status: string
    }>('customer-packages', {
      where: { and: [{ customer: { equals: customer.id } }, { status: { equals: 'active' } }] },
      depth: 2,
    })
  ).docs
  const [history, walletEntries] = await Promise.all([
    features.has('loyalty')
      ? repo.find<HistoryReward>('rewards', { where: { customer: { equals: customer.id } }, sort: '-createdAt', limit: 50, depth: 1 })
      : Promise.resolve({ docs: [] as HistoryReward[] }),
    features.has('wallet')
      ? repo.find<{ id: string; amount: number; reason: string; createdAt: string }>('wallet-entries', {
          where: { customer: { equals: customer.id } },
          sort: '-createdAt',
          limit: 50,
        })
      : Promise.resolve({ docs: [] as { id: string; amount: number; reason: string; createdAt: string }[] }),
  ])
  // Unscratched cards stay a surprise.
  const pastRewards = history.docs.filter((r) => !(r.scratch && !r.revealed))
  const walletUrl =
    features.has('walletPass') && features.has('loyalty')
      ? await googleWalletSaveUrl({
          objectId: `${salon.slug}-${customer.id}`,
          classId: `${salon.slug}-rewards`,
          salonName: salon.name,
          customerName: customer.name ?? 'Member',
          stamps,
          stampsForReward: need,
          points: account?.points ?? 0,
          tier: tierLabel(account?.tier),
          logoUrl: mediaUrl(salon.brand?.logo, 'thumb') ?? undefined,
          barcodeValue: customer.referralCode ?? String(customer.id),
        }).catch(() => null)
      : null
  return (
    <div className='px-4 pt-5'>
      {sp.package ? <p className='mb-4 rounded-btn bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800'>{tr('packagePaid')}</p> : null}
      {features.has('loyalty') ? (
        <div className='relative overflow-hidden rounded-card bg-brand p-5 text-on-brand'>
          <Sparkles className='absolute -right-3 -top-3 opacity-20' size={110} />
          <div className='flex items-center justify-between'>
            <p className='font-heading text-2xl'>{tr('rewardsTitle', { salon: salon.name })}</p>
            <Badge className='bg-white/20 text-current'>{tierLabel(account?.tier)}</Badge>
          </div>
          <p className='mt-1 text-sm opacity-85'>{customer.name ?? customer.phone}</p>
          <div className='mt-5 grid grid-cols-6 gap-2'>
            {Array.from({ length: need }).map((_, i) => (
              <span
                className={cn('flex aspect-square items-center justify-center rounded-full border-2 border-white/60', i < stamps ? 'bg-white text-brand' : '')}
                key={i}
              >
                {i < stamps ? '✓' : i === need - 1 ? '🎁' : ''}
              </span>
            ))}
          </div>
          <p className='mt-3 text-sm opacity-90'>
            {need - stamps === 1 ? tr('moreVisit1') : tr('moreVisits', { n: need - stamps })} · {tr('pointsN', { n: account?.points ?? 0 })}
          </p>
        </div>
      ) : null}
      {walletUrl ? (
        <a
          className='mt-3 flex h-12 items-center justify-center gap-2 rounded-btn bg-black text-sm font-medium text-white'
          href={walletUrl}
          rel='noopener'
          target='_blank'
        >
          <Wallet size={16} /> {tr('addToGoogleWallet')}
        </a>
      ) : null}

      {features.has('wallet') ? (
        <div className='mt-6 flex items-center justify-between rounded-card border border-line bg-surface p-4'>
          <div>
            <p className='text-xs text-muted'>{tr('walletBalance')}</p>
            <p className='font-heading text-2xl'>{formatINR(wallet)}</p>
          </div>
          <Wallet className='text-brand' />
        </div>
      ) : null}

      {!features.has('loyalty') ? null : rewards.length === 0 ? (
        <>
          <h2 className='mb-3 mt-8 font-heading text-xl'>{tr('yourRewards')}</h2>
          <p className='rounded-card border border-dashed border-line p-6 text-center text-sm text-muted'>{tr('rewardsEmpty')}</p>
        </>
      ) : (
        <>
          <h2 className='mb-3 mt-8 font-heading text-xl'>{tr('yourRewards')}</h2>
          <div className='space-y-3'>
            {rewards.map((r) =>
              r.scratch && !r.revealed ? (
                <Link
                  className='flex items-center gap-4 rounded-card border-2 border-dashed border-brand/50 bg-brand/5 p-4'
                  href={`${base}/rewards/scratch/${r.id}`}
                  key={String(r.id)}
                >
                  <Gift className='text-brand' />
                  <div className='flex-1'>
                    <p className='font-medium'>{tr('scratchCardWaiting')}</p>
                    <p className='text-sm text-muted'>{tr('tapToScratch')}</p>
                  </div>
                </Link>
              ) : (
                <div className='flex items-center gap-4 rounded-card border border-line bg-surface p-4' key={String(r.id)}>
                  <Gift className='text-brand' />
                  <div className='flex-1'>
                    <p className='font-medium'>{r.title}</p>
                    <p className='text-xs text-muted'>
                      {r.validTo ? tr('validTill', { date: formatIST(r.validTo, 'd MMM', tz) }) : ''}
                      {r.code ? ` · ${tr('showCode', { code: r.code })}` : ''}
                    </p>
                  </div>
                </div>
              ),
            )}
          </div>
        </>
      )}

      {myPackages.length ? (
        <>
          <h2 className='mb-3 mt-8 font-heading text-xl'>{tr('myPackages')}</h2>
          {myPackages.map((p) => (
            <div className='mb-3 rounded-card border border-line bg-surface p-4' key={p.id}>
              <p className='font-medium'>{p.package?.name}</p>
              {p.remaining.map((r, i) => (
                <p className='text-sm text-muted' key={i}>
                  {tr('leftN', { n: r.quantity, name: r.service?.name ?? '' })}
                </p>
              ))}
            </div>
          ))}
        </>
      ) : null}

      {features.has('wallet') && packages.length ? (
        <>
          <h2 className='mb-3 mt-8 font-heading text-xl'>{tr('prepaidPackages')}</h2>
          <div className='space-y-3'>
            {packages.map((p) => (
              <div
                className={cn('flex items-center justify-between gap-4 rounded-card border p-4', sp.buy === p.id ? 'border-brand' : 'border-line bg-surface')}
                key={p.id}
              >
                <div>
                  <p className='font-medium'>{p.name}</p>
                  {p.description ? <p className='text-sm text-muted'>{p.description}</p> : null}
                </div>
                <BuyPackageButton label={formatINR(p.price)} lang={tr.lang} packageId={p.id} slug={slug} />
              </div>
            ))}
          </div>
        </>
      ) : null}

      {features.has('loyalty') ? (
        <section data-testid='reward-history'>
          <h2 className='mb-3 mt-8 font-heading text-xl'>{tr('rewardHistory')}</h2>
          {pastRewards.length ? (
            <ul className='divide-y divide-line rounded-card border border-line bg-surface'>
              {pastRewards.map((r) => (
                <li className='flex items-center justify-between gap-3 px-4 py-3 text-sm' key={r.id}>
                  <span className='min-w-0'>
                    <span className='block truncate font-medium'>{r.title}</span>
                    <span className='text-xs text-muted'>{tr('earnedOn', { date: formatIST(r.createdAt, 'd MMM yyyy', tz) })}</span>
                  </span>
                  <Badge tone={r.status === 'active' ? 'success' : r.status === 'redeemed' ? 'brand' : 'muted'}>{tr.or(`st_${r.status}`, r.status)}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className='rounded-card border border-dashed border-line p-6 text-center text-sm text-muted'>{tr('noHistory')}</p>
          )}
        </section>
      ) : null}

      {features.has('wallet') ? (
        <section data-testid='wallet-history'>
          <h2 className='mb-3 mt-8 font-heading text-xl'>{tr('walletHistory')}</h2>
          {walletEntries.docs.length ? (
            <ul className='divide-y divide-line rounded-card border border-line bg-surface'>
              {walletEntries.docs.map((w) => (
                <li className='flex items-center justify-between gap-3 px-4 py-3 text-sm' key={w.id}>
                  <span>
                    <span className='block font-medium'>{tr.or(`wr_${w.reason}` as DictKey, w.reason)}</span>
                    <span className='text-xs text-muted'>{formatIST(w.createdAt, 'd MMM yyyy', tz)}</span>
                  </span>
                  <span className={cn('font-medium tabular-nums', w.amount >= 0 ? 'text-emerald-700' : 'text-ink')}>
                    {w.amount >= 0 ? '+' : '−'}
                    {formatINR(Math.abs(w.amount))}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className='rounded-card border border-dashed border-line p-6 text-center text-sm text-muted'>{tr('noHistory')}</p>
          )}
        </section>
      ) : null}
    </div>
  )
}
