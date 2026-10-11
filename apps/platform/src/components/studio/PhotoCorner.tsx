'use client'
import { Button, Input, Label, cn } from '@salon/ui'
import { Camera, Check, Loader2, Sun } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { finishPhotos, uploadPhoto } from '@/app/(site)/studio/[salon]/actions'

const FRAMES = [
  { key: 'classic', label: 'Classic', bg: '#FFF8F5', fg: '#B4637A' },
  { key: 'noir', label: 'Noir gold', bg: '#141012', fg: '#C9A45C' },
  { key: 'minimal', label: 'Minimal', bg: '#FFFFFF', fg: '#111111' },
  { key: 'navratri', label: 'Navratri', bg: '#3B0A45', fg: '#FFB000' },
  { key: 'diwali', label: 'Diwali', bg: '#2A0F05', fg: '#F2A93B' },
  { key: 'bridal', label: 'Bridal', bg: '#FBEFEF', fg: '#B3263E' },
]

const TIPS = ['Rest the hand flat on the branded hand-rest', 'Light from the front, no flash glare', 'Fill the frame with the nails, a little angle looks best']

export const PhotoCorner = ({ slug, taskId, customerName, initialDesign, defaultFrame }: { slug: string; taskId: string | number; customerName: string; initialDesign?: string | null; defaultFrame: string }) => {
  const router = useRouter()
  const [photos, setPhotos] = useState<{ id: string | number; url: string }[]>([])
  const [frame, setFrame] = useState(defaultFrame)
  const [design, setDesign] = useState(initialDesign ?? '')
  const [pending, start] = useTransition()
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (sent)
    return (
      <div className="rounded-card bg-emerald-500/10 p-8 text-center">
        <Check className="mx-auto text-emerald-700" size={36} />
        <p className="mt-3 font-heading text-2xl">Sent to {customerName}!</p>
        <p className="mt-1 text-sm text-muted">They got their photos with your frame, plus an Instagram story and WhatsApp Status ready to post.</p>
        <Button className="mt-5" onClick={() => router.push(`/studio/${slug}/photos`)}>
          Next photo task
        </Button>
      </div>
    )
  return (
    <div className="space-y-6">
      <ul className="space-y-1 rounded-card bg-tint p-4 text-sm">
        {TIPS.map((t) => (
          <li className="flex items-center gap-2" key={t}>
            <Sun className="text-brand" size={14} /> {t}
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((p) => (
          <img alt="" className="aspect-square w-full rounded-card object-cover" key={String(p.id)} src={p.url} />
        ))}
        <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-card border-2 border-dashed border-brand/40 bg-brand/5 text-brand">
          {pending ? <Loader2 className="animate-spin" /> : <Camera size={28} />}
          <span className="text-xs font-medium">{photos.length ? 'Another' : 'Take photo'}</span>
          <input
            accept="image/*"
            capture="environment"
            className="hidden"
            multiple
            onChange={(e) => {
              const files = [...(e.target.files ?? [])]
              start(async () => {
                for (const f of files) {
                  const fd = new FormData()
                  fd.set('file', f)
                  const res = await uploadPhoto(slug, fd)
                  if (res.ok && res.data) setPhotos((p) => [...p, res.data!])
                  else if (!res.ok) setError(res.error)
                }
              })
            }}
            type="file"
          />
        </label>
      </div>
      <div>
        <Label htmlFor="design">Design name</Label>
        <Input id="design" onChange={(e) => setDesign(e.target.value)} placeholder="e.g. Garba Glow" value={design} />
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">Frame</p>
        <div className="grid grid-cols-3 gap-2">
          {FRAMES.map((f) => (
            <button className={cn('rounded-btn border-2 p-1 text-xs', frame === f.key ? 'border-brand' : 'border-transparent')} key={f.key} onClick={() => setFrame(f.key)} type="button">
              <span className="flex h-14 flex-col items-center justify-end rounded-[8px] pb-1.5" style={{ background: f.bg, color: f.fg }}>
                <span className="mb-1 h-0.5 w-8" style={{ background: f.fg }} />
                {f.label}
              </span>
            </button>
          ))}
        </div>
      </div>
      <Button
        className="w-full"
        disabled={!photos.length || pending}
        onClick={() =>
          start(async () => {
            const res = await finishPhotos(slug, { taskId, photoIds: photos.map((p) => p.id), designName: design || undefined, frame })
            if (!res.ok) return setError(res.error)
            setSent(true)
          })
        }
        size="lg"
      >
        {pending ? 'Creating share kit…' : `Send to ${customerName}`}
      </Button>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  )
}
