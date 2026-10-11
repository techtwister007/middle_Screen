'use client'
import { Button, cn, Input, Label } from '@salon/ui'
import { Camera, Check, Loader2, Star, Sun, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { deletePhoto, finishPhotos, skipPhotoTask, uploadPhoto } from '@/app/(site)/studio/[salon]/actions'
import { ConfirmSheet } from './ConfirmSheet'
import { ABOVE_NAV } from './format'
import { toast } from './Toast'

const FRAMES = [
  { key: 'classic', label: 'Classic', bg: '#FFF8F5', fg: '#B4637A' },
  { key: 'noir', label: 'Noir gold', bg: '#141012', fg: '#C9A45C' },
  { key: 'minimal', label: 'Minimal', bg: '#FFFFFF', fg: '#111111' },
  { key: 'navratri', label: 'Navratri', bg: '#3B0A45', fg: '#FFB000' },
  { key: 'diwali', label: 'Diwali', bg: '#2A0F05', fg: '#F2A93B' },
  { key: 'bridal', label: 'Bridal', bg: '#FBEFEF', fg: '#B3263E' },
]

const TIPS = ['Rest the hand flat on the branded hand-rest', 'Light from the front, no flash glare', 'Fill the frame with the nails, a little angle looks best']

export const PhotoCorner = ({
  slug,
  taskId,
  customerName,
  salonName,
  initialDesign,
  defaultFrame,
  team,
  defaultArtist,
}: {
  slug: string
  taskId: string | number
  customerName: string
  salonName: string
  initialDesign?: string | null
  defaultFrame: string
  team: { id: string | number; name: string }[]
  defaultArtist: string | number | null
}) => {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [photos, setPhotos] = useState<{ id: string | number; url: string }[]>([])
  const [cover, setCover] = useState<string | number | null>(null)
  const [frame, setFrame] = useState(defaultFrame)
  const [design, setDesign] = useState(initialDesign ?? '')
  const [artist, setArtist] = useState<string | number | null>(defaultArtist)
  const [uploading, setUploading] = useState(0)
  const [pending, start] = useTransition()
  const [skipOpen, setSkipOpen] = useState(false)
  const [sent, setSent] = useState(false)
  const f = FRAMES.find((x) => x.key === frame) ?? FRAMES[0]
  const coverId = cover ?? photos[0]?.id ?? null
  const artistName = team.find((t) => String(t.id) === String(artist))?.name.split(' ')[0]

  if (sent)
    return (
      <div className='rounded-card bg-emerald-500/10 p-8 text-center'>
        <Check className='mx-auto text-emerald-700' size={36} />
        <p className='mt-3 font-heading text-2xl'>Sent to {customerName}!</p>
        <p className='mt-1 text-sm text-muted'>They got their photos with your frame, plus an Instagram story and WhatsApp Status ready to post.</p>
        <Button className='mt-5' onClick={() => router.push(`/studio/${slug}/photos`)} size='lg'>
          Next photo task
        </Button>
      </div>
    )

  const upload = async (files: File[]) => {
    setUploading((n) => n + files.length)
    for (const file of files) {
      const fd = new FormData()
      fd.set('file', file)
      const res = await uploadPhoto(slug, fd)
      setUploading((n) => n - 1)
      if (res.ok && res.data) setPhotos((p) => [...p, res.data!])
      else if (!res.ok) toast({ message: res.error, tone: 'error' })
    }
  }

  return (
    <div className='space-y-6'>
      <ul className='space-y-1 rounded-card bg-tint p-4 text-sm'>
        {TIPS.map((t) => (
          <li className='flex items-center gap-2' key={t}>
            <Sun className='shrink-0 text-brand' size={14} /> {t}
          </li>
        ))}
      </ul>

      <section>
        <div className='mb-2 flex items-center justify-between'>
          <p className='text-sm font-medium'>Shots</p>
          {photos.length > 1 ? <p className='text-xs text-muted'>Tap a photo to make it the cover</p> : null}
        </div>
        <div className='grid grid-cols-2 gap-3'>
          {photos.map((p) => {
            const isCover = String(p.id) === String(coverId)
            return (
              <div className='relative' key={String(p.id)}>
                <button
                  aria-label={isCover ? 'Cover photo' : 'Use as cover'}
                  aria-pressed={isCover}
                  className={cn('block w-full rounded-card p-1.5 pb-6 transition', isCover ? 'ring-4 ring-brand' : 'ring-1 ring-line')}
                  onClick={() => setCover(p.id)}
                  style={{ background: f.bg }}
                  type='button'
                >
                  <img alt='' className='aspect-[4/5] w-full rounded-[10px] object-cover' src={p.url} />
                  <span className='absolute inset-x-0 bottom-1 truncate text-center text-[10px] font-medium' style={{ color: f.fg }}>
                    {salonName}
                    {design ? ` · ${design}` : ''}
                    {artistName ? ` · by ${artistName}` : ''}
                  </span>
                </button>
                {isCover ? (
                  <span className='pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-brand px-2 py-1 text-xs text-on-brand'>
                    <Star size={12} /> Cover
                  </span>
                ) : null}
                <button
                  aria-label='Delete this photo'
                  className='absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white'
                  onClick={async () => {
                    setPhotos((list) => list.filter((x) => x.id !== p.id))
                    if (String(cover) === String(p.id)) setCover(null)
                    const r = await deletePhoto(slug, p.id)
                    if (!r.ok) toast({ message: r.error, tone: 'error' })
                    else toast('Photo removed')
                  }}
                  type='button'
                >
                  <Trash2 size={18} />
                </button>
              </div>
            )
          })}
          {Array.from({ length: uploading }).map((_, i) => (
            <div className='flex aspect-[4/5] items-center justify-center rounded-card bg-tint' key={`u${i}`}>
              <Loader2 className='animate-spin text-muted' />
            </div>
          ))}
          <label className='flex aspect-[4/5] cursor-pointer flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-brand/40 bg-brand/5 text-brand'>
            <Camera size={32} />
            <span className='text-sm font-medium'>{photos.length ? 'Take another' : 'Take photo'}</span>
            <input
              accept='image/*'
              capture='environment'
              className='sr-only'
              multiple
              onChange={(e) => {
                const files = [...(e.target.files ?? [])]
                e.target.value = ''
                if (files.length) void upload(files)
              }}
              ref={fileRef}
              type='file'
            />
          </label>
        </div>
      </section>

      <div>
        <Label htmlFor='design'>Design name</Label>
        <Input id='design' onChange={(e) => setDesign(e.target.value)} placeholder='e.g. Garba Glow' value={design} />
      </div>

      {team.length ? (
        <div>
          <p className='mb-2 text-sm font-medium'>Artist credit</p>
          <div className='flex flex-wrap gap-2'>
            {team.map((t) => (
              <button
                aria-pressed={String(artist) === String(t.id)}
                className={cn(
                  'min-h-11 rounded-full border px-4 text-sm',
                  String(artist) === String(t.id) ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface',
                )}
                key={String(t.id)}
                onClick={() => setArtist(t.id)}
                type='button'
              >
                {t.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <p className='mb-2 text-sm font-medium'>Frame</p>
        <div className='grid grid-cols-3 gap-2'>
          {FRAMES.map((fr) => (
            <button
              aria-pressed={frame === fr.key}
              className={cn('rounded-btn border-2 p-1 text-xs', frame === fr.key ? 'border-brand' : 'border-transparent')}
              key={fr.key}
              onClick={() => setFrame(fr.key)}
              type='button'
            >
              <span className='flex h-14 flex-col items-center justify-end rounded-[8px] pb-1.5' style={{ background: fr.bg, color: fr.fg }}>
                <span className='mb-1 h-0.5 w-8' style={{ background: fr.fg }} />
                {fr.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <button className='inline-flex min-h-11 items-center text-sm text-muted underline' onClick={() => setSkipOpen(true)} type='button'>
        Skip photos for this visit
      </button>
      <ConfirmSheet
        confirmLabel='Skip photos'
        onConfirm={() =>
          start(async () => {
            const r = await skipPhotoTask(slug, taskId)
            if (!r.ok) return void toast({ message: r.error, tone: 'error' })
            toast('Skipped. No photos for this visit.')
            router.push(`/studio/${slug}/photos`)
          })
        }
        onOpenChange={setSkipOpen}
        open={skipOpen}
        pending={pending}
        title='Skip photos?'
      >
        <p className='text-muted'>Use this when {customerName} didn't want photos or had to rush. The task leaves the list and nothing is sent.</p>
      </ConfirmSheet>

      <div className={cn('sticky z-20 -mx-4 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur', ABOVE_NAV)}>
        <Button
          className='w-full'
          disabled={!photos.length || pending || uploading > 0}
          onClick={() =>
            start(async () => {
              const ordered = [coverId, ...photos.map((p) => p.id).filter((id) => String(id) !== String(coverId))].filter((x) => x != null) as (
                | string
                | number
              )[]
              const res = await finishPhotos(slug, { taskId, photoIds: ordered, designName: design || undefined, frame, artistId: artist })
              if (!res.ok) return void toast({ message: res.error, tone: 'error' })
              setSent(true)
            })
          }
          size='lg'
        >
          {pending ? (
            <>
              <Loader2 className='animate-spin' /> Creating share kit…
            </>
          ) : uploading ? (
            'Uploading…'
          ) : photos.length ? (
            `Send to ${customerName}`
          ) : (
            'Take a photo first'
          )}
        </Button>
      </div>
    </div>
  )
}
