'use client'
import { Button } from '@salon/ui'
import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { toast } from './Toast'

export const CopyButton = ({ text, label = 'Copy link', className }: { text: string; label?: string; className?: string }) => {
  const [done, setDone] = useState(false)
  return (
    <Button
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setDone(true)
          toast({ message: 'Link copied', tone: 'success' })
          setTimeout(() => setDone(false), 2000)
        } catch {
          toast({ message: 'Could not copy. Long-press the link instead.', tone: 'error' })
        }
      }}
      type='button'
      variant='secondary'
    >
      {done ? <Check size={16} /> : <Copy size={16} />} {done ? 'Copied' : label}
    </Button>
  )
}
