'use client'
import { formatINR } from '@salon/core'
import { type DesignLike, rankByTaste, surpriseMe } from '@salon/modules/client'
import { Button, cn, Pill } from '@salon/ui'
import { Heart, Shuffle, Sparkles, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { formatDurationIn, type Lang, translator } from '@/lib/i18n'
import { SaveDesignButton } from './SaveDesignButton'

export interface GalleryItem extends DesignLike {
  id: string | number
  title: string
  image: string | null
  srcSet?: string
  priceFrom?: number | null
  durationMinutes?: number | null
  occasions?: string[] | null
  seasons?: string[] | null
  category?: string | null
  styleIds?: string[]
  colors?: string[] | null
  source?: string | null
  createdAt: string
}

export const GalleryBrowser = ({
  items,
  base,
  initialOccasion,
  showNewOnly,
  lang,
  slug,
  loggedIn,
  savedIds,
  autoSaveId,
  styles = [],
  initialStyle,
}: {
  items: GalleryItem[]
  base: string
  initialOccasion?: string
  showNewOnly?: boolean
  lang: Lang
  slug: string
  loggedIn: boolean
  savedIds: (string | number)[]
  /** Design to save right away (coming back from login after tapping its heart) */
  autoSaveId?: string
  /** The salon's styles (filter chips), in the owner's order */
  styles?: { id: string; name: string }[]
  initialStyle?: string
}) => {
  const tr = translator(lang)
  const saved = useMemo(() => new Set(savedIds.map(String)), [savedIds])
  const saveLabels = { save: tr('save'), saved: tr('saved'), unsave: tr('unsaveDesign') }
  const [occasion, setOccasion] = useState<string | null>(initialOccasion ?? null)
  const [style, setStyle] = useState<string | null>(initialStyle ?? null)
  const [budget, setBudget] = useState<number | null>(null)
  const [taste, setTaste] = useState<{ liked: DesignLike[]; skipped: DesignLike[] }>({ liked: [], skipped: [] })
  const [mode, setMode] = useState<'browse' | 'taste'>('browse')
  const [tasteIndex, setTasteIndex] = useState(0)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`taste:${base}`)
      if (saved) setTaste(JSON.parse(saved))
    } catch {}
  }, [base])
  useEffect(() => {
    try {
      localStorage.setItem(`taste:${base}`, JSON.stringify(taste))
    } catch {}
  }, [taste, base])

  const occasions = useMemo(() => {
    const list = [...new Set(items.flatMap((d) => d.occasions ?? []))]
    // A season filter from a link (e.g. ?occasion=navratri) gets its own chip.
    if (initialOccasion && !list.includes(initialOccasion)) list.unshift(initialOccasion)
    return list
  }, [items, initialOccasion])
  const visible = useMemo(() => {
    let list = items
    if (showNewOnly) list = list.filter((d) => Date.now() - new Date(d.createdAt).getTime() < 45 * 86_400_000)
    if (style) list = list.filter((d) => d.styleIds?.includes(style))
    if (occasion) list = list.filter((d) => d.occasions?.includes(occasion) || d.seasons?.includes(occasion))
    if (budget) list = surpriseMe(list, budget)
    if (taste.liked.length || taste.skipped.length) list = rankByTaste(list, taste)
    return list
  }, [items, style, occasion, budget, taste, showNewOnly])

  if (mode === 'taste') {
    const current = items[tasteIndex]
    const done = !current
    return (
      <div className='px-4 pt-4'>
        <div className='mb-4 flex items-center justify-between'>
          <p className='font-heading text-2xl'>{tr('findYourStyle')}</p>
          <button className='text-sm text-brand' onClick={() => setMode('browse')} type='button'>
            {tr('done')}
          </button>
        </div>
        {done ? (
          <div className='rounded-card bg-surface p-8 text-center'>
            <Sparkles className='mx-auto text-brand' />
            <p className='mt-3 font-heading text-xl'>{tr('galleryPersonalised')}</p>
            <Button className='mt-5' onClick={() => setMode('browse')}>
              {tr('seeMyPicks')}
            </Button>
          </div>
        ) : (
          <div>
            <div className='relative aspect-[3/4] overflow-hidden rounded-card bg-tint'>
              {current.image ? <img alt={current.title} className='h-full w-full object-cover' src={current.image} /> : null}
              <div className='absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-5 text-white'>
                <p className='font-heading text-2xl'>{current.title}</p>
                {current.priceFrom ? <p className='text-sm opacity-85'>{tr('fromPrice', { price: formatINR(current.priceFrom) })}</p> : null}
              </div>
            </div>
            <div className='mt-5 flex justify-center gap-6'>
              <button
                aria-label={tr('notForMe')}
                className='flex h-16 w-16 items-center justify-center rounded-full border border-line bg-surface text-muted shadow-sm'
                onClick={() => {
                  setTaste((t) => ({ ...t, skipped: [...t.skipped, current] }))
                  setTasteIndex((i) => i + 1)
                }}
                type='button'
              >
                <X size={28} />
              </button>
              <button
                aria-label={tr('loveIt')}
                className='flex h-16 w-16 items-center justify-center rounded-full bg-brand text-on-brand shadow-lg shadow-brand/30'
                onClick={() => {
                  setTaste((t) => ({ ...t, liked: [...t.liked, current] }))
                  setTasteIndex((i) => i + 1)
                }}
                type='button'
              >
                <Heart fill='currentColor' size={26} />
              </button>
            </div>
            <p className='mt-3 text-center text-xs text-muted'>{tr('nOfTotal', { n: tasteIndex + 1, total: items.length })}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      {styles.length ? (
        <div className='no-scrollbar flex gap-2 overflow-x-auto px-4 pt-2' role='group' aria-label={tr('styleFilter')}>
          <Pill active={!style} onClick={() => setStyle(null)}>
            {tr('allStyles')}
          </Pill>
          {styles.map((st) => (
            <Pill active={style === st.id} key={st.id} onClick={() => setStyle(style === st.id ? null : st.id)}>
              {st.name}
            </Pill>
          ))}
        </div>
      ) : null}
      <div className='no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3 pt-2' role='group' aria-label={tr('occasionFilter')}>
        <Pill active={!occasion} onClick={() => setOccasion(null)}>
          {tr('all')}
        </Pill>
        {occasions.map((o) => (
          <Pill active={occasion === o} key={o} onClick={() => setOccasion(occasion === o ? null : o)}>
            {tr.or(
              `occ_${o}`,
              tr.or(
                `fest_${o}`,
                o.replace(/^\w/, (c) => c.toUpperCase()),
              ),
            )}
          </Pill>
        ))}
      </div>
      <div className='flex gap-2 px-4 pb-4'>
        <button
          className='flex flex-1 items-center justify-center gap-2 rounded-btn border border-line bg-surface py-2.5 text-sm'
          onClick={() => {
            setMode('taste')
            setTasteIndex(0)
          }}
          type='button'
        >
          <Heart size={16} className='text-brand' /> {tr('findMyStyle')}
        </button>
        <select
          aria-label={tr('surpriseAria')}
          className='flex-1 rounded-btn border border-line bg-surface px-3 py-2.5 text-sm'
          onChange={(e) => setBudget(e.target.value ? Number(e.target.value) : null)}
          value={budget ?? ''}
        >
          <option value=''>{tr('anyBudget')}</option>
          {[100000, 150000, 200000, 300000].map((b) => (
            <option key={b} value={b}>
              {tr('surpriseWithin', { price: formatINR(b) })}
            </option>
          ))}
        </select>
      </div>
      {visible.length === 0 ? (
        <div className='px-4 py-12 text-center text-muted'>
          <Shuffle className='mx-auto mb-2' />
          {tr('noDesignsMatch')}
        </div>
      ) : (
        <div className='grid grid-cols-2 gap-x-3 gap-y-5 px-4'>
          {visible.map((d, i) => (
            <div className='relative' key={String(d.id)}>
              <Link className='group block' href={`${base}/designs/${d.id}`}>
                <div className={cn('relative overflow-hidden rounded-card bg-tint', i % 5 === 0 ? 'aspect-[3/4]' : 'aspect-square')}>
                  {d.image ? (
                    <img
                      alt={d.title}
                      className='h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]'
                      loading={i < 6 ? 'eager' : 'lazy'}
                      sizes='50vw'
                      src={d.image}
                      srcSet={d.srcSet}
                    />
                  ) : null}
                  {d.source === 'customer' ? (
                    <span className='absolute left-2 top-2 rounded-full bg-black/45 px-2 py-0.5 text-[10px] text-white'>{tr('clientPhoto')}</span>
                  ) : null}
                </div>
                <p className='mt-2 truncate text-[14px] font-medium'>{d.title}</p>
                <p className='text-xs text-muted'>
                  {d.priceFrom ? tr('fromPrice', { price: formatINR(d.priceFrom) }) : ''}
                  {d.durationMinutes ? ` · ${formatDurationIn(lang, d.durationMinutes)}` : ''}
                </p>
              </Link>
              <SaveDesignButton
                className='absolute right-2 top-2'
                designId={d.id}
                labels={saveLabels}
                loggedIn={loggedIn}
                autoSave={autoSaveId === String(d.id)}
                returnTo={`${base}/designs`}
                saved={saved.has(String(d.id))}
                slug={slug}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
