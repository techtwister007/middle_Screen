import { formatINR } from '@salon/core'
import { buttonClass } from '@salon/ui'
import Link from 'next/link'
import { formatDurationIn, translator } from '@/lib/i18n'
import { salonLang } from '@/lib/lang'
import { salonFeatures } from '@/lib/salon'
import { loadSalon, repoFor, services } from '@/lib/site'

export async function generateMetadata({ params }: { params: Promise<{ salon: string }> }) {
  const { salon: slug } = await params
  return { title: translator(await salonLang(await loadSalon(slug)))('menu') }
}

export default async function MenuPage({ params }: { params: Promise<{ salon: string }> }) {
  const { salon: slug } = await params
  const salon = await loadSalon(slug)
  const lang = await salonLang(salon)
  const tr = translator(lang)
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
      <h1 className='font-heading text-3xl'>{tr('menu')}</h1>
      <p className='text-sm text-muted'>{tr('menuIntro')}</p>
      {[...groups.entries()].map(([cat, items]) => (
        <section className='mt-7' key={cat}>
          <h2 className='mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand'>{tr.or(`cat_${cat}`, cat)}</h2>
          <div className='divide-y divide-line overflow-hidden rounded-card border border-line bg-surface'>
            {items.map((s) => (
              <Link className='flex items-start justify-between gap-4 px-4 py-4' href={`${base}/book?service=${s.id}`} key={String(s.id)}>
                <div>
                  <p className='font-medium'>{s.name}</p>
                  {s.description ? <p className='mt-0.5 text-sm text-muted'>{s.description}</p> : null}
                  <p className='mt-1 text-xs text-muted'>
                    {formatDurationIn(lang, s.durationMinutes)}
                    {s.lastsDays ? ` · ${tr('lastsWeeksShort', { n: Math.round(s.lastsDays / 7) })}` : ''}
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
      {packages.length && salonFeatures(salon).has('wallet') ? (
        <section className='mt-8'>
          <h2 className='mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand'>{tr('packages')}</h2>
          <div className='space-y-3'>
            {packages.map((p) => (
              <div className='rounded-card bg-brand p-5 text-on-brand' key={p.id}>
                <p className='font-heading text-xl'>{p.name}</p>
                {p.description ? <p className='mt-1 text-sm opacity-85'>{p.description}</p> : null}
                <div className='mt-4 flex items-center justify-between'>
                  <span className='font-heading text-2xl'>{formatINR(p.price)}</span>
                  <Link className={buttonClass('secondary', 'sm')} href={`${base}/rewards?buy=${p.id}`}>
                    {tr('buy')}
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
