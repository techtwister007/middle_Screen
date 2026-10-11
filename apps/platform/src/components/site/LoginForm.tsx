'use client'
import { Button, Input, Label } from '@salon/ui'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { requestCode, verifyCode } from '@/app/(site)/s/[salon]/actions'
import { type Lang, translator } from '@/lib/i18n'

export const LoginForm = ({ slug, salonName, next, onDone, lang }: { slug: string; salonName: string; next?: string; onDone?: () => void; lang: Lang }) => {
  const router = useRouter()
  const tr = translator(lang)
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [phone, setPhone] = useState('')
  const [normalised, setNormalised] = useState('')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [consent, setConsent] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const sendCode = () =>
    start(async () => {
      setError(null)
      const res = await requestCode(slug, phone)
      if (!res.ok) return setError(res.error)
      setNormalised(res.data?.phone ?? phone)
      setStep('code')
    })

  const verify = () =>
    start(async () => {
      setError(null)
      const res = await verifyCode(slug, { phone: normalised, code, name, marketingConsent: consent })
      if (!res.ok) return setError(res.error)
      if (onDone) return onDone()
      router.replace(next ?? `/s/${slug}`)
      router.refresh()
    })

  return (
    <div className='space-y-5'>
      {step === 'phone' ? (
        <form
          className='space-y-4'
          onSubmit={(e) => {
            e.preventDefault()
            sendCode()
          }}
        >
          <div>
            <Label htmlFor='phone'>{tr('mobileNumber')}</Label>
            <div className='flex gap-2'>
              <span className='flex h-12 items-center rounded-btn border border-line bg-tint px-3 text-sm text-muted'>+91</span>
              <Input
                autoComplete='tel-national'
                autoFocus
                id='phone'
                inputMode='tel'
                onChange={(e) => setPhone(e.target.value)}
                placeholder='98765 43210'
                required
                value={phone}
              />
            </div>
            <p className='mt-2 text-xs text-muted'>{tr('codeOnWhatsapp')}</p>
          </div>
          <Button className='w-full' disabled={pending || phone.replace(/\D/g, '').length < 10} size='lg' type='submit'>
            {pending ? tr('sending') : tr('sendCode')}
          </Button>
        </form>
      ) : (
        <form
          className='space-y-4'
          onSubmit={(e) => {
            e.preventDefault()
            verify()
          }}
        >
          <div>
            <Label htmlFor='code'>{tr('enterCodeSentTo', { phone: normalised })}</Label>
            <Input
              autoComplete='one-time-code'
              autoFocus
              className='text-center text-2xl tracking-[0.5em]'
              id='code'
              inputMode='numeric'
              maxLength={6}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              pattern='\d{6}'
              required
              value={code}
            />
          </div>
          <div>
            <Label htmlFor='name'>{tr('yourNameOptional')}</Label>
            <Input autoComplete='given-name' id='name' onChange={(e) => setName(e.target.value)} placeholder={tr('soWeCanGreet')} value={name} />
          </div>
          <label className='flex items-start gap-3 text-sm text-muted'>
            <input checked={consent} className='mt-1 h-4 w-4 accent-[var(--t-primary)]' onChange={(e) => setConsent(e.target.checked)} type='checkbox' />
            <span>{tr('consentLogin', { salon: salonName })}</span>
          </label>
          <Button className='w-full' disabled={pending || code.length !== 6} size='lg' type='submit'>
            {pending ? tr('checking') : tr('continue')}
          </Button>
          <button className='w-full text-sm text-brand' onClick={() => setStep('phone')} type='button'>
            {tr('differentNumber')}
          </button>
        </form>
      )}
      {error ? <p className='rounded-btn bg-red-500/10 px-4 py-3 text-sm text-red-700'>{error}</p> : null}
    </div>
  )
}
