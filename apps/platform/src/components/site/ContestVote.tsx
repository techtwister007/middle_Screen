'use client'
import { Button } from '@salon/ui'
import { Check, Heart, Loader2 } from 'lucide-react'
import { useState, useTransition } from 'react'
import { vote } from '@/app/(site)/s/[salon]/actions'
import { type Lang, translator } from '@/lib/i18n'
import { LoginForm } from './LoginForm'

export interface ContestEntryCard {
  id: string
  title: string
  name: string
  image: string | null
  votes: number
  leading: boolean
}

/** The contest grid. One vote per customer: once cast, the other Vote buttons step aside with a clear "You voted for …". */
export const ContestEntries = ({
  slug,
  contestId,
  entries,
  votedEntry,
  loggedIn,
  salonName,
  lang,
}: {
  slug: string
  contestId: string | number
  entries: ContestEntryCard[]
  votedEntry: string | null
  loggedIn: boolean
  salonName: string
  lang: Lang
}) => {
  const tr = translator(lang)
  const [voted, setVoted] = useState<string | null>(votedEntry)
  const [counts, setCounts] = useState<Record<string, number>>(() => Object.fromEntries(entries.map((e) => [e.id, e.votes])))
  const [needLogin, setNeedLogin] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<{ id: string; message: string } | null>(null)
  const [, start] = useTransition()
  const votedFor = entries.find((e) => e.id === voted)

  const cast = (entryId: string) => {
    setBusy(entryId)
    setError(null)
    start(async () => {
      const res = await vote(slug, { contestId, entryId })
      setBusy(null)
      if (!res.ok) return setError({ id: entryId, message: res.error })
      setCounts((c) => ({ ...c, [entryId]: (c[entryId] ?? 0) + 1 }))
      setVoted(entryId)
    })
  }

  return (
    <>
      {votedFor ? (
        <p className='mt-4 flex items-center gap-2 rounded-btn bg-brand/10 px-3 py-2.5 text-sm font-medium text-brand' data-testid='you-voted' role='status'>
          <Check size={16} /> {tr('youVotedFor', { name: votedFor.title })}
        </p>
      ) : null}
      <div className='mt-5 grid grid-cols-2 gap-3'>
        {entries.map((e) => {
          const mine = voted === e.id
          return (
            <div className={mine ? 'rounded-card border-2 border-brand bg-surface p-2' : 'rounded-card border border-line bg-surface p-2'} key={e.id}>
              <div className='relative'>
                <img
                  alt={e.title}
                  className='aspect-square w-full rounded-[calc(var(--t-radius)-6px)] object-cover'
                  loading='lazy'
                  src={e.image ?? undefined}
                />
                {e.leading ? (
                  <span className='absolute left-2 top-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-ink'>{tr('leading')}</span>
                ) : null}
              </div>
              <p className='mt-2 truncate px-1 text-sm font-medium'>{e.title}</p>
              <p className='px-1 text-xs text-muted'>{e.name}</p>
              {needLogin === e.id ? (
                <div className='mt-2 rounded-card border border-line bg-surface p-3 text-left'>
                  <p className='mb-2 text-sm'>{tr('confirmToVote')}</p>
                  <LoginForm
                    lang={lang}
                    onDone={() => {
                      setNeedLogin(null)
                      cast(e.id)
                    }}
                    salonName={salonName}
                    slug={slug}
                  />
                </div>
              ) : (
                <div className='mt-2'>
                  <Button
                    aria-pressed={mine}
                    className='w-full px-2'
                    disabled={Boolean(busy) || Boolean(voted)}
                    onClick={() => (loggedIn ? cast(e.id) : setNeedLogin(e.id))}
                    variant={mine ? 'secondary' : voted ? 'ghost' : 'primary'}
                  >
                    {busy === e.id ? <Loader2 className='animate-spin' size={16} /> : <Heart fill={mine ? 'currentColor' : 'none'} size={16} />}
                    {mine ? tr('votedTick') : tr('vote')} · {counts[e.id] ?? e.votes}
                  </Button>
                  {error?.id === e.id ? <p className='mt-1 text-xs text-red-700'>{error.message}</p> : null}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
