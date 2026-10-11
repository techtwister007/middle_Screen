import { BottomNav } from '@/components/site/BottomNav'
import { PLATFORM_NAME } from '@/lib/brand'
import { t } from '@/lib/i18n'
import { getLang } from '@/lib/lang'
import { mediaUrl } from '@/lib/media'
import { salonTheme } from '@/lib/salon'
import { currentCustomer, loadSalon } from '@/lib/site'
import type { Metadata, Viewport } from 'next'
import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'

type Params = Promise<{ salon: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { salon: slug } = await params
  const salon = await loadSalon(slug)
  const logo = mediaUrl(salon.brand?.logo, 'thumb')
  return {
    title: { default: salon.name, template: `%s · ${salon.name}` },
    description: salon.tagline ?? `Book at ${salon.name}`,
    manifest: `/s/${salon.slug}/manifest.webmanifest`,
    appleWebApp: { capable: true, title: salon.name, statusBarStyle: 'default' },
    icons: logo ? { icon: logo, apple: logo } : undefined,
    openGraph: { title: salon.name, description: salon.tagline ?? undefined, images: mediaUrl(salon.brand?.cover, 'large') ?? undefined },
  }
}

export async function generateViewport({ params }: { params: Params }): Promise<Viewport> {
  const { salon: slug } = await params
  const salon = await loadSalon(slug)
  return { themeColor: salonTheme(salon).tokens.bg }
}

const cssVars = (css: string) =>
  Object.fromEntries(
    css.split(';').map((pair) => {
      const i = pair.indexOf(':')
      return [pair.slice(0, i), pair.slice(i + 1)]
    }),
  ) as CSSProperties

export default async function SalonLayout({ children, params }: { children: ReactNode; params: Params }) {
  const { salon: slug } = await params
  const salon = await loadSalon(slug)
  const customer = await currentCustomer(salon)
  const lang = await getLang(customer?.language)
  const { css, fontsHref, theme } = salonTheme(salon)
  const base = `/s/${salon.slug}`
  const logo = mediaUrl(salon.brand?.logo, 'thumb')
  return (
    <div className="min-h-dvh bg-bg font-body text-ink" data-theme={theme.key} style={cssVars(css)}>
      <link href={fontsHref} precedence="default" rel="stylesheet" />
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: registers the service worker for install + offline
        dangerouslySetInnerHTML={{
          __html: `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js',{scope:'/'}).catch(function(){})})}`,
        }}
      />
      <header className="sticky top-0 z-20 border-b border-line/60 bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <Link className="flex items-center gap-2.5" href={base}>
            {logo ? <img alt="" className="h-8 w-8 rounded-full object-cover" src={logo} /> : <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand font-heading text-sm text-on-brand">{salon.name.slice(0, 1)}</span>}
            <span className="font-heading text-lg leading-none">{salon.name}</span>
          </Link>
          <Link className="text-sm font-medium text-brand" href={customer ? `${base}/me` : `${base}/login`}>
            {customer ? (customer.name?.split(' ')[0] ?? t(lang, 'myNails')) : t(lang, 'login')}
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-lg pb-28">{children}</main>
      <BottomNav
        base={base}
        labels={{ home: t(lang, 'home'), designs: t(lang, 'designs'), book: t(lang, 'book'), myNails: t(lang, 'myNails'), rewards: t(lang, 'rewards') }}
      />
      <footer className="mx-auto max-w-lg px-4 pb-32 pt-6 text-center text-[11px] text-muted/80">
        <a href="/" rel="noopener">
          Powered by {PLATFORM_NAME}
        </a>
      </footer>
    </div>
  )
}
