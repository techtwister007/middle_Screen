'use client'
import type { ReactNode } from 'react'
import { Drawer } from 'vaul'

/** Native-feeling bottom sheet (Vaul). */
export const Sheet = ({
  open,
  onOpenChange,
  title,
  children,
  trigger,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  title: string
  children: ReactNode
  trigger?: ReactNode
}) => (
  <Drawer.Root open={open} onOpenChange={onOpenChange}>
    {trigger ? <Drawer.Trigger asChild>{trigger}</Drawer.Trigger> : null}
    <Drawer.Portal>
      <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
      <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92vh] max-w-lg flex-col rounded-t-[28px] bg-bg text-ink outline-none">
        <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-line" />
        <Drawer.Title className="px-5 pt-4 font-heading text-xl">{title}</Drawer.Title>
        <div className="overflow-y-auto px-5 pb-8 pt-3">{children}</div>
      </Drawer.Content>
    </Drawer.Portal>
  </Drawer.Root>
)
