import { NextResponse } from 'next/server'

/** Referral link: remember who invited this person, then open the salon home. */
export async function GET(req: Request, { params }: { params: Promise<{ salon: string; code: string }> }) {
  const { salon, code } = await params
  const res = NextResponse.redirect(new URL(`/s/${salon}?welcome=friend`, req.url))
  const opts = { path: '/', maxAge: 60 * 60 * 24 * 30, sameSite: 'lax' as const }
  res.cookies.set(`ref_${salon}`, code.toUpperCase().slice(0, 12), opts)
  res.cookies.set(`src_${salon}`, 'referral', opts)
  return res
}
