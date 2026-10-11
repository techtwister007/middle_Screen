import { translator } from '@/lib/i18n'
import { getLang, salonLanguages } from '@/lib/lang'
import { mediaUrl } from '@/lib/media'
import { getSalonBySlug, salonFeatures, salonTheme } from '@/lib/salon'

/** Per-salon PWA manifest: installed, it looks like the salon's own app. */
export async function GET(_: Request, { params }: { params: Promise<{ salon: string }> }) {
  const { salon: slug } = await params
  const salon = await getSalonBySlug(slug)
  if (!salon) return new Response('Not found', { status: 404 })
  const { tokens } = salonTheme(salon)
  const logo = mediaUrl(salon.brand?.logo, 'original')
  const tr = translator(await getLang(null, salonLanguages(salon)))
  const features = salonFeatures(salon)
  const manifest = {
    name: salon.name,
    short_name: salon.name.length > 12 ? salon.name.split(' ')[0] : salon.name,
    description: salon.tagline ?? `Book at ${salon.name}`,
    start_url: `/s/${slug}?source=pwa`,
    scope: `/s/${slug}`,
    display: 'standalone',
    background_color: tokens.bg,
    theme_color: tokens.bg,
    icons: logo
      ? [
          { src: logo, sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: logo, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ]
      : [],
    shortcuts: [
      { name: tr('book'), url: `/s/${slug}/book` },
      { name: tr('myNails'), url: `/s/${slug}/me` },
      ...(features.has('loyalty') || features.has('wallet') ? [{ name: tr('rewards'), url: `/s/${slug}/rewards` }] : []),
    ],
  }
  return new Response(JSON.stringify(manifest), { headers: { 'content-type': 'application/manifest+json', 'cache-control': 'public, max-age=300' } })
}
