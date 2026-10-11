import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'

const dirname = path.dirname(fileURLToPath(import.meta.url))

const nextConfig: NextConfig = {
  transpilePackages: ['@salon/core', '@salon/modules', '@salon/themes', '@salon/ui', '@salon/integrations'],
  images: {
    localPatterns: [{ pathname: '/api/media/file/**' }],
    remotePatterns: [{ protocol: 'https', hostname: '**.supabase.co' }],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }
    return webpackConfig
  },
  // The demo builder reads the bundled demo photos at runtime (serverless functions only ship traced files).
  outputFileTracingIncludes: {
    '/console/**': ['./src/seed/photos/**'],
  },
  poweredByHeader: false,
  async headers() {
    const security = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(), payment=(self)' },
      ...(process.env.NODE_ENV === 'production' ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }] : []),
    ]
    return [
      { source: '/:path*', headers: security },
      // Staff and admin pages never belong in search results or shared caches.
      {
        source: '/(studio|console|admin)/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
    ]
  },
  turbopack: {
    root: path.resolve(dirname, '../..'),
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
