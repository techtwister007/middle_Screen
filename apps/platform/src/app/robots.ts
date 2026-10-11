import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const base = (process.env.PUBLIC_URL ?? 'http://localhost:3000').replace(/\/$/, '')
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/s/', '/discover/'],
        disallow: ['/studio', '/console', '/admin', '/api', '/pay', '/s/*/me', '/s/*/appointments', '/s/*/login'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
