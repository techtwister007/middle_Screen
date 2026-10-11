import { cityListings } from '@salon/modules'
import Link from 'next/link'
import { mediaUrl } from '@/lib/media'
import { getPayloadClient } from '@/lib/payload'

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params
  const name = decodeURIComponent(city).replace(/^\w/, (c) => c.toUpperCase())
  return { title: `Nail studios in ${name}` }
}

/** City discovery page. Only salons that opted in and have discovery switched on appear. No customer data. */
export default async function DiscoverPage({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params
  const name = decodeURIComponent(city).replace(/^\w/, (c) => c.toUpperCase())
  const payload = await getPayloadClient()
  const listings = await cityListings(payload, name)
  return (
    <div className='mx-auto max-w-2xl px-5 py-10'>
      <h1 className='font-heading text-4xl'>Nail studios in {name}</h1>
      <p className='mt-2 text-muted'>Browse real work, see prices and book online.</p>
      <div className='mt-8 space-y-3'>
        {listings.map((l) => {
          const s = l.salon as unknown as { slug: string; name: string; tagline?: string; brand?: { logo?: unknown } }
          return (
            <Link className='flex items-center gap-4 rounded-card border border-line bg-surface p-4' href={`/s/${s.slug}?src=discovery`} key={s.slug}>
              {mediaUrl(s.brand?.logo, 'thumb') ? <img alt='' className='h-14 w-14 rounded-full' src={mediaUrl(s.brand?.logo, 'thumb') ?? undefined} /> : null}
              <div>
                <p className='font-medium'>{s.name}</p>
                <p className='text-sm text-muted'>
                  {l.area ?? ''} {s.tagline ? `· ${s.tagline}` : ''}
                </p>
              </div>
            </Link>
          )
        })}
        {listings.length === 0 ? (
          <p className='rounded-card border border-dashed border-line p-8 text-center text-muted'>No studios listed in {name} yet.</p>
        ) : null}
      </div>
    </div>
  )
}
