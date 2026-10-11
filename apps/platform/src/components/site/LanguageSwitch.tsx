'use client'
import { cn } from '@salon/ui'
import { Check, Languages, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { setLanguage } from '@/app/(site)/s/[salon]/actions'
import type { Lang } from '@/lib/i18n'

const SHORT: Record<Lang, string> = { en: 'EN', hi: 'हि', gu: 'ગુ' }

/** Keeps `<html lang>` in step with the customer's language (the root layout only knows the cookie). */
export const HtmlLang = ({ lang }: { lang: Lang }) => {
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])
  return null
}

/**
 * Compact EN / हि / ગુ switch for the header. Works logged out (sets the `lang` cookie);
 * logged in it also saves the customer's language. Only the salon's languages are offered.
 */
export const LanguageSwitch = ({
  slug,
  current,
  options,
  label,
}: {
  slug: string
  current: Lang
  options: { value: Lang; label: string }[]
  label: string
}) => {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [shown, setShown] = useState(current)
  const [pending, start] = useTransition()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => setShown(current), [current])
  useEffect(() => {
    if (!open) return
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent && e.key !== 'Escape') return
      if (e instanceof PointerEvent && ref.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  const choose = (lang: Lang) => {
    setOpen(false)
    if (lang === shown) return
    setShown(lang)
    start(async () => {
      await setLanguage(slug, lang)
      router.refresh()
    })
  }

  return (
    <div className='relative' data-testid='header-language' ref={ref}>
      <button
        aria-expanded={open}
        aria-haspopup='true'
        aria-label={label}
        className='inline-flex h-11 min-w-11 items-center justify-center gap-1 rounded-btn px-2 text-sm font-medium text-ink/80'
        onClick={() => setOpen((o) => !o)}
        type='button'
      >
        {pending ? <Loader2 className='animate-spin' size={16} /> : <Languages size={16} />}
        <span lang={shown}>{SHORT[shown]}</span>
      </button>
      {open ? (
        <div className='absolute right-0 top-12 z-40 w-44 overflow-hidden rounded-card border border-line bg-surface py-1 shadow-lg' role='group'>
          {options.map((o) => (
            <button
              aria-pressed={o.value === shown}
              className={cn('flex h-11 w-full items-center justify-between px-4 text-left text-[15px]', o.value === shown ? 'font-semibold text-brand' : '')}
              key={o.value}
              lang={o.value}
              onClick={() => choose(o.value)}
              type='button'
            >
              {o.label}
              {o.value === shown ? <Check size={16} /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
