import type { Metadata, Viewport } from 'next'
import { cookies } from 'next/headers'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Salon Growth Platform', template: '%s' },
  description: 'Branded apps that bring salon customers back.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default async function SiteRootLayout({ children }: { children: ReactNode }) {
  // The customer's chosen language (salon pages also correct it client-side for saved/browser languages).
  const chosen = (await cookies()).get('lang')?.value
  const lang = chosen === 'hi' || chosen === 'gu' ? chosen : 'en'
  return (
    <html data-scroll-behavior='smooth' lang={lang} suppressHydrationWarning>
      <head>
        <link href='https://fonts.googleapis.com' rel='preconnect' />
        <link crossOrigin='' href='https://fonts.gstatic.com' rel='preconnect' />
      </head>
      <body>{children}</body>
    </html>
  )
}
