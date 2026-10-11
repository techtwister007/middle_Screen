import { translator } from '@/lib/i18n'
import { getLang, salonLang } from '@/lib/lang'
import { getPayloadClient } from '@/lib/payload'
import { currentCustomer, loadSalon, repoFor } from '@/lib/site'

export async function generateMetadata({ params }: { params: Promise<{ salon: string }> }) {
  const { salon: slug } = await params
  return { title: translator(await salonLang(await loadSalon(slug)))('careTitle') }
}

export default async function CarePage({ params }: { params: Promise<{ salon: string }> }) {
  const { salon: slug } = await params
  const salon = await loadSalon(slug)
  const customer = await currentCustomer(salon)
  const lang = await getLang(customer?.language)
  const tr = translator(lang)
  const payload = await getPayloadClient()
  // Platform content library (not salon data). Prefer articles in the customer's language, else English.
  const all = (
    await payload.find({
      collection: 'articles',
      overrideAccess: true,
      where: { and: [{ published: { equals: true } }, { language: { in: [...new Set([lang, 'en'])] } }] },
      limit: 60,
    })
  ).docs as unknown as {
    id: string
    slug?: string
    title: string
    summary?: string
    body: string
    kind: string
    language?: string
    serviceCategories?: string[]
  }[]
  const inLang = all.filter((a) => (a.language ?? 'en') === lang)
  const articles = lang === 'en' ? all : [...inLang, ...all.filter((a) => (a.language ?? 'en') === 'en' && !inLang.some((x) => x.slug && x.slug === a.slug))]
  let myCategories: string[] = []
  if (customer) {
    const repo = await repoFor(salon)
    const last = await repo.find<{ lines: { service?: { category?: string } | null }[] }>('visits', {
      where: { customer: { equals: customer.id } },
      sort: '-createdAt',
      limit: 1,
      depth: 2,
    })
    myCategories = (last.docs[0]?.lines ?? []).map((l) => l.service?.category ?? '').filter(Boolean)
  }
  const sorted = [...articles].sort(
    (a, b) => Number(b.serviceCategories?.some((c) => myCategories.includes(c)) ?? 0) - Number(a.serviceCategories?.some((c) => myCategories.includes(c)) ?? 0),
  )
  return (
    <div className='px-4 pt-5'>
      <h1 className='font-heading text-3xl'>{tr('careTitle')}</h1>
      <p className='text-sm text-muted'>{myCategories.length ? tr('careForLast') : tr('careIntro')}</p>
      <div className='mt-6 space-y-4'>
        {sorted.map((a) => (
          <details
            className='group rounded-card border border-line bg-surface p-4'
            key={a.id}
            open={a.serviceCategories?.some((c) => myCategories.includes(c))}
          >
            <summary className='cursor-pointer list-none'>
              <p className='text-[11px] font-semibold uppercase tracking-widest text-brand'>{tr.or(`kind_${a.kind}`, a.kind)}</p>
              <p className='mt-1 font-heading text-xl'>{a.title}</p>
              {a.summary ? <p className='mt-1 text-sm text-muted'>{a.summary}</p> : null}
            </summary>
            <div className='mt-3 whitespace-pre-line text-[15px] leading-relaxed'>{a.body}</div>
          </details>
        ))}
      </div>
    </div>
  )
}
