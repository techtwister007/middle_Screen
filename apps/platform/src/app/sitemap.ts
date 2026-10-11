import type { MetadataRoute } from 'next'
import { getPayloadClient } from '@/lib/payload'

export const revalidate = 3600

/** Public salon pages for search engines. Demo and paused salons are left out. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.PUBLIC_URL ?? 'http://localhost:3000').replace(/\/$/, '')
  try {
    const payload = await getPayloadClient()
    const salons = (await payload.find({ collection: 'salons', overrideAccess: true, depth: 0, limit: 1000, where: { status: { in: ['active', 'trial'] } } }))
      .docs as unknown as { slug: string; updatedAt: string }[]
    return [
      { url: base, changeFrequency: 'monthly', priority: 0.5 },
      ...salons.flatMap((s) =>
        ['', '/designs', '/menu'].map((p) => ({
          url: `${base}/s/${s.slug}${p}`,
          lastModified: s.updatedAt,
          changeFrequency: 'weekly' as const,
          priority: p ? 0.6 : 0.8,
        })),
      ),
    ]
  } catch {
    return [{ url: base }]
  }
}
