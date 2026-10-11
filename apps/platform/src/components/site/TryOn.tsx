'use client'
import { Button, cn, Pill } from '@salon/ui'
import { Camera, Loader2, Sparkles, Wand2 } from 'lucide-react'
import Link from 'next/link'
import { useState, useTransition } from 'react'
import { tryOnAi, uploadInspiration } from '@/app/(site)/s/[salon]/actions'

const COLORS = ['#B3132B', '#F3D9D3', '#7A1E8C', '#1E2A4A', '#C9B8E8', '#E8B7A6', '#0F3B2E', '#FFE066', '#1B1B24', '#F28C5B']
const SHAPES = { almond: 'almond', square: 'square', oval: 'oval', coffin: 'coffin' } as const
type Shape = keyof typeof SHAPES

const nailPath = (shape: Shape) => {
  switch (shape) {
    case 'square':
      return 'M-22 -40 L22 -40 L24 34 Q0 44 -24 34 Z'
    case 'oval':
      return 'M0 -44 C 26 -44, 26 -10, 24 34 Q 0 44 -24 34 C -26 -10, -26 -44, 0 -44 Z'
    case 'coffin':
      return 'M-14 -46 L14 -46 L24 34 Q0 44 -24 34 Z'
    default:
      return 'M0 -52 C 22 -42, 26 -6, 24 34 Q 0 44 -24 34 C -26 -6, -22 -42, 0 -52 Z'
  }
}

/** Free try-on on an illustrated hand, plus optional AI try-on on the customer's own photo. */
export const TryOn = ({
  slug,
  design,
  aiRemaining,
  aiEnabled,
  loggedIn,
}: {
  slug: string
  design?: { id: string | number; title: string; image: string | null } | null
  aiRemaining: number
  aiEnabled: boolean
  loggedIn: boolean
}) => {
  const [color, setColor] = useState(COLORS[0])
  const [shape, setShape] = useState<Shape>('almond')
  const [length, setLength] = useState(1)
  const [compare, setCompare] = useState<{ color: string; shape: Shape; length: number } | null>(null)
  const [hand, setHand] = useState<{ id: string | number; url: string } | null>(null)
  const [aiImage, setAiImage] = useState<string | null>(null)
  const [left, setLeft] = useState(aiRemaining)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const Hand = ({ c, s, l, small }: { c: string; s: Shape; l: number; small?: boolean }) => (
    <svg className={cn('w-full', small ? 'max-w-[160px]' : '')} viewBox='0 0 300 360'>
      <defs>
        <linearGradient id='skin' x1='0' x2='0' y1='0' y2='1'>
          <stop offset='0' stopColor='#E9B99A' />
          <stop offset='1' stopColor='#C98E6E' />
        </linearGradient>
      </defs>
      <path
        d='M60 360 C 50 280, 40 220, 52 170 L 70 110 Q 82 92 96 110 L 98 168 L 108 70 Q 120 50 134 70 L 136 160 L 146 52 Q 160 34 174 52 L 174 160 L 186 76 Q 200 60 212 78 L 208 182 L 236 140 Q 256 128 262 150 L 230 250 C 220 300, 210 340, 214 360 Z'
        fill='url(#skin)'
      />
      {[
        [83, 118, -8],
        [121, 80, -3],
        [160, 62, 0],
        [199, 88, 5],
        [249, 150, 25],
      ].map(([x, y, r], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${r}) scale(${(i === 4 ? 0.8 : 0.62) * l} ${(i === 4 ? 0.8 : 0.62) * l})`}>
          <path d={nailPath(s)} fill={c} />
          <path d='M-10 -26 Q -14 0 -10 22' fill='none' opacity='0.35' stroke='#fff' strokeLinecap='round' strokeWidth='5' />
        </g>
      ))}
    </svg>
  )

  return (
    <div className='space-y-6'>
      <div className='rounded-card bg-tint p-4'>
        {compare ? (
          <div className='grid grid-cols-2 gap-2 text-center text-xs text-muted'>
            <div>
              <Hand c={compare.color} l={compare.length} s={compare.shape} small />
              Saved look
            </div>
            <div>
              <Hand c={color} l={length} s={shape} small />
              Current
            </div>
          </div>
        ) : (
          <Hand c={color} l={length} s={shape} />
        )}
      </div>
      <div>
        <p className='mb-2 text-sm font-medium'>Colour</p>
        <div className='flex flex-wrap gap-2'>
          {COLORS.map((c) => (
            <button
              aria-label={`Colour ${c}`}
              className={cn('h-9 w-9 rounded-full border-2', color === c ? 'border-ink' : 'border-transparent')}
              key={c}
              onClick={() => setColor(c)}
              style={{ background: c }}
              type='button'
            />
          ))}
          <input
            aria-label='Custom colour'
            className='h-9 w-9 cursor-pointer rounded-full border border-line'
            onChange={(e) => setColor(e.target.value)}
            type='color'
            value={color}
          />
        </div>
      </div>
      <div>
        <p className='mb-2 text-sm font-medium'>Shape</p>
        <div className='flex flex-wrap gap-2'>
          {(Object.keys(SHAPES) as Shape[]).map((s) => (
            <Pill active={shape === s} key={s} onClick={() => setShape(s)}>
              {s}
            </Pill>
          ))}
        </div>
      </div>
      <div>
        <p className='mb-2 text-sm font-medium'>Length</p>
        <input
          className='w-full accent-[var(--t-primary)]'
          max={1.35}
          min={0.8}
          onChange={(e) => setLength(Number(e.target.value))}
          step={0.05}
          type='range'
          value={length}
        />
      </div>
      <Button className='w-full' onClick={() => setCompare({ color, shape, length })} variant='secondary'>
        Save to compare
      </Button>

      {design ? (
        <div className='rounded-card border border-line bg-surface p-4'>
          <div className='flex items-center gap-3'>
            {design.image ? <img alt='' className='h-14 w-14 rounded-xl object-cover' src={design.image} /> : null}
            <div className='flex-1'>
              <p className='flex items-center gap-1 font-medium'>
                <Wand2 size={15} className='text-brand' /> See "{design.title}" on your own hand
              </p>
              <p className='text-xs text-muted'>{aiEnabled ? `AI preview · ${left} left` : 'Coming soon at this salon'}</p>
            </div>
          </div>
          {aiEnabled ? (
            loggedIn ? (
              <div className='mt-4 space-y-3'>
                <label className='flex h-12 cursor-pointer items-center justify-center gap-2 rounded-btn border border-dashed border-line text-sm'>
                  <Camera size={16} /> {hand ? 'Change hand photo' : 'Upload a photo of your hand'}
                  <input
                    accept='image/*'
                    capture='environment'
                    className='hidden'
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (!f) return
                      const fd = new FormData()
                      fd.set('file', f)
                      fd.set('kind', 'hand')
                      start(async () => {
                        const res = await uploadInspiration(slug, fd)
                        if (res.ok && res.data) setHand(res.data)
                        else if (!res.ok) setError(res.error)
                      })
                    }}
                    type='file'
                  />
                </label>
                {hand ? (
                  <Button
                    className='w-full'
                    disabled={pending || left <= 0}
                    onClick={() =>
                      start(async () => {
                        setError(null)
                        const res = await tryOnAi(slug, { handMediaId: hand.id, designId: design.id })
                        if (!res.ok) return setError(res.error)
                        setAiImage(res.data!.imageUrl)
                        setLeft(res.data!.remaining)
                      })
                    }
                  >
                    {pending ? <Loader2 className='animate-spin' size={16} /> : <Sparkles size={16} />} Try it on
                  </Button>
                ) : null}
                {aiImage ? <img alt='AI preview' className='w-full rounded-card' src={aiImage} /> : null}
              </div>
            ) : (
              <Link
                className='mt-3 block text-sm font-medium text-brand'
                href={`/s/${slug}/login?next=${encodeURIComponent(`/s/${slug}/try-on?design=${design.id}`)}`}
              >
                Log in to try it on →
              </Link>
            )
          ) : null}
        </div>
      ) : null}
      {error ? <p className='text-sm text-red-700'>{error}</p> : null}
    </div>
  )
}
