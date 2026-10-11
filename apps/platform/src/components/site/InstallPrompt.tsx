'use client'
import { Button } from '@salon/ui'
import { Share, Smartphone, X } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

declare global {
  interface Window {
    __installPrompt?: BeforeInstallPromptEvent | null
  }
}

interface Labels {
  title: string
  body: string
  install: string
  notNow: string
  iosHint: string
  genericHint: string
  installed: string
  close: string
}

const DISMISS_DAYS = 14
const SHOW_AFTER_MS = 12_000

const readDismissed = (key: string) => {
  try {
    const at = Number(localStorage.getItem(key) ?? 0)
    return at > 0 && Date.now() - at < DISMISS_DAYS * 86_400_000
  } catch {
    return false
  }
}

const Inner = ({ slug, labels, logo }: { slug: string; labels: Labels; logo?: string | null }) => {
  const params = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const forced = params.get('install') === '1'
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [env, setEnv] = useState<{ ios: boolean; standalone: boolean } | null>(null)
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'banner' | 'sheet'>('banner')
  const key = `install-dismissed:${slug}`

  useEffect(() => {
    const ua = navigator.userAgent
    const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
    setEnv({ ios, standalone })
    if (window.__installPrompt) setDeferred(window.__installPrompt)
    const ready = () => setDeferred(window.__installPrompt ?? null)
    const installed = () => {
      window.__installPrompt = null
      setDeferred(null)
      setOpen(false)
    }
    window.addEventListener('installprompt:ready', ready)
    window.addEventListener('appinstalled', installed)
    return () => {
      window.removeEventListener('installprompt:ready', ready)
      window.removeEventListener('appinstalled', installed)
    }
  }, [])

  // ?install=1 (e.g. from the in-chair page) opens the prompt or the right hint straight away.
  useEffect(() => {
    if (!forced || !env) return
    setMode('sheet')
    setOpen(true)
    const next = new URLSearchParams(params.toString())
    next.delete('install')
    const qs = next.toString()
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
  }, [forced, env, params, pathname, router])

  // Otherwise a small, dismissible banner after a while, only where installing is possible.
  useEffect(() => {
    if (!env || env.standalone || open || forced) return
    if (!deferred && !env.ios) return
    if (pathname?.includes('/chair') || pathname?.includes('/login') || pathname?.includes('/book')) return
    if (readDismissed(key)) return
    const timer = setTimeout(() => {
      setMode('banner')
      setOpen(true)
    }, SHOW_AFTER_MS)
    return () => clearTimeout(timer)
  }, [env, deferred, open, forced, pathname, key])

  const dismiss = useCallback(() => {
    setOpen(false)
    try {
      localStorage.setItem(key, String(Date.now()))
    } catch {}
  }, [key])

  const install = async () => {
    if (!deferred) return
    await deferred.prompt()
    const choice = await deferred.userChoice.catch(() => null)
    window.__installPrompt = null
    setDeferred(null)
    if (choice?.outcome === 'accepted') setOpen(false)
    else dismiss()
  }

  if (!open || !env) return null

  const hint = env.standalone ? labels.installed : deferred ? labels.body : env.ios ? labels.iosHint : labels.genericHint
  const action =
    !env.standalone && deferred ? (
      <Button onClick={install} size='sm'>
        {labels.install}
      </Button>
    ) : null

  if (mode === 'banner')
    return (
      <div className='fixed inset-x-0 bottom-24 z-40 px-3' data-testid='install-banner' role='dialog'>
        <div className='mx-auto flex max-w-lg items-center gap-3 rounded-card border border-line bg-surface p-3 shadow-lg'>
          {logo ? (
            <img alt='' className='h-10 w-10 shrink-0 rounded-xl object-cover' src={logo} />
          ) : (
            <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-on-brand'>
              <Smartphone size={18} />
            </span>
          )}
          <div className='min-w-0 flex-1'>
            <p className='truncate text-sm font-medium'>{labels.title}</p>
            <p className='text-xs text-muted'>
              {env.ios && !deferred ? <Share className='mr-1 inline' size={12} /> : null}
              {hint}
            </p>
          </div>
          {action}
          <button aria-label={labels.notNow} className='p-1 text-muted' onClick={dismiss} type='button'>
            <X size={18} />
          </button>
        </div>
      </div>
    )

  return (
    <div className='fixed inset-0 z-50 flex items-end justify-center bg-black/40' data-testid='install-sheet' role='dialog'>
      <button aria-label={labels.close} className='absolute inset-0 cursor-default' onClick={() => setOpen(false)} type='button' />
      <div className='relative w-full max-w-lg rounded-t-[28px] bg-surface p-6 pb-10 text-center'>
        {logo ? (
          <img alt='' className='mx-auto h-16 w-16 rounded-2xl object-cover' src={logo} />
        ) : (
          <span className='mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-on-brand'>
            <Smartphone size={26} />
          </span>
        )}
        <p className='mt-4 font-heading text-2xl'>{labels.title}</p>
        <p className='mx-auto mt-2 max-w-xs text-sm text-muted'>
          {env.ios && !deferred && !env.standalone ? <Share className='mr-1 inline' size={14} /> : null}
          {hint}
        </p>
        <div className='mt-6 flex justify-center gap-3'>
          {action ? (
            <Button onClick={install} size='lg'>
              {labels.install}
            </Button>
          ) : null}
          <Button onClick={action ? dismiss : () => setOpen(false)} size='lg' variant='secondary'>
            {action ? labels.notNow : labels.close}
          </Button>
        </div>
      </div>
    </div>
  )
}

/** Install banner (Android/Chrome `beforeinstallprompt`) and an "Add to Home Screen" hint for iOS. `?install=1` opens it. */
export const InstallPrompt = (props: { slug: string; labels: Labels; logo?: string | null }) => (
  <Suspense fallback={null}>
    <Inner {...props} />
  </Suspense>
)
