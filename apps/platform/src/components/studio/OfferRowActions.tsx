'use client'
import { Button } from '@salon/ui'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { endOffer, launch } from '@/app/(site)/studio/[salon]/actions'
import { ConfirmSheet } from './ConfirmSheet'
import { toast } from './Toast'

export const OfferRowActions = ({ slug, id, status, title }: { slug: string; id: string | number; status: string; title?: string }) => {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  if (status !== 'draft' && status !== 'live') return null
  const isDraft = status === 'draft'
  return (
    <>
      <Button disabled={pending} onClick={() => setOpen(true)} variant={isDraft ? 'primary' : 'ghost'}>
        {isDraft ? 'Launch' : 'End'}
      </Button>
      <ConfirmSheet
        confirmLabel={pending ? (isDraft ? 'Sending…' : 'Ending…') : isDraft ? 'Launch and send' : 'End offer'}
        danger={!isDraft}
        onConfirm={() =>
          start(async () => {
            const r = isDraft ? await launch(slug, id) : await endOffer(slug, id)
            if (!r.ok) return void toast({ message: r.error, tone: 'error' })
            toast({ message: isDraft ? 'Launched. Messages sent.' : 'Offer ended', tone: 'success' })
            setOpen(false)
            router.refresh()
          })
        }
        onOpenChange={setOpen}
        open={open}
        pending={pending}
        title={isDraft ? `Launch "${title ?? 'this offer'}"?` : `End "${title ?? 'this offer'}"?`}
      >
        <p className='text-muted'>
          {isDraft
            ? 'It goes out on WhatsApp to the chosen groups (customers with marketing consent; anyone who had an offer this week is skipped). Open the offer to see the audience and cost first.'
            : 'Customers can no longer claim it. Rewards already claimed stay valid.'}
        </p>
      </ConfirmSheet>
    </>
  )
}
