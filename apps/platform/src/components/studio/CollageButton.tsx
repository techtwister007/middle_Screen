'use client'
import { Button } from '@salon/ui'
import { useState, useTransition } from 'react'
import { makeCollage } from '@/app/(site)/studio/[salon]/actions'

export const CollageButton = ({ slug }: { slug: string }) => {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  return (
    <div className='flex flex-wrap items-center gap-3'>
      <Button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await makeCollage(slug)
            setError(r.ok ? null : r.error)
          })
        }
        size='sm'
      >
        {pending ? 'Making…' : "Make this week's collage"}
      </Button>
      {error ? <p className='text-sm text-muted'>{error}</p> : null}
    </div>
  )
}
