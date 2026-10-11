import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/site/LoginForm'
import { translator } from '@/lib/i18n'
import { getLang, salonLang, salonLanguages } from '@/lib/lang'
import { currentCustomer, loadSalon } from '@/lib/site'

export async function generateMetadata({ params }: { params: Promise<{ salon: string }> }) {
  const { salon: slug } = await params
  return { title: translator(await salonLang(await loadSalon(slug)))('login') }
}

export default async function LoginPage({ params, searchParams }: { params: Promise<{ salon: string }>; searchParams: Promise<{ next?: string }> }) {
  const { salon: slug } = await params
  const { next } = await searchParams
  const salon = await loadSalon(slug)
  const target = next?.startsWith(`/s/${slug}`) ? next : `/s/${slug}`
  if (await currentCustomer(salon)) redirect(target)
  const lang = await getLang(null, salonLanguages(salon))
  const tr = translator(lang)
  return (
    <div className='px-5 pt-10'>
      <h1 className='font-heading text-3xl'>{tr('welcomeTo', { salon: salon.name })}</h1>
      <p className='mb-8 mt-2 text-muted'>{tr('loginIntro')}</p>
      <LoginForm lang={lang} next={target} salonName={salon.name} slug={slug} />
    </div>
  )
}
