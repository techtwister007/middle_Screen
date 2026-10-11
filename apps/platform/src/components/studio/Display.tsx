'use client'
import { useEffect, useState } from 'react'
import { ExitHold } from './ExitHold'

export interface Slide {
  kind: 'design' | 'offer' | 'contest'
  title: string
  subtitle?: string
  image?: string | null
  qr: string
  cta: string
}

/** Full-screen loop for a TV or spare tablet: designs, offers and the contest, each with a QR. */
export const Display = ({ slides, salonName, exitHref }: { slides: Slide[]; salonName: string; exitHref: string }) => {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % slides.length), 8000)
    const reload = setTimeout(() => window.location.reload(), 30 * 60 * 1000)
    return () => {
      clearInterval(t)
      clearTimeout(reload)
    }
  }, [slides.length])
  const s = slides[i]
  if (!s)
    return (
      <div className='flex min-h-dvh flex-col items-center justify-center gap-4 p-8 text-center'>
        <p className='font-heading text-3xl'>{salonName}</p>
        <p className='text-muted'>Add designs to your gallery to show them here.</p>
        <ExitHold href={exitHref} />
      </div>
    )
  return (
    <div className='fixed inset-0 z-50 grid grid-rows-[minmax(0,1fr)_auto] bg-bg md:grid-cols-[3fr_2fr] md:grid-rows-1'>
      <ExitHold className='absolute right-3 top-3 z-10 bg-bg/60' href={exitHref} />
      <div className='relative overflow-hidden'>
        {s.image ? (
          <img alt='' className='h-full w-full object-cover transition-opacity duration-700' key={s.image} src={s.image} />
        ) : (
          <div className='h-full w-full bg-gradient-to-br from-brand to-accent' />
        )}
      </div>
      <div className='flex flex-col justify-between gap-4 p-6 md:p-12'>
        <p className='font-heading text-2xl text-brand md:text-3xl'>{salonName}</p>
        <div>
          <p className='text-sm uppercase tracking-[0.3em] text-muted md:text-lg'>
            {s.kind === 'design' ? 'Book this look' : s.kind === 'offer' ? 'This week' : 'Nail of the Month'}
          </p>
          <p className='mt-2 font-heading text-3xl leading-tight md:mt-4 md:text-6xl'>{s.title}</p>
          {s.subtitle ? <p className='mt-2 text-lg text-muted md:mt-4 md:text-2xl'>{s.subtitle}</p> : null}
        </div>
        <div className='flex items-center gap-6'>
          <img alt='' className='h-28 w-28 rounded-xl bg-white p-2 md:h-40 md:w-40' src={s.qr} />
          <p className='text-lg md:text-2xl'>{s.cta}</p>
        </div>
      </div>
    </div>
  )
}
