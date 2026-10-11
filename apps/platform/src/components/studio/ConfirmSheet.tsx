'use client'
import { Button } from '@salon/ui'
import { Sheet } from '@salon/ui/client'
import type { ReactNode } from 'react'

/** Bottom-sheet confirmation for destructive or mass actions. */
export const ConfirmSheet = ({
  open,
  onOpenChange,
  title,
  children,
  confirmLabel,
  onConfirm,
  pending,
  danger,
  cancelLabel = 'Cancel',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children?: ReactNode
  confirmLabel: string
  onConfirm: () => void
  pending?: boolean
  danger?: boolean
  cancelLabel?: string
}) => (
  <Sheet onOpenChange={(o: boolean) => (pending ? undefined : onOpenChange(o))} open={open} title={title}>
    <div className='space-y-4 text-sm'>
      {children}
      <div className='grid gap-2 pt-2'>
        <Button disabled={pending} onClick={onConfirm} size='lg' variant={danger ? 'danger' : 'primary'}>
          {confirmLabel}
        </Button>
        <Button disabled={pending} onClick={() => onOpenChange(false)} size='lg' variant='ghost'>
          {cancelLabel}
        </Button>
      </div>
    </div>
  </Sheet>
)
