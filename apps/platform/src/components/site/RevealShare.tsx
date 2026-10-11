'use client'
import { Button } from '@salon/ui'
import { Check, Download, Send, Sparkles } from 'lucide-react'
import { useState, useTransition } from 'react'
import { enterMyNails, featureMyNails, shared } from '@/app/(site)/s/[salon]/actions'

export const RevealShare = ({
  slug,
  taskId,
  story,
  status,
  square,
  caption,
  link,
  featured,
  contestId,
}: {
  slug: string
  taskId: string | number
  story: string | null
  status: string | null
  square: string | null
  caption: string
  link: string
  featured: boolean
  contestId?: string | number | null
}) => {
  const [isFeatured, setFeatured] = useState(featured)
  const [entered, setEntered] = useState(false)
  const [, start] = useTransition()
  const shareImage = async (url: string | null, channel: string) => {
    shared(slug, taskId, channel)
    if (!url) return
    try {
      const blob = await (await fetch(url)).blob()
      const file = new File([blob], 'my-nails.jpg', { type: blob.type })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: `${caption} ${link}` })
        return
      }
    } catch {}
    window.open(url, '_blank')
  }
  return (
    <div className='space-y-3'>
      <div className='grid grid-cols-2 gap-2'>
        <Button onClick={() => shareImage(story, 'instagram')} size='lg'>
          <Sparkles size={16} /> Instagram story
        </Button>
        <Button onClick={() => shareImage(status, 'whatsapp-status')} size='lg' variant='secondary'>
          <Send size={16} /> WhatsApp Status
        </Button>
      </div>
      <a
        className='flex h-11 items-center justify-center gap-2 rounded-btn border border-line text-sm'
        download
        href={square ?? story ?? '#'}
        onClick={() => shared(slug, taskId, 'other')}
      >
        <Download size={15} /> Save square post
      </a>
      <p className='text-center text-xs text-muted'>Tag us when you post: you'll earn 20 points once we spot it.</p>
      <div className='space-y-2 pt-3'>
        <button
          className='flex w-full items-center gap-3 rounded-card border border-line bg-surface p-4 text-left'
          disabled={isFeatured}
          onClick={() =>
            start(async () => {
              const res = await featureMyNails(slug, taskId)
              if (res.ok) setFeatured(true)
            })
          }
          type='button'
        >
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full border ${isFeatured ? 'border-brand bg-brand text-on-brand' : 'border-line'}`}
          >
            {isFeatured ? <Check size={14} /> : null}
          </span>
          <span className='text-sm'>
            <span className='block font-medium'>Feature my nails in the gallery</span>
            <span className='text-muted'>Others can book your look. You can remove it anytime.</span>
          </span>
        </button>
        {contestId ? (
          <button
            className='flex w-full items-center gap-3 rounded-card border border-line bg-surface p-4 text-left'
            disabled={entered}
            onClick={() =>
              start(async () => {
                const res = await enterMyNails(slug, { contestId, taskId })
                if (res.ok) setEntered(true)
              })
            }
            type='button'
          >
            <span className={`flex h-6 w-6 items-center justify-center rounded-full border ${entered ? 'border-brand bg-brand text-on-brand' : 'border-line'}`}>
              {entered ? <Check size={14} /> : null}
            </span>
            <span className='text-sm'>
              <span className='block font-medium'>Enter Nail of the Month</span>
              <span className='text-muted'>Friends vote, the winner gets a free set.</span>
            </span>
          </button>
        ) : null}
      </div>
    </div>
  )
}
