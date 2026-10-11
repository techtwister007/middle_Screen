import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import { createEventBus, setEventBus } from '@salon/core'
import { allCollections, modules, tenantCollections } from '@salon/modules'
import { buildConfig, type Plugin } from 'payload'
import sharp from 'sharp'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const bus = createEventBus(modules, {
  mode: process.env.EVENTS_MODE === 'queue' ? 'queue' : 'inline',
})
setEventBus(bus)

const plugins: Plugin[] = [
  multiTenantPlugin({
    tenantsSlug: 'salons',
    tenantSelectorLabel: 'Salon',
    collections: Object.fromEntries(tenantCollections().map((slug) => [slug, {}])),
    userHasAccessToAllTenants: (user) => (user as { role?: string }).role === 'platform-admin',
    tenantsArrayField: { includeDefaultField: true },
  }),
]

if (process.env.S3_BUCKET) {
  plugins.push(
    s3Storage({
      collections: { media: true, 'library-media': true },
      bucket: process.env.S3_BUCKET,
      config: {
        endpoint: process.env.S3_ENDPOINT,
        region: process.env.S3_REGION ?? 'ap-south-1',
        forcePathStyle: true,
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
        },
      },
    }),
  )
}

export default buildConfig({
  serverURL: process.env.PUBLIC_URL,
  admin: {
    user: 'users',
    importMap: { baseDir: path.resolve(dirname) },
    meta: { titleSuffix: ' · Salon Platform' },
  },
  collections: allCollections(),
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL || '' },
    push: process.env.DB_PUSH === 'true',
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  jobs: {
    tasks: bus.tasks(),
    access: {
      run: ({ req }) => {
        if ((req.user as { role?: string } | null)?.role === 'platform-admin') return true
        const secret = process.env.CRON_SECRET
        if (!secret) return process.env.NODE_ENV !== 'production'
        return req.headers.get('authorization') === `Bearer ${secret}`
      },
    },
  },
  sharp,
  plugins,
})
