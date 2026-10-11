'use client'
import { Button, Textarea } from '@salon/ui'
import { MessageCircle, Star } from 'lucide-react'
import { useState, useTransition } from 'react'
import { rate } from '@/app/(site)/s/[salon]/actions'
import { type Lang, translator } from '@/lib/i18n'

export const RateForm = ({ slug, visitId, ownerWhatsapp, lang }: { slug: string; visitId: string | number; ownerWhatsapp?: string | null; lang: Lang }) => {
  const tr = translator(lang)
  const [score, setScore] = useState(0)
  const [comment, setComment] = useState('')
  const [done, setDone] = useState<{ googleUrl: string | null } | null>(null)
  const [pending, start] = useTransition()
  if (done)
    return (
      <div className='space-y-4 text-center'>
        <p className='font-heading text-2xl'>{score >= 4 ? tr('thankYouHeart') : tr('thanksTelling')}</p>
        {score <= 3 ? (
          <div className='rounded-card bg-tint p-4 text-left text-sm'>
            <p>{tr('ownerTold')}</p>
            {ownerWhatsapp ? (
              <a
                className='mt-3 inline-flex items-center gap-2 font-medium text-brand'
                href={`https://wa.me/${ownerWhatsapp.replace(/\D/g, '')}`}
                rel='noopener'
                target='_blank'
              >
                <MessageCircle size={16} /> {tr('messageOwner')}
              </a>
            ) : null}
          </div>
        ) : null}
        {done.googleUrl ? (
          <div className='rounded-card border border-line bg-surface p-4'>
            <p className='text-sm'>{tr('googleAsk')}</p>
            <a
              className='mt-3 inline-flex h-12 w-full items-center justify-center rounded-btn bg-brand font-medium text-on-brand'
              href={done.googleUrl}
              rel='noopener'
              target='_blank'
            >
              {tr('writeGoogle')}
            </a>
          </div>
        ) : null}
      </div>
    )
  return (
    <div className='space-y-5'>
      <div className='flex justify-center gap-2'>
        {[1, 2, 3, 4, 5].map((n) => (
          <button aria-label={tr('starsN', { n })} className={n <= score ? 'text-accent' : 'text-line'} key={n} onClick={() => setScore(n)} type='button'>
            <Star fill='currentColor' size={42} />
          </button>
        ))}
      </div>
      {score ? (
        <Textarea onChange={(e) => setComment(e.target.value)} placeholder={score >= 4 ? tr('whatLoved') : tr('whatBetter')} rows={3} value={comment} />
      ) : null}
      <Button
        className='w-full'
        disabled={!score || pending}
        onClick={() =>
          start(async () => {
            const res = await rate(slug, { visitId, score, comment })
            if (res.ok) setDone(res.data ?? { googleUrl: null })
          })
        }
        size='lg'
      >
        {pending ? tr('sending') : tr('send')}
      </Button>
    </div>
  )
}
