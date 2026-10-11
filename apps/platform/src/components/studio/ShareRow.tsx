'use client'
import { Button } from '@salon/ui'
import { ImageOff } from 'lucide-react'
import { useState, useTransition } from 'react'
import { notPosted, verify } from '@/app/(site)/studio/[salon]/actions'
import { CHANNEL_LABEL } from './format'
import { toast } from './Toast'

const howToCheck = (channels: string[]) => {
  if (channels.includes('instagram')) return 'Open Instagram and look for the salon tag in their story or post.'
  if (channels.includes('whatsapp-status')) return 'Check their WhatsApp Status from the salon phone (you must be in their contacts).'
  if (channels.includes('whatsapp')) return 'Ask them to show the chat where they forwarded it.'
  return 'Ask them to show you the post.'
}

/** One customer who says they shared their photos. Verify gives points; "Not posted" sends it back. Either way the row leaves the list. */
export const ShareRow = ({
  slug,
  taskId,
  name,
  thumb,
  channels,
}: {
  slug: string
  taskId: string | number
  name: string
  thumb: string | null
  channels: string[]
}) => {
  const [gone, setGone] = useState<null | string>(null)
  const [pending, start] = useTransition()
  if (gone) return null
  const where = channels.map((c) => CHANNEL_LABEL[c] ?? c).join(' and ') || 'social media'
  const act = (fn: typeof verify, msg: string) =>
    start(async () => {
      const r = await fn(slug, taskId)
      if (!r.ok) return void toast({ message: r.error, tone: 'error' })
      setGone(msg)
      toast({ message: msg, tone: 'success' })
    })
  return (
    <div className='rounded-card border border-line bg-surface p-3' data-testid='share-row'>
      <div className='flex gap-3'>
        {thumb ? (
          <img alt='' className='h-16 w-16 shrink-0 rounded-xl object-cover' src={thumb} />
        ) : (
          <span className='flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-tint text-muted'>
            <ImageOff size={20} />
          </span>
        )}
        <div className='min-w-0 flex-1'>
          <p className='font-medium'>{name}</p>
          <p className='text-sm'>Says they shared on {where}</p>
          <p className='text-xs text-muted'>{howToCheck(channels)}</p>
        </div>
      </div>
      <div className='mt-3 grid grid-cols-2 gap-2'>
        <Button disabled={pending} onClick={() => act(notPosted, `${name.split(' ')[0]}: marked not posted`)} variant='secondary'>
          Not posted
        </Button>
        <Button disabled={pending} onClick={() => act(verify, `${name.split(' ')[0]} verified · +20 points`)}>
          Verify +20 pts
        </Button>
      </div>
    </div>
  )
}
