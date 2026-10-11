'use client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/** Demo salons only: polls a small version signal and refreshes when the presenter changes theme or language. */
export const DemoLiveRefresh = ({ slug, every = 4000 }: { slug: string; every?: number }) => {
  const router = useRouter()
  useEffect(() => {
    let last: string | null = null
    let stopped = false
    const tick = async () => {
      if (document.hidden) return
      try {
        const res = await fetch(`/s/${slug}/live`, { cache: 'no-store' })
        if (!res.ok) return
        const { v } = (await res.json()) as { v: string }
        if (stopped) return
        if (last !== null && v !== last) router.refresh()
        last = v
      } catch {}
    }
    tick()
    const id = window.setInterval(tick, every)
    return () => {
      stopped = true
      window.clearInterval(id)
    }
  }, [slug, every, router])
  return null
}
