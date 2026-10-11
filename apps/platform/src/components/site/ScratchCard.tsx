'use client'
import { useEffect, useRef, useState, useTransition } from 'react'
import { scratch } from '@/app/(site)/s/[salon]/actions'

/** A real scratch card: drag a finger to reveal the reward underneath. */
export const ScratchCard = ({
  slug,
  rewardId,
  title,
  revealed: initiallyRevealed,
}: {
  slug: string
  rewardId: string | number
  title: string
  revealed: boolean
}) => {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [revealed, setRevealed] = useState(initiallyRevealed)
  const [, start] = useTransition()
  const drawing = useRef(false)

  useEffect(() => {
    if (revealed) return
    const c = canvas.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    const { width, height } = c.getBoundingClientRect()
    c.width = width * devicePixelRatio
    c.height = height * devicePixelRatio
    ctx.scale(devicePixelRatio, devicePixelRatio)
    const style = getComputedStyle(c)
    const g = ctx.createLinearGradient(0, 0, width, height)
    g.addColorStop(0, style.getPropertyValue('--t-primary') || '#b4537a')
    g.addColorStop(1, style.getPropertyValue('--t-accent') || '#e8a87c')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, width, height)
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.font = '600 18px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Scratch here ✨', width / 2, height / 2 + 6)
    ctx.globalCompositeOperation = 'destination-out'
  }, [revealed])

  const scratchAt = (x: number, y: number) => {
    const c = canvas.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx) return
    const rect = c.getBoundingClientRect()
    ctx.beginPath()
    ctx.arc(x - rect.left, y - rect.top, 22, 0, Math.PI * 2)
    ctx.fill()
  }

  const checkDone = () => {
    const c = canvas.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx || revealed) return
    const data = ctx.getImageData(0, 0, c.width, c.height).data
    let clear = 0
    for (let i = 3; i < data.length; i += 64) if (data[i] === 0) clear++
    if (clear / (data.length / 64) > 0.45) {
      setRevealed(true)
      start(async () => {
        await scratch(slug, rewardId)
      })
    }
  }

  return (
    <div className='relative mx-auto aspect-[3/2] w-full max-w-sm overflow-hidden rounded-card border border-line bg-surface'>
      <div className='absolute inset-0 flex flex-col items-center justify-center p-6 text-center'>
        <p className='text-xs font-semibold uppercase tracking-widest text-brand'>Your next-visit reward</p>
        <p className='mt-2 font-heading text-3xl leading-tight'>{title}</p>
      </div>
      {!revealed ? (
        <canvas
          className='scratch-surface absolute inset-0 h-full w-full cursor-pointer'
          onPointerDown={(e) => {
            drawing.current = true
            scratchAt(e.clientX, e.clientY)
          }}
          onPointerMove={(e) => drawing.current && scratchAt(e.clientX, e.clientY)}
          onPointerUp={() => {
            drawing.current = false
            checkDone()
          }}
          onPointerLeave={() => {
            drawing.current = false
            checkDone()
          }}
          ref={canvas}
        />
      ) : null}
    </div>
  )
}
