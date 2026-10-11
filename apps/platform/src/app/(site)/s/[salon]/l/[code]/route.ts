import { trackClick } from '@salon/modules'
import { NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { getSalonBySlug } from '@/lib/salon'

/** Tracked short links for QR codes, bio links, posters and partners. */
export async function GET(req: Request, { params }: { params: Promise<{ salon: string; code: string }> }) {
  const { salon: slug, code } = await params
  const salon = await getSalonBySlug(slug)
  if (!salon) return NextResponse.redirect(new URL('/', req.url))
  const hit = await trackClick(await getPayloadClient(), salon.id, code)
  const target = hit?.target?.startsWith('/') ? hit.target : '/'
  const res = NextResponse.redirect(new URL(`/s/${slug}${target === '/' ? '' : target}`, req.url))
  if (hit) res.cookies.set(`src_${slug}`, hit.source === 'poster' ? 'qr' : hit.source, { path: '/', maxAge: 60 * 60 * 24 * 30, sameSite: 'lax' })
  return res
}
