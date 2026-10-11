'use client'
import { Button, Textarea } from '@salon/ui'
import { MessageCircle } from 'lucide-react'
import { useState, useTransition } from 'react'
import { saveNotes, setFollowUp, whatsappLink } from '@/app/(site)/studio/[salon]/actions'

export const NotesEditor = ({ slug, customerId, initial }: { slug: string; customerId: string | number; initial: string }) => {
  const [notes, setNotes] = useState(initial)
  const [saved, setSaved] = useState(false)
  const [pending, start] = useTransition()
  return (
    <div>
      <Textarea onChange={(e) => setNotes(e.target.value)} placeholder="Preferences, sensitivities, favourite artist…" rows={3} value={notes} />
      <Button className="mt-2" disabled={pending} onClick={() => start(async () => { await saveNotes(slug, customerId, notes); setSaved(true) })} size="sm" variant="secondary">
        {saved ? 'Saved ✓' : 'Save notes'}
      </Button>
    </div>
  )
}

const TEMPLATES = [
  ['refill_due', 'Refill reminder'],
  ['winback', 'We miss you'],
  ['nudge_new_designs', 'New designs'],
  ['aftercare', 'Aftercare check'],
] as const

export const MessageButtons = ({ slug, customerId, link }: { slug: string; customerId: string | number; link: string }) => {
  const [pending, start] = useTransition()
  return (
    <div className="flex flex-wrap gap-2">
      {TEMPLATES.map(([t, label]) => (
        <Button
          disabled={pending}
          key={t}
          onClick={() =>
            start(async () => {
              const r = await whatsappLink(slug, customerId, t, link)
              if (r.ok) window.open(r.data!.url, '_blank')
            })
          }
          size="sm"
          variant="secondary"
        >
          <MessageCircle size={14} /> {label}
        </Button>
      ))}
    </div>
  )
}

export const FollowUp = ({ slug, ratingId }: { slug: string; ratingId: string | number }) => {
  const [state, setState] = useState<string | null>(null)
  const [pending, start] = useTransition()
  if (state) return <p className="text-sm text-emerald-700">Marked {state} ✓</p>
  return (
    <div className="flex gap-2">
      {(['called', 'resolved'] as const).map((s) => (
        <Button disabled={pending} key={s} onClick={() => start(async () => { const r = await setFollowUp(slug, ratingId, s); if (r.ok) setState(s) })} size="sm" variant="secondary">
          Mark {s}
        </Button>
      ))}
    </div>
  )
}
