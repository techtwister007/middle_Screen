'use client'
import { Button } from '@salon/ui'
import { Gift } from 'lucide-react'
import Link from 'next/link'
import { useState, useTransition } from 'react'
import { claimGift } from '@/app/(site)/s/[salon]/actions'
import { LoginForm } from './LoginForm'

export const GiftReveal = ({ slug, salonName, code, amount, from, message, loggedIn, status }: { slug: string; salonName: string; code: string; amount: string; from: string; message?: string | null; loggedIn: boolean; status: string }) => {
  const [opened, setOpened] = useState(false)
  const [authed, setAuthed] = useState(loggedIn)
  const [claimed, setClaimed] = useState(status === 'redeemed')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  if (!opened)
    return (
      <button className="group mx-auto block" onClick={() => setOpened(true)} type="button">
        <div className="relative mx-auto flex h-56 w-56 items-center justify-center rounded-[36px] bg-brand text-on-brand shadow-2xl shadow-brand/40 transition group-active:scale-95">
          <div className="absolute inset-x-0 top-1/2 h-6 -translate-y-1/2 bg-accent/80" />
          <div className="absolute inset-y-0 left-1/2 w-6 -translate-x-1/2 bg-accent/80" />
          <Gift className="relative" size={64} />
        </div>
        <p className="mt-6 font-heading text-2xl">Tap to open</p>
      </button>
    )
  return (
    <div className="animate-fade-up">
      <p className="text-xs font-semibold uppercase tracking-widest text-brand">A gift from {from}</p>
      <p className="mt-2 font-heading text-6xl">{amount}</p>
      <p className="mt-1 text-muted">to spend at {salonName}</p>
      {message ? <blockquote className="mx-auto mt-5 max-w-xs rounded-card bg-tint p-4 text-[15px] italic">“{message}”</blockquote> : null}
      <div className="mt-8 text-left">
        {claimed ? (
          <div className="text-center">
            <p className="mb-4 font-medium">It's in your wallet 🎉</p>
            <Link className="inline-flex h-14 w-full items-center justify-center rounded-btn bg-brand font-medium text-on-brand" href={`/s/${slug}/book`}>
              Book your treat
            </Link>
          </div>
        ) : authed ? (
          <Button
            className="w-full"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await claimGift(slug, code)
                if (!res.ok) return setError(res.error)
                setClaimed(true)
              })
            }
            size="lg"
          >
            {pending ? 'Adding…' : 'Add to my wallet'}
          </Button>
        ) : (
          <div className="rounded-card border border-line bg-surface p-4">
            <p className="mb-3 font-medium">Confirm your number to claim</p>
            <LoginForm onDone={() => setAuthed(true)} salonName={salonName} slug={slug} />
          </div>
        )}
        {error ? <p className="mt-3 text-center text-sm text-red-700">{error}</p> : null}
      </div>
    </div>
  )
}
