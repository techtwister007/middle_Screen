import { cookies } from 'next/headers'
import { getSalonBySlug } from '@/lib/salon'
import { currentCustomer } from '@/lib/site'

/**
 * Tiny version signal for demo salons: changes when the presenter switches the theme or the customer's language,
 * so the prospect's phone refreshes by itself. Real salons get 404 (they are never polled).
 */
export async function GET(_: Request, { params }: { params: Promise<{ salon: string }> }) {
  const { salon: slug } = await params
  const salon = await getSalonBySlug(slug)
  if (salon?.status !== 'demo') return new Response('Not found', { status: 404 })
  const customer = await currentCustomer(salon)
  const lang = (await cookies()).get('lang')?.value ?? ''
  const updatedAt = (salon as { updatedAt?: string }).updatedAt ?? ''
  const v = [salon.theme ?? '', updatedAt, customer?.language ?? '', lang].join('|')
  return Response.json({ v }, { headers: { 'Cache-Control': 'no-store' } })
}
