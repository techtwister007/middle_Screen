import type { Metadata, Viewport } from 'next'
import Link from 'next/link'
import Script from 'next/script'
import type { CSSProperties, ReactNode } from 'react'
import { BottomNav } from '@/components/site/BottomNav'
import { DemoLiveRefresh } from '@/components/site/DemoLiveRefresh'
import { InstallPrompt } from '@/components/site/InstallPrompt'
import { HtmlLang, LanguageSwitch } from '@/components/site/LanguageSwitch'
import { PLATFORM_NAME } from '@/lib/brand'
import { LANG_LABELS, t } from '@/lib/i18n'
import { getLang, salonLanguages } from '@/lib/lang'
import { mediaUrl } from '@/lib/media'
import { getSalonBySlug, salonFeatures, salonTheme } from '@/lib/salon'
import { currentCustomer, loadSalon } from '@/lib/site'

type Params = Promise<{ salon: string }>

// Metadata and viewport never 404 on their own: an unknown salon still gets a proper mobile viewport,
// and the layout body below shows the not-found page.
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { salon: slug } = await params
  const salon = await getSalonBySlug(slug)
  if (!salon) return {}
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
  const salon = await getSalonBySlug(slug)
  return {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
    ...(salon ? { themeColor: salonTheme(salon).tokens.bg } : {}),
  }
}

const cssVars = (css: string) =>
  Object.fromEntries(
    css.split(';').map((pair) => {
      const i = pair.indexOf(':')
      return [pair.slice(0, i), pair.slice(i + 1)]
    }),
  ) as CSSProperties

const SW_SCRIPT = `window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__installPrompt=e;window.dispatchEvent(new Event('installprompt:ready'))});if('serviceWorker' in navigator){var r=function(){navigator.serviceWorker.register('/sw.js',{scope:'/'}).catch(function(){})};if(document.readyState==='complete')r();else window.addEventListener('load',r)}`

export default async function SalonLayout({ children, params }: { children: ReactNode; params: Params }) {
  const { salon: slug } = await params
  const salon = await loadSalon(slug)
  const customer = await currentCustomer(salon)
  const languages = salonLanguages(salon)
  const lang = await getLang(customer?.language, languages)
  const { css, fontsHref, theme } = salonTheme(salon)
  const base = `/s/${salon.slug}`
  const logo = mediaUrl(salon.brand?.logo, 'thumb')
  const features = salonFeatures(salon)
  return (
    <div
      className={
        // Letter-spacing and capitals break Devanagari/Gujarati conjuncts: plain eyebrows in hi/gu.
        "min-h-dvh bg-bg font-body text-ink [&:not(:lang(en))_.uppercase]:normal-case [&:not(:lang(en))_[class*='tracking-']]:tracking-normal"
      }
      data-theme={theme.key}
      lang={lang}
      style={cssVars(css)}
    >
      <link href={fontsHref} precedence='default' rel='stylesheet' />
      {/* Sheets and dialogs render in a portal outside this wrapper: give the whole page the salon's tokens. */}
      <style>{`:root{${css.replace(/[<>]/g, '')}}`}</style>
      {/* Registers the service worker for install + offline, and keeps the install prompt for our own button. */}
      <Script id='salon-sw' strategy='afterInteractive'>
        {SW_SCRIPT}
      </Script>
      <HtmlLang lang={lang} />
      {salon.status === 'demo' ? <DemoLiveRefresh slug={salon.slug} /> : null}
      <header className='sticky top-0 z-20 border-b border-line/60 bg-bg/85 backdrop-blur-md'>
        <div className='mx-auto flex h-14 max-w-lg items-center justify-between gap-2 pl-4 pr-2'>
          <Link className='flex min-h-11 min-w-0 items-center gap-2.5' href={base}>
            {logo ? (
              <img alt='' className='h-8 w-8 shrink-0 rounded-full object-cover' src={logo} />
            ) : (
              <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand font-heading text-sm text-on-brand'>
                {salon.name.slice(0, 1)}
              </span>
            )}
            <span className='truncate font-heading text-lg leading-none'>{salon.name}</span>
          </Link>
          <div className='flex shrink-0 items-center'>
            {languages.length > 1 ? (
              <LanguageSwitch
                current={lang}
                label={t(lang, 'changeLanguage')}
                options={languages.map((l) => ({ value: l, label: LANG_LABELS[l] }))}
                slug={salon.slug}
              />
            ) : null}
            <Link
              className='inline-flex h-11 max-w-[7.5rem] items-center truncate rounded-btn px-3 text-sm font-medium text-brand'
              data-testid='header-account'
              href={customer ? `${base}/me` : `${base}/login`}
            >
              <span className='truncate'>{customer ? (customer.name?.split(' ')[0] ?? t(lang, 'myNails')) : t(lang, 'login')}</span>
            </Link>
          </div>
        </div>
      </header>
      <main className='mx-auto max-w-lg pb-28'>{children}</main>
      <BottomNav
        base={base}
        labels={{ home: t(lang, 'home'), designs: t(lang, 'designs'), book: t(lang, 'book'), myNails: t(lang, 'myNails'), rewards: t(lang, 'rewards') }}
        showRewards={features.has('loyalty') || features.has('wallet')}
      />
      <InstallPrompt
        labels={{
          title: t(lang, 'installApp', { salon: salon.name }),
          body: t(lang, 'installBody'),
          install: t(lang, 'install'),
          notNow: t(lang, 'notNow'),
          iosHint: t(lang, 'iosHint'),
          genericHint: t(lang, 'genericHint'),
          installed: t(lang, 'alreadyInstalled'),
          close: t(lang, 'close'),
        }}
        logo={logo}
        slug={salon.slug}
      />
      <footer className='mx-auto max-w-lg px-4 pb-32 pt-6 text-center text-[11px] text-muted/80'>
        <a href='/' rel='noopener'>
          {t(lang, 'poweredBy', { name: PLATFORM_NAME })}
        </a>
      </footer>
    </div>
  )
}
