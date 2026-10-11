import { notFound } from 'next/navigation'
import { RateForm } from '@/components/site/RateForm'
import { idOf, loadSalon, repoFor, requireCustomer } from '@/lib/site'

export const metadata = { title: 'Rate your visit' }

export default async function RatePage({ params }: { params: Promise<{ salon: string; id: string }> }) {
  const { salon: slug, id } = await params
  const salon = await loadSalon(slug)
  const customer = await requireCustomer(salon, `/s/${slug}/rate/${id}`)
  const visit = await (await repoFor(salon)).findByID<{ customer: unknown; staff?: { name: string } | null }>('visits', id, 1)
  if (!visit || String(idOf(visit.customer)) !== String(customer.id)) notFound()
  return (
    <div className='px-4 pt-10 text-center'>
      <h1 className='font-heading text-3xl'>How was your visit?</h1>
      <p className='mb-8 mt-1 text-muted'>{visit.staff ? `with ${visit.staff.name.split(' ')[0]}` : `at ${salon.name}`}</p>
      <RateForm ownerWhatsapp={salon.contact?.whatsapp} slug={slug} visitId={id} />
    </div>
  )
}
