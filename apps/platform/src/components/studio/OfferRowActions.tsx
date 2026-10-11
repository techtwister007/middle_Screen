'use client'
import { Button } from '@salon/ui'
import { useTransition } from 'react'
import { endOffer, launch } from '@/app/(site)/studio/[salon]/actions'

export const OfferRowActions = ({ slug, id, status }: { slug: string; id: string | number; status: string }) => {
  const [pending, start] = useTransition()
  if (status === 'draft')
    return (
      <Button disabled={pending} onClick={() => start(async () => void (await launch(slug, id)))} size="sm">
        Launch
      </Button>
    )
  if (status === 'live')
    return (
      <Button disabled={pending} onClick={() => start(async () => void (await endOffer(slug, id)))} size="sm" variant="ghost">
        End
      </Button>
    )
  return null
}
