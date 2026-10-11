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
  const url = new URL(req.url)
  const reason = url.searchParams.get('reason') ?? 'support'
  // Only paths inside this salon's Studio.
  const to = url.searchParams.get('to') ?? '/today'
  const target = /^\/[a-z0-9/_-]*$/i.test(to) && !to.includes('//') ? to : '/today'
  const payload = await getPayloadClient()
  await payload.create({
    collection: 'audit-log',
    overrideAccess: true,
    data: { actor: user.id, action: 'studio.opened', details: { slug, reason, to: target } } as never,
  })
  redirect(`/studio/${slug}${target}`)
}
