'use client'
import { cn } from '@salon/ui'
import { Heart } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { saveDesign } from '@/app/(site)/s/[salon]/actions'

/**
 * Heart that saves a design to the customer's moodboard.
 * Logged out, it sends them to log in and back with `?save=<designId>`; the page passes `autoSave` so it is saved on return.
 */
export const SaveDesignButton = ({
  slug,
  designId,
  saved: initial,
  loggedIn,
  returnTo,
  autoSave,
  labels,
  variant = 'icon',
  className,
}: {
  slug: string
  designId: string | number
  saved: boolean
  loggedIn: boolean
  /** Where to come back to after logging in (the save is applied there). */
  returnTo: string
  autoSave?: boolean
  labels: { save: string; saved: string; unsave: string }
  variant?: 'icon' | 'button'
  className?: string
}) => {
  const router = useRouter()
  const [saved, setSaved] = useState(initial)
  const [pending, start] = useTransition()
  const did = useRef(false)

  const toggle = (next: boolean) =>
    start(async () => {
      setSaved(next)
      const res = await saveDesign(slug, designId, next)
      if (!res.ok) setSaved(!next)
    })

  useEffect(() => {
    if (!autoSave || did.current || !loggedIn) return
    did.current = true
    if (!initial) toggle(true)
    // Drop ?save= so a refresh does not save again after an unsave.
    const url = new URL(window.location.href)
    url.searchParams.delete('save')
    router.replace(`${url.pathname}${url.search}`, { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSave, loggedIn])

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!loggedIn) {
      const back = `${returnTo}${returnTo.includes('?') ? '&' : '?'}save=${designId}`
      router.push(`/s/${slug}/login?next=${encodeURIComponent(back)}`)
      return
    }
    toggle(!saved)
  }

  const label = saved ? labels.unsave : labels.save
  if (variant === 'button')
    return (
      <button
        aria-label={label}
        aria-pressed={saved}
        className={cn(
          'inline-flex h-auto min-h-11 flex-col items-center justify-center gap-1 rounded-btn border py-3 text-xs font-medium transition',
          saved ? 'border-brand bg-brand/10 text-brand' : 'border-line bg-surface',
          className,
        )}
        data-testid='save-design'
        disabled={pending}
        onClick={onClick}
        type='button'
      >
        <Heart fill={saved ? 'currentColor' : 'none'} size={18} />
        {saved ? labels.saved : labels.save}
      </button>
    )
  return (
    <button
      aria-label={label}
      aria-pressed={saved}
      className={cn(
        'flex h-11 w-11 items-center justify-center rounded-full bg-white/85 shadow-sm backdrop-blur transition active:scale-90',
        saved ? 'text-brand' : 'text-ink/70',
        className,
      )}
      data-testid='save-design'
      disabled={pending}
      onClick={onClick}
      type='button'
    >
      <Heart fill={saved ? 'currentColor' : 'none'} size={18} />
    </button>
  )
}
