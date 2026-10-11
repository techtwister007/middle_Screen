import { requirePlatformAdmin } from '@/lib/staff'
import Link from 'next/link'
import type { ReactNode } from 'react'

export default async function ConsoleLayout({ children }: { children: ReactNode }) {
  await requirePlatformAdmin()
  return (
    <div className="min-h-dvh bg-bg">
      <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap" precedence="default" rel="stylesheet" />
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link className="font-heading text-lg" href="/console">
            Platform console
          </Link>
          <nav className="flex gap-5 text-sm">
            <Link href="/console">Salons</Link>
            <Link href="/console/new">New salon / demo</Link>
            <Link href="/admin">Admin</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  )
}
