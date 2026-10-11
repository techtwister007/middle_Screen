'use client'
import { Button, Input } from '@salon/ui'
import { useState, useTransition } from 'react'
import { newTrackingLink } from '@/app/(site)/studio/[salon]/actions'

export const TrackingLinkForm = ({ slug }: { slug: string }) => {
  const [label, setLabel] = useState('')
  const [source, setSource] = useState('qr')
  const [target, setTarget] = useState('/')
  const [pending, start] = useTransition()
  return (
    <div className='grid gap-2 sm:grid-cols-4'>
      <Input onChange={(e) => setLabel(e.target.value)} placeholder='Label, e.g. Café poster' value={label} />
      <select className='h-12 rounded-btn border border-line bg-surface px-3' onChange={(e) => setSource(e.target.value)} value={source}>
        {['qr', 'instagram', 'poster', 'partner', 'influencer', 'google', 'whatsapp', 'other'].map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>
      <select className='h-12 rounded-btn border border-line bg-surface px-3' onChange={(e) => setTarget(e.target.value)} value={target}>
        <option value='/'>Home</option>
        <option value='/designs'>Designs</option>
        <option value='/book'>Book</option>
        <option value='/chair'>In the chair</option>
        <option value='/care'>Aftercare</option>
        <option value='/contest'>Contest</option>
      </select>
      <Button
        disabled={!label || pending}
        onClick={() =>
          start(async () => {
            await newTrackingLink(slug, { label, source, target })
            setLabel('')
          })
        }
      >
        Create
      </Button>
    </div>
  )
}
