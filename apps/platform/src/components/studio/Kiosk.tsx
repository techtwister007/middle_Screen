'use client'
import { formatIST } from '@salon/core'
import { Button, Input, cn } from '@salon/ui'
import { Check } from 'lucide-react'
import { useEffect, useState, useTransition } from 'react'
import { kioskCheckIn } from '@/app/(site)/studio/[salon]/actions'

export const Kiosk = ({ slug, salonName, services, timezone, qr }: { slug: string; salonName: string; services: { id: string | number; name: string }[]; timezone: string; qr: string }) => {
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [service, setService] = useState<string | number | null>(null)
  const [consent, setConsent] = useState(true)
  const [done, setDone] = useState<{ name: string; start?: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  useEffect(() => {
    if (!done) return
    const t = setTimeout(() => {
      setDone(null)
      setPhone('')
      setName('')
      setService(null)
    }, 8000)
    return () => clearTimeout(t)
  }, [done])
  if (done)
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
        <span className="flex h-24 w-24 items-center justify-center rounded-full bg-brand text-on-brand">
          <Check size={48} />
        </span>
        <p className="mt-6 font-heading text-4xl">Welcome{done.name ? `, ${done.name.split(' ')[0]}` : ''}!</p>
        <p className="mt-2 text-lg text-muted">{done.start ? `You're booked for ${formatIST(done.start, 'h:mm a', timezone)}. Please take a seat.` : "You're on today's list. We'll call you shortly."}</p>
      </div>
    )
  return (
    <div className="grid gap-10 md:grid-cols-[1fr_280px]">
      <div className="space-y-5">
        <h1 className="font-heading text-5xl">Welcome to {salonName}</h1>
        <p className="text-lg text-muted">Check in for today in 10 seconds.</p>
        <Input className="h-16 text-2xl" inputMode="tel" onChange={(e) => setPhone(e.target.value)} placeholder="Your mobile number" value={phone} />
        <Input className="h-14 text-lg" onChange={(e) => setName(e.target.value)} placeholder="Your name" value={name} />
        <div className="grid grid-cols-2 gap-2">
          {services.map((s) => (
            <button className={cn('rounded-card border p-4 text-left text-lg', String(service) === String(s.id) ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface')} key={String(s.id)} onClick={() => setService(s.id)} type="button">
              {s.name}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-3 text-muted">
          <input checked={consent} className="h-5 w-5" onChange={(e) => setConsent(e.target.checked)} type="checkbox" /> Send me offers on WhatsApp (max one a week)
        </label>
        <Button
          className="h-16 w-full text-xl"
          disabled={pending || phone.replace(/\D/g, '').length < 10 || !service}
          onClick={() =>
            start(async () => {
              setError(null)
              const r = await kioskCheckIn(slug, { phone, name, serviceId: service!, consent })
              if (!r.ok) return setError(r.error)
              setDone(r.data!)
            })
          }
        >
          {pending ? 'Checking in…' : 'Check in'}
        </Button>
        {error ? <p className="text-red-700">{error}</p> : null}
      </div>
      <div className="rounded-card border border-line bg-surface p-6 text-center">
        <img alt="Scan to see designs" className="mx-auto w-full max-w-[220px]" src={qr} />
        <p className="mt-3 font-medium">Waiting? Scan to browse designs</p>
      </div>
    </div>
  )
}
