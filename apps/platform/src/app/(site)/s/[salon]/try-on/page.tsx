import { buttonClass } from '@salon/ui'
import Link from 'next/link'
import { TryOn } from '@/components/site/TryOn'
import { mediaUrl } from '@/lib/media'
import { salonFeatures } from '@/lib/salon'
import { currentCustomer, type DesignRecord, loadSalon, repoFor, tryOnAllowance } from '@/lib/site'

export const metadata = { title: 'Try on' }

export default async function TryOnPage({ params, searchParams }: { params: Promise<{ salon: string }>; searchParams: Promise<{ design?: string }> }) {
  const { salon: slug } = await params
  const { design: designId } = await searchParams
  const salon = await loadSalon(slug)
  const customer = await currentCustomer(salon)
  const design = designId ? await (await repoFor(salon)).findByID<DesignRecord>('designs', designId, 1) : null
  const allowance = customer ? await tryOnAllowance(salon, customer.id) : { enabled: salonFeatures(salon).has('aiTryOn'), remaining: 0 }
  return (
    <div className='px-4 pt-5'>
      <h1 className='font-heading text-3xl'>Try on</h1>
      <p className='mb-5 text-sm text-muted'>Play with colours, shapes and length. Your artist will help you finalise in the salon.</p>
      <TryOn
        aiEnabled={allowance.enabled}
        aiRemaining={allowance.remaining}
        design={design ? { id: design.id, title: design.title, image: mediaUrl(design.images?.[0], 'thumb') } : null}
        loggedIn={Boolean(customer)}
        slug={slug}
      />
      <Link className={buttonClass('primary', 'lg', 'mt-6 w-full')} href={`/s/${slug}/book${design ? `?design=${design.id}` : ''}`}>
        Book this look
      </Link>
    </div>
  )
}
