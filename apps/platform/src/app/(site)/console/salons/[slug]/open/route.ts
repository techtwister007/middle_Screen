import { redirect } from 'next/navigation'
import { getPayloadClient } from '@/lib/payload'
import { getSalonAnyStatus } from '@/lib/salon'
import { requirePlatformAdmin } from '@/lib/staff'

/** Support opens a salon's Studio. Every visit is written to the audit log. */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const user = await requirePlatformAdmin()
  const salon = await getSalonAnyStatus(slug)
  if (!salon) return new Response('Not found', { status: 404 })
  const reason = new URL(req.url).searchParams.get('reason') ?? 'support'
  const payload = await getPayloadClient()
  await payload.create({
    collection: 'audit-log',
    overrideAccess: true,
    data: { actor: user.id, action: 'studio.opened', details: { slug, reason } } as never,
  })
  redirect(`/studio/${slug}/today`)
}
