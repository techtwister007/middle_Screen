import { formatINR } from '@salon/core'
import { formatDuration } from '@salon/modules/client'
import { buttonClass } from '@salon/ui'
import Link from 'next/link'
import { loadSalon, repoFor, services } from '@/lib/site'

export const metadata = { title: 'Menu & prices' }

const LABELS: Record<string, string> = {
  gel: 'Gel',
  extensions: 'Extensions',
  refill: 'Refills',
  manicure: 'Manicure',
  pedicure: 'Pedicure',
  bridal: 'Bridal',
  removal: 'Removal',
  'add-on': 'Add-ons',
  lashes: 'Lashes',
  brows: 'Brows',
  'nail-art': 'Nail art',
  other: 'Other',
}

export default async function MenuPage({ params }: { params: Promise<{ salon: string }> }) {
  const { salon: slug } = await params
  const salon = await loadSalon(slug)
  const list = await services(salon)
  const repo = await repoFor(salon)
  const packages = (
    await repo.find<{ id: string; name: string; description?: string; price: number; creditValue?: number; kind: string }>('packages', {
      where: { active: { equals: true } },
    })
  ).docs
  const groups = new Map<string, typeof list>()
  for (const s of list) groups.set(s.category, [...(groups.get(s.category) ?? []), s])
  const base = `/s/${slug}`
  return (
    <div className='px-4 pt-5'>
      <h1 className='font-heading text-3xl'>Menu & prices</h1>
      <p className='text-sm text-muted'>Every price includes prep and a cuticle tidy-up. No surprises at the counter.</p>
      {[...groups.entries()].map(([cat, items]) => (
        <section className='mt-7' key={cat}>
          <h2 className='mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand'>{LABELS[cat] ?? cat}</h2>
          <div className='divide-y divide-line overflow-hidden rounded-card border border-line bg-surface'>
            {items.map((s) => (
              <Link className='flex items-start justify-between gap-4 px-4 py-4' href={`${base}/book?service=${s.id}`} key={String(s.id)}>
                <div>
                  <p className='font-medium'>{s.name}</p>
                  {s.description ? <p className='mt-0.5 text-sm text-muted'>{s.description}</p> : null}
                  <p className='mt-1 text-xs text-muted'>
                    {formatDuration(s.durationMinutes)}
                    {s.lastsDays ? ` · lasts ~${Math.round(s.lastsDays / 7)} weeks` : ''}
                  </p>
                </div>
                <span className='font-heading text-lg tabular-nums'>
                  {s.isAddOn ? '+' : ''}
                  {formatINR(s.price)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}
      {packages.length ? (
        <section className='mt-8'>
          <h2 className='mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand'>Packages</h2>
          <div className='space-y-3'>
            {packages.map((p) => (
              <div className='rounded-card bg-brand p-5 text-on-brand' key={p.id}>
                <p className='font-heading text-xl'>{p.name}</p>
                {p.description ? <p className='mt-1 text-sm opacity-85'>{p.description}</p> : null}
                <div className='mt-4 flex items-center justify-between'>
                  <span className='font-heading text-2xl'>{formatINR(p.price)}</span>
                  <Link className={buttonClass('secondary', 'sm')} href={`${base}/rewards?buy=${p.id}`}>
                    Buy
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
