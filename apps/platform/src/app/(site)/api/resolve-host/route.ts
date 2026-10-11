import { getPayloadClient } from '@/lib/payload'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const host = new URL(req.url).searchParams.get('host')?.toLowerCase()
  if (!host) return NextResponse.json({ slug: null })
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'salons',
    overrideAccess: true,
    depth: 0,
    limit: 1,
    where: { 'domains.domain': { equals: host } },
  })
  const salon = res.docs[0] as { slug?: string } | undefined
  return NextResponse.json({ slug: salon?.slug ?? null }, { headers: { 'cache-control': 'public, max-age=60' } })
}
