'use client'
import { useEffect, useState } from 'react'

export interface Slide {
  kind: 'design' | 'offer' | 'contest'
  title: string
  subtitle?: string
  image?: string | null
  qr: string
  cta: string
}

/** Full-screen loop for a TV or spare tablet: designs, offers and the contest, each with a QR. */
export const Display = ({ slides, salonName }: { slides: Slide[]; salonName: string }) => {
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
  if (!s) return null
  return (
    <div className="fixed inset-0 z-50 grid grid-cols-[3fr_2fr] bg-bg">
      <div className="relative overflow-hidden">
        {s.image ? <img alt="" className="h-full w-full object-cover transition-opacity duration-700" key={s.image} src={s.image} /> : <div className="h-full w-full bg-gradient-to-br from-brand to-accent" />}
      </div>
      <div className="flex flex-col justify-between p-12">
        <p className="font-heading text-3xl text-brand">{salonName}</p>
        <div>
          <p className="text-lg uppercase tracking-[0.3em] text-muted">{s.kind === 'design' ? 'Book this look' : s.kind === 'offer' ? 'This week' : 'Nail of the Month'}</p>
          <p className="mt-4 font-heading text-6xl leading-tight">{s.title}</p>
          {s.subtitle ? <p className="mt-4 text-2xl text-muted">{s.subtitle}</p> : null}
        </div>
        <div className="flex items-center gap-6">
          <img alt="" className="h-40 w-40 rounded-xl bg-white p-2" src={s.qr} />
          <p className="text-2xl">{s.cta}</p>
        </div>
      </div>
    </div>
  )
}
