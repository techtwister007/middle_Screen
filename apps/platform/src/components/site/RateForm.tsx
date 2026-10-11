'use client'
import { Button, Textarea } from '@salon/ui'
import { MessageCircle, Star } from 'lucide-react'
import { useState, useTransition } from 'react'
import { rate } from '@/app/(site)/s/[salon]/actions'

export const RateForm = ({ slug, visitId, ownerWhatsapp }: { slug: string; visitId: string | number; ownerWhatsapp?: string | null }) => {
  const [score, setScore] = useState(0)
  const [comment, setComment] = useState('')
  const [done, setDone] = useState<{ googleUrl: string | null } | null>(null)
  const [pending, start] = useTransition()
  if (done)
    return (
      <div className="space-y-4 text-center">
        <p className="font-heading text-2xl">{score >= 4 ? 'Thank you! 💛' : 'Thank you for telling us'}</p>
        {score <= 3 ? (
          <div className="rounded-card bg-tint p-4 text-left text-sm">
            <p>The owner has been told and will reach out. If anything needs fixing, it's free within 7 days.</p>
            {ownerWhatsapp ? (
              <a className="mt-3 inline-flex items-center gap-2 font-medium text-brand" href={`https://wa.me/${ownerWhatsapp.replace(/\D/g, '')}`} rel="noopener" target="_blank">
                <MessageCircle size={16} /> Message the owner now
              </a>
            ) : null}
          </div>
        ) : null}
        {done.googleUrl ? (
          <div className="rounded-card border border-line bg-surface p-4">
            <p className="text-sm">Would you share your experience on Google? It helps a small business a lot.</p>
            <a className="mt-3 inline-flex h-12 w-full items-center justify-center rounded-btn bg-brand font-medium text-on-brand" href={done.googleUrl} rel="noopener" target="_blank">
              Write a Google review
            </a>
          </div>
        ) : null}
      </div>
    )
  return (
    <div className="space-y-5">
      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button aria-label={`${n} stars`} className={n <= score ? 'text-accent' : 'text-line'} key={n} onClick={() => setScore(n)} type="button">
            <Star fill="currentColor" size={42} />
          </button>
        ))}
      </div>
      {score ? <Textarea onChange={(e) => setComment(e.target.value)} placeholder={score >= 4 ? 'What did you love?' : 'What could we do better?'} rows={3} value={comment} /> : null}
      <Button
        className="w-full"
        disabled={!score || pending}
        onClick={() =>
          start(async () => {
            const res = await rate(slug, { visitId, score, comment })
            if (res.ok) setDone(res.data ?? { googleUrl: null })
          })
        }
        size="lg"
      >
        {pending ? 'Sending…' : 'Send'}
      </Button>
    </div>
  )
}
