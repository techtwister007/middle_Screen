import { GalleryBrowser, type GalleryItem } from '@/components/site/GalleryBrowser'
import { mediaUrl, srcSet } from '@/lib/media'
import { designs, loadSalon } from '@/lib/site'

export const metadata = { title: 'Designs' }

export default async function DesignsPage({
  params,
  searchParams,
}: {
  params: Promise<{ salon: string }>
  searchParams: Promise<{ occasion?: string; new?: string }>
}) {
  const { salon: slug } = await params
  const sp = await searchParams
  const salon = await loadSalon(slug)
  const list = await designs(salon, 300)
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
    colors: d.colors,
    featured: d.featured,
    likes: d.likes,
    source: d.source,
    createdAt: d.createdAt,
  }))
  return (
    <div className='pt-5'>
      <div className='px-4'>
        <h1 className='font-heading text-3xl'>Designs</h1>
        <p className='text-sm text-muted'>Real work from our artists and clients. Tap any look to see the price and book it.</p>
      </div>
      <div className='mt-3'>
        <GalleryBrowser base={`/s/${slug}`} initialOccasion={sp.occasion} items={items} showNewOnly={sp.new === '1'} />
      </div>
    </div>
  )
}
