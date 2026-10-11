'use client'
import { formatIST } from '@salon/core'
import { Button, cn, Input } from '@salon/ui'
import { Check } from 'lucide-react'
import { useEffect, useState, useTransition } from 'react'
import { kioskCheckIn } from '@/app/(site)/studio/[salon]/actions'
import { ExitHold } from './ExitHold'

export const Kiosk = ({
  slug,
  salonName,
  services,
  timezone,
  qr,
}: {
  slug: string
  salonName: string
  services: { id: string | number; name: string }[]
  timezone: string
  qr: string
}) => {
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
  const shell = (body: React.ReactNode) => (
    <div className='relative min-h-dvh bg-bg px-5 py-6 sm:px-10 sm:py-10'>
      <ExitHold className='absolute right-3 top-3' href={`/studio/${slug}/settings`} />
      {body}
    </div>
  )
  if (done)
    return shell(
      <div className='flex min-h-[80vh] flex-col items-center justify-center text-center'>
        <span className='flex h-24 w-24 items-center justify-center rounded-full bg-brand text-on-brand'>
          <Check size={48} />
        </span>
        <p className='mt-6 font-heading text-4xl'>Welcome{done.name ? `, ${done.name.split(' ')[0]}` : ''}!</p>
        <p className='mt-2 text-lg text-muted'>
          {done.start
            ? `You're booked for ${formatIST(done.start, 'h:mm a', timezone)}. Please take a seat.`
            : "You're on today's list. We'll call you shortly."}
        </p>
      </div>,
    )
  return shell(
    <div className='mx-auto grid max-w-5xl gap-8 lg:grid-cols-[minmax(0,1fr)_300px]'>
      <div className='min-w-0 space-y-5'>
        <h1 className='pr-28 font-heading text-4xl sm:text-5xl'>Welcome to {salonName}</h1>
        <p className='text-lg text-muted'>Check in for today in 10 seconds.</p>
        <Input
          aria-label='Your mobile number'
          className='h-16 text-2xl placeholder:text-xl'
          inputMode='tel'
          onChange={(e) => setPhone(e.target.value)}
          placeholder='Mobile number'
          value={phone}
        />
        <Input aria-label='Your name' className='h-14 text-lg' onChange={(e) => setName(e.target.value)} placeholder='Your name' value={name} />
        <div className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
          {services.map((s) => (
            <button
              aria-pressed={String(service) === String(s.id)}
              className={cn(
                'min-h-20 min-w-0 rounded-card border p-4 text-left text-lg leading-snug break-words hyphens-auto',
                String(service) === String(s.id) ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface',
              )}
              key={String(s.id)}
              lang='en'
              onClick={() => setService(s.id)}
              type='button'
            >
              {s.name}
            </button>
          ))}
        </div>
        <label className='flex min-h-12 items-center gap-3 text-muted'>
          <input checked={consent} className='h-6 w-6 shrink-0' onChange={(e) => setConsent(e.target.checked)} type='checkbox' /> Send me offers on WhatsApp
          (max one a week)
        </label>
        <Button
          className='h-16 w-full text-xl'
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
        {error ? <p className='text-red-700'>{error}</p> : null}
      </div>
      <div className='hidden rounded-card border border-line bg-surface p-6 text-center sm:block lg:self-start'>
        <img alt='Scan to see designs' className='mx-auto w-full max-w-[220px]' src={qr} />
        <p className='mt-3 font-medium'>Waiting? Scan to browse designs</p>
      </div>
    </div>,
  )
}
