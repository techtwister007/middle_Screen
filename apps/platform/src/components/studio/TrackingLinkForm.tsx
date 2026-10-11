'use client'
import { Button, Input, Label } from '@salon/ui'
import { useState, useTransition } from 'react'
import { newTrackingLink } from '@/app/(site)/studio/[salon]/actions'
import { SOURCE_LABEL } from './format'
import { toast } from './Toast'

const TARGETS: [string, string][] = [
  ['/', 'Home page'],
  ['/designs', 'Designs gallery'],
  ['/book', 'Booking'],
  ['/chair', 'In the chair (Wi-Fi, music)'],
  ['/care', 'Aftercare tips'],
  ['/contest', 'Nail of the month contest'],
]

export const TrackingLinkForm = ({ slug }: { slug: string }) => {
  const [label, setLabel] = useState('')
  const [source, setSource] = useState('qr')
  const [target, setTarget] = useState('/')
  const [pending, start] = useTransition()
  return (
    <form
      className='space-y-3 rounded-card border border-dashed border-brand bg-surface p-4'
      onSubmit={(e) => {
        e.preventDefault()
        start(async () => {
          const r = await newTrackingLink(slug, { label, source, target })
          if (!r.ok) return void toast({ message: r.error, tone: 'error' })
          toast({ message: `"${label}" link created`, tone: 'success' })
          setLabel('')
        })
      }}
    >
      <h3 className='font-medium'>New tracked link</h3>
      <div>
        <Label htmlFor='tl-label'>Name</Label>
        <Input id='tl-label' onChange={(e) => setLabel(e.target.value)} placeholder='e.g. Café poster, Priya’s Instagram' required value={label} />
      </div>
      <div className='grid gap-3 sm:grid-cols-2'>
        <div>
          <Label htmlFor='tl-source'>Where will people see it?</Label>
          <select
            className='h-12 w-full rounded-btn border border-line bg-surface px-3'
            id='tl-source'
            onChange={(e) => setSource(e.target.value)}
            value={source}
          >
            {Object.entries(SOURCE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor='tl-target'>Opens</Label>
          <select
            className='h-12 w-full rounded-btn border border-line bg-surface px-3'
            id='tl-target'
            onChange={(e) => setTarget(e.target.value)}
            value={target}
          >
            {TARGETS.map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>
      <Button className='w-full sm:w-auto' disabled={!label.trim() || pending} type='submit'>
        {pending ? 'Creating…' : 'Create link & QR'}
      </Button>
    </form>
  )
}
