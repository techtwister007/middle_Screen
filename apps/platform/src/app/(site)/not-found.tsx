import Link from 'next/link'

export default function NotFound() {
  return (
    <main className='flex min-h-dvh items-center justify-center bg-[#FBF7F4] p-6 text-center text-[#2A2024]'>
      <div className='max-w-sm'>
        <p className='text-sm uppercase tracking-widest text-[#8A7A80]'>404</p>
        <h1 className='mt-3 font-serif text-3xl'>We couldn't find that page</h1>
        <p className='mt-3 text-[#6B5B61]'>The link may be old or mistyped. If a salon sent it, ask them for a fresh one.</p>
        <Link className='mt-6 inline-flex min-h-11 items-center rounded-full bg-[#2A2024] px-6 text-white' href='/'>
          Go home
        </Link>
      </div>
    </main>
  )
}
