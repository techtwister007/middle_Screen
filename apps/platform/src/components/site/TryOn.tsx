'use client'
import { Button, cn, Pill } from '@salon/ui'
import { Camera, Loader2, Sparkles, Wand2 } from 'lucide-react'
import Link from 'next/link'
import { useState, useTransition } from 'react'
import { tryOnAi, uploadInspiration } from '@/app/(site)/s/[salon]/actions'
import { type DictKey, type Lang, translator } from '@/lib/i18n'

const SWATCHES = [
  { hex: '#B3132B', name: 'col_cherry' },
  { hex: '#F3D9D3', name: 'col_nude' },
  { hex: '#7A1E8C', name: 'col_plum' },
  { hex: '#1E2A4A', name: 'col_navy' },
  { hex: '#C9B8E8', name: 'col_lilac' },
  { hex: '#E8B7A6', name: 'col_peach' },
  { hex: '#0F3B2E', name: 'col_green' },
  { hex: '#FFE066', name: 'col_butter' },
  { hex: '#1B1B24', name: 'col_black' },
  { hex: '#F28C5B', name: 'col_coral' },
] as const
const COLORS: string[] = SWATCHES.map((s) => s.hex)
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
  lang,
}: {
  slug: string
  design?: { id: string | number; title: string; image: string | null } | null
  aiRemaining: number
  aiEnabled: boolean
  loggedIn: boolean
  lang: Lang
}) => {
  const tr = translator(lang)
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
              {tr('savedLook')}
            </div>
            <div>
              <Hand c={color} l={length} s={shape} small />
              {tr('currentLook')}
            </div>
          </div>
        ) : (
          <Hand c={color} l={length} s={shape} />
        )}
      </div>
      <div>
        <p className='mb-2 text-sm font-medium'>
          {tr('colour')}
          {SWATCHES.find((sw) => sw.hex === color) ? (
            <span className='font-normal text-muted'> · {tr(SWATCHES.find((sw) => sw.hex === color)!.name)}</span>
          ) : null}
        </p>
        <div className='flex flex-wrap gap-2'>
          {SWATCHES.map(({ hex, name }) => (
            <button
              aria-label={tr(name)}
              aria-pressed={color === hex}
              className={cn('h-11 w-11 rounded-full border-2 ring-offset-2 ring-offset-bg', color === hex ? 'border-ink ring-2 ring-ink/30' : 'border-line/60')}
              key={hex}
              onClick={() => setColor(hex)}
              style={{ background: hex }}
              title={tr(name)}
              type='button'
            />
          ))}
          <input
            aria-label={tr('customColour')}
            className='h-11 w-11 cursor-pointer rounded-full border border-line'
            onChange={(e) => setColor(e.target.value)}
            type='color'
            value={color}
          />
        </div>
      </div>
      <div>
        <p className='mb-2 text-sm font-medium'>{tr('shape')}</p>
        <div className='flex flex-wrap gap-2'>
          {(Object.keys(SHAPES) as Shape[]).map((s) => (
            <Pill active={shape === s} aria-pressed={shape === s} className='h-11' key={s} onClick={() => setShape(s)}>
              {tr(`shape_${s}` as DictKey)}
            </Pill>
          ))}
        </div>
      </div>
      <div>
        <label className='mb-2 block text-sm font-medium' htmlFor='tryon-length'>
          {tr('length')}
        </label>
        <input
          className={cn(
            'h-11 w-full cursor-pointer appearance-none bg-transparent',
            '[&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-line',
            '[&::-webkit-slider-thumb]:-mt-2.5 [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-brand [&::-webkit-slider-thumb]:shadow',
            '[&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-line',
            '[&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-brand',
          )}
          id='tryon-length'
          max={1.35}
          min={0.8}
          onChange={(e) => setLength(Number(e.target.value))}
          step={0.05}
          type='range'
          value={length}
        />
      </div>
      <Button className='w-full' onClick={() => setCompare({ color, shape, length })} variant='secondary'>
        {tr('saveToCompare')}
      </Button>

      {design && aiEnabled ? (
        <div className='rounded-card border border-line bg-surface p-4'>
          <div className='flex items-center gap-3'>
            {design.image ? <img alt='' className='h-14 w-14 rounded-xl object-cover' src={design.image} /> : null}
            <div className='flex-1'>
              <p className='flex items-center gap-1 font-medium'>
                <Wand2 className='text-brand' size={15} /> {tr('seeOnHand', { title: design.title })}
              </p>
              <p className='text-xs text-muted'>{tr('aiLeft', { n: left })}</p>
            </div>
          </div>
          {loggedIn ? (
            <div className='mt-4 space-y-3'>
              <label className='flex h-12 cursor-pointer items-center justify-center gap-2 rounded-btn border border-dashed border-line text-sm'>
                {pending && !hand ? <Loader2 className='animate-spin' size={16} /> : <Camera size={16} />}{' '}
                {hand ? tr('changeHandPhoto') : tr('uploadHandPhoto')}
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
                  {pending ? <Loader2 className='animate-spin' size={16} /> : <Sparkles size={16} />} {tr('tryItOn')}
                </Button>
              ) : null}
              {aiImage ? <img alt={tr('aiPreview')} className='w-full rounded-card' src={aiImage} /> : null}
            </div>
          ) : (
            <Link
              className='mt-3 flex min-h-11 items-center text-sm font-medium text-brand'
              href={`/s/${slug}/login?next=${encodeURIComponent(`/s/${slug}/try-on?design=${design.id}`)}`}
            >
              {tr('loginToTry')}
            </Link>
          )}
        </div>
      ) : null}
      {error ? <p className='text-sm text-red-700'>{error}</p> : null}
    </div>
  )
}
