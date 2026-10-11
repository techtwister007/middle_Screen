import { salonStyles, savedDesignIds } from '@salon/modules'
import { GalleryBrowser, type GalleryItem } from '@/components/site/GalleryBrowser'
import { translator } from '@/lib/i18n'
import { getLang, salonLang, salonLanguages } from '@/lib/lang'
import { mediaUrl, srcSet } from '@/lib/media'
import { getPayloadClient } from '@/lib/payload'
import { currentCustomer, designs, loadSalon } from '@/lib/site'

export async function generateMetadata({ params }: { params: Promise<{ salon: string }> }) {
  const { salon: slug } = await params
  const salon = await loadSalon(slug)
  return { title: translator(await salonLang(salon))('designs') }
}

export default async function DesignsPage({
  params,
  searchParams,
}: {
  params: Promise<{ salon: string }>
  searchParams: Promise<{ occasion?: string; new?: string; save?: string; style?: string }>
}) {
  const { salon: slug } = await params
  const sp = await searchParams
  const salon = await loadSalon(slug)
  const customer = await currentCustomer(salon)
  const lang = await getLang(customer?.language, salonLanguages(salon))
  const tr = translator(lang)
  const payload = await getPayloadClient()
  const [list, saved, styles] = await Promise.all([
    designs(salon, 300),
    customer ? savedDesignIds(payload, salon.id, customer.id) : Promise.resolve([]),
    salonStyles(payload, salon.id),
  ])
  const items: GalleryItem[] = list.map((d) => ({
    id: d.id,
    title: d.title,
    image: mediaUrl(d.images?.[0], 'card'),
    srcSet: srcSet(d.images?.[0]),
    priceFrom: d.priceFrom,
    durationMinutes: d.durationMinutes,
    occasions: d.occasions,
    seasons: d.seasons,
    category: d.category,
    styleIds: ((d as { styles?: (string | number | { id: string | number })[] | null }).styles ?? []).map((x) => String(typeof x === 'object' ? x.id : x)),
    colors: d.colors,
    featured: d.featured,
    likes: d.likes,
    source: d.source,
    createdAt: d.createdAt,
  }))
  return (
    <div className='pt-5'>
      <div className='px-4'>
        <h1 className='font-heading text-3xl'>{tr('designs')}</h1>
        <p className='text-sm text-muted'>{tr('designsIntro')}</p>
      </div>
      <div className='mt-3'>
        <GalleryBrowser
          autoSaveId={sp.save}
          base={`/s/${slug}`}
          initialOccasion={sp.occasion}
          items={items}
          lang={lang}
          loggedIn={Boolean(customer)}
          savedIds={saved}
          showNewOnly={sp.new === '1'}
          slug={slug}
          styles={styles
            // Only offer styles that have at least one design.
            .filter((st) =>
              list.some((d) =>
                ((d as { styles?: unknown[] | null }).styles ?? []).some(
                  (x) => String(typeof x === 'object' && x ? (x as { id: unknown }).id : x) === String(st.id),
                ),
              ),
            )
            .map((st) => ({ id: String(st.id), name: st.name }))}
          initialStyle={sp.style}
        />
      </div>
    </div>
  )
}
