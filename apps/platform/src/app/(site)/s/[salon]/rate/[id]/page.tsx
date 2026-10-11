import { notFound } from 'next/navigation'
import { RateForm } from '@/components/site/RateForm'
import { translator } from '@/lib/i18n'
import { getLang, salonLang } from '@/lib/lang'
import { idOf, loadSalon, repoFor, requireCustomer } from '@/lib/site'

export async function generateMetadata({ params }: { params: Promise<{ salon: string }> }) {
  const { salon: slug } = await params
  return { title: translator(await salonLang(await loadSalon(slug)))('howWasVisit') }
}

export default async function RatePage({ params }: { params: Promise<{ salon: string; id: string }> }) {
  const { salon: slug, id } = await params
  const salon = await loadSalon(slug)
  const customer = await requireCustomer(salon, `/s/${slug}/rate/${id}`)
  const lang = await getLang(customer.language)
  const tr = translator(lang)
  const visit = await (await repoFor(salon)).findByID<{ customer: unknown; staff?: { name: string } | null }>('visits', id, 1)
  if (!visit || String(idOf(visit.customer)) !== String(customer.id)) notFound()
  return (
    <div className='px-4 pt-10 text-center'>
      <h1 className='font-heading text-3xl'>{tr('howWasVisit')}</h1>
      <p className='mb-8 mt-1 text-muted'>{visit.staff ? tr('withName', { name: visit.staff.name.split(' ')[0] }) : tr('atSalon', { salon: salon.name })}</p>
      <RateForm lang={lang} ownerWhatsapp={salon.contact?.whatsapp} slug={slug} visitId={id} />
    </div>
  )
}
