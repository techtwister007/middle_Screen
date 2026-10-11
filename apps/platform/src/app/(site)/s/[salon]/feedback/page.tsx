import { FeedbackForm } from '@/components/site/FeedbackForm'
import { translator } from '@/lib/i18n'
import { salonLang } from '@/lib/lang'
import { loadSalon } from '@/lib/site'

export async function generateMetadata({ params }: { params: Promise<{ salon: string }> }) {
  const { salon: slug } = await params
  return { title: translator(await salonLang(await loadSalon(slug)))('weMissYou') }
}

export default async function FeedbackPage({ params }: { params: Promise<{ salon: string }> }) {
  const { salon: slug } = await params
  const salon = await loadSalon(slug)
  const lang = await salonLang(salon)
  const tr = translator(lang)
  return (
    <div className='px-4 pt-8'>
      <h1 className='font-heading text-3xl'>{tr('weMissYou')}</h1>
      <p className='mb-6 mt-1 text-muted'>{tr('feedbackIntro', { salon: salon.name })}</p>
      <FeedbackForm lang={lang} slug={slug} />
    </div>
  )
}
