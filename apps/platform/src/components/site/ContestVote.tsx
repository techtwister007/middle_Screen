'use client'
import { Button } from '@salon/ui'
import { Heart } from 'lucide-react'
import { useState, useTransition } from 'react'
import { vote } from '@/app/(site)/s/[salon]/actions'
import { LoginForm } from './LoginForm'

export const VoteButton = ({
  slug,
  contestId,
  entryId,
  votes,
  loggedIn,
  salonName,
  voted,
}: {
  slug: string
  contestId: string | number
  entryId: string | number
  votes: number
  loggedIn: boolean
  salonName: string
  voted: boolean
}) => {
  const [count, setCount] = useState(votes)
  const [done, setDone] = useState(voted)
  const [needLogin, setNeedLogin] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const cast = () =>
    start(async () => {
      const res = await vote(slug, { contestId, entryId })
      if (!res.ok) return setError(res.error)
      setCount((c) => c + 1)
      setDone(true)
    })
  if (needLogin)
    return (
      <div className='mt-2 rounded-card border border-line bg-surface p-3 text-left'>
        <p className='mb-2 text-sm'>Confirm your number to vote (one vote per person).</p>
        <LoginForm
          onDone={() => {
            setNeedLogin(false)
            cast()
          }}
          salonName={salonName}
          slug={slug}
        />
      </div>
    )
  return (
    <div className='mt-2'>
      <Button
        className='w-full'
        disabled={pending || done}
        onClick={() => (loggedIn ? cast() : setNeedLogin(true))}
        size='sm'
        variant={done ? 'secondary' : 'primary'}
      >
        <Heart fill={done ? 'currentColor' : 'none'} size={14} /> {done ? 'Voted' : 'Vote'} · {count}
      </Button>
      {error ? <p className='mt-1 text-xs text-red-700'>{error}</p> : null}
    </div>
  )
}
