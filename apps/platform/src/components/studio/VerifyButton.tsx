'use client'
import { Button } from '@salon/ui'
import { useState, useTransition } from 'react'
import { verify } from '@/app/(site)/studio/[salon]/actions'

export const VerifyButton = ({ slug, taskId }: { slug: string; taskId: string | number }) => {
  const [done, setDone] = useState(false)
  const [pending, start] = useTransition()
  return (
    <Button disabled={pending || done} onClick={() => start(async () => { const r = await verify(slug, taskId); if (r.ok) setDone(true) })} size="sm" variant={done ? 'secondary' : 'primary'}>
      {done ? 'Verified ✓' : 'Verify +20 pts'}
    </Button>
  )
}
