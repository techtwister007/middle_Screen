import { formatPhone } from '@salon/core'
import { notFound } from 'next/navigation'
import { getSalonAnyStatus } from '@/lib/salon'

export const metadata = { title: 'Back soon', robots: { index: false } }

/** Shown instead of a paused salon's app so shared links and QR codes never hit a dead end. */
export default async function PausedPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const salon = await getSalonAnyStatus(slug)
  if (salon?.status !== 'suspended') notFound()
  const phone = salon.contact?.whatsapp ?? salon.contact?.phone
  return (
    <main className='flex min-h-dvh items-center justify-center bg-[#FBF7F4] p-6 text-center text-[#2A2024]'>
      <div className='max-w-sm'>
        <p className='text-sm uppercase tracking-widest text-[#8A7A80]'>{salon.name}</p>
        <h1 className='mt-3 font-serif text-3xl'>Online booking is taking a short break</h1>
        <p className='mt-3 text-[#6B5B61]'>The salon is still here for you. Message or call them to book.</p>
        {phone ? (
          <div className='mt-6 flex flex-col gap-3'>
            <a className='rounded-full bg-[#25D366] px-5 py-3 font-medium text-white' href={`https://wa.me/${phone.replace(/\D/g, '')}`}>
              WhatsApp {formatPhone(phone)}
            </a>
            <a className='rounded-full border border-[#E5DCD8] px-5 py-3' href={`tel:${phone}`}>
              Call
            </a>
          </div>
        ) : null}
      </div>
    </main>
  )
}
