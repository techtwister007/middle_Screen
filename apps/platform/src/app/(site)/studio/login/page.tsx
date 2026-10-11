import { StaffLoginForm } from '@/components/studio/LoginForm'

export const metadata = { title: 'Studio login' }

export default async function StudioLogin({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams
  return (
    <div className='mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6'>
      <p className='text-xs font-semibold uppercase tracking-[0.3em] text-brand'>Studio</p>
      <h1 className='mt-2 font-heading text-4xl'>Welcome back</h1>
      <p className='mb-8 mt-2 text-muted'>Sign in to see today's bookings, check customers out and run your campaigns.</p>
      <StaffLoginForm next={next ?? '/studio'} />
    </div>
  )
}
