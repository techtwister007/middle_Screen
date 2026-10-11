'use client'
import { formatINR } from '@salon/core'
import { Button, Input, Label, Textarea } from '@salon/ui'
import { Check, Copy, Gift, Send } from 'lucide-react'
import { useState, useTransition } from 'react'
import { buyGiftCard, logInvite } from '@/app/(site)/s/[salon]/actions'
import { type DictKey, type Lang, translator } from '@/lib/i18n'

export const InviteActions = ({ slug, link, message, lang }: { slug: string; link: string; message: string; lang: Lang }) => {
  const tr = translator(lang)
  const [copied, setCopied] = useState(false)
  return (
    <div className='space-y-3'>
      <a
        className='flex h-14 w-full items-center justify-center gap-2 rounded-btn bg-[#25D366] font-medium text-white'
        href={`https://wa.me/?text=${encodeURIComponent(message)}`}
        onClick={() => logInvite(slug, 'whatsapp')}
        rel='noopener'
        target='_blank'
      >
        <Send size={18} /> {tr('sendOnWhatsapp')}
      </a>
      <button
        className='flex h-12 w-full items-center justify-center gap-2 rounded-btn border border-line bg-surface text-sm'
        onClick={async () => {
          if (navigator.share) {
            try {
              await navigator.share({ text: message, url: link })
              logInvite(slug, 'link')
              return
            } catch {}
          }
          await navigator.clipboard.writeText(link)
          setCopied(true)
          logInvite(slug, 'link')
          setTimeout(() => setCopied(false), 2000)
        }}
        type='button'
      >
        {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? tr('linkCopied') : tr('shareOrCopy')}
      </button>
    </div>
  )
}

const AMOUNTS = [50000, 100000, 200000, 300000]
const OCCASIONS = ['Birthday', 'Raksha Bandhan', 'Diwali', 'Anniversary', 'Just because']

export const GiftCardForm = ({ slug, lang }: { slug: string; lang: Lang }) => {
  const tr = translator(lang)
  const [amount, setAmount] = useState(100000)
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [occasion, setOccasion] = useState('Birthday')
  const [message, setMessage] = useState('')
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  return (
    <form
      className='space-y-4'
      onSubmit={(e) => {
        e.preventDefault()
        start(async () => {
          const res = await buyGiftCard(slug, { amount, recipientPhone: phone, recipientName: name, occasion, message })
          if (!res.ok) return setError(res.error)
          window.location.href = res.data!.payUrl
        })
      }}
    >
      <div className='grid grid-cols-4 gap-2'>
        {AMOUNTS.map((a) => (
          <button
            className={`rounded-btn border py-3 text-sm ${amount === a ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface'}`}
            key={a}
            onClick={() => setAmount(a)}
            type='button'
          >
            {formatINR(a)}
          </button>
        ))}
      </div>
      <div className='flex flex-wrap gap-2'>
        {OCCASIONS.map((o) => (
          <button
            className={`rounded-full border px-3 py-1.5 text-sm ${occasion === o ? 'border-brand text-brand' : 'border-line'}`}
            key={o}
            onClick={() => setOccasion(o)}
            type='button'
          >
            {tr(`gocc_${o}` as DictKey)}
          </button>
        ))}
      </div>
      <div className='grid grid-cols-2 gap-3'>
        <div>
          <Label htmlFor='gname'>{tr('theirName')}</Label>
          <Input id='gname' onChange={(e) => setName(e.target.value)} value={name} />
        </div>
        <div>
          <Label htmlFor='gphone'>{tr('theirWhatsapp')}</Label>
          <Input id='gphone' inputMode='tel' onChange={(e) => setPhone(e.target.value)} placeholder='98765 43210' required value={phone} />
        </div>
      </div>
      <div>
        <Label htmlFor='gmsg'>{tr('message')}</Label>
        <Textarea id='gmsg' onChange={(e) => setMessage(e.target.value)} placeholder={tr('giftMsgPlaceholder')} rows={2} value={message} />
      </div>
      <Button className='w-full' disabled={pending} size='lg' type='submit'>
        <Gift size={18} /> {pending ? tr('openingPayment') : tr('payAndSend', { amount: formatINR(amount) })}
      </Button>
      {error ? <p className='text-sm text-red-700'>{error}</p> : null}
    </form>
  )
}
