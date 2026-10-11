import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/site/LoginForm'
import { currentCustomer, loadSalon } from '@/lib/site'

export const metadata = { title: 'Log in' }

export default async function LoginPage({ params, searchParams }: { params: Promise<{ salon: string }>; searchParams: Promise<{ next?: string }> }) {
  const { salon: slug } = await params
  const { next } = await searchParams
  const salon = await loadSalon(slug)
  const target = next?.startsWith(`/s/${slug}`) ? next : `/s/${slug}`
  if (await currentCustomer(salon)) redirect(target)
  return (
    <div className='px-5 pt-10'>
      <h1 className='font-heading text-3xl'>Welcome to {salon.name}</h1>
      <p className='mb-8 mt-2 text-muted'>Log in with your phone to book, see your nail diary and collect rewards.</p>
      <LoginForm next={target} salonName={salon.name} slug={slug} />
    </div>
  )
}
