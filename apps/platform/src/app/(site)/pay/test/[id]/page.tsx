import { formatINR } from '@salon/core'
import { captureByProviderLink } from '@salon/modules'
import { redirect } from 'next/navigation'
import { getPayloadClient } from '@/lib/payload'

export const metadata = { title: 'Test payment' }

/** Stand-in for the Razorpay page in development and demos. Never active in live payment mode. */
export default async function TestPayPage({ params }: { params: Promise<{ id: string }> }) {
  if (process.env.PAYMENTS_PROVIDER === 'live') redirect('/')
  const { id } = await params
  const linkId = decodeURIComponent(id)
  const payload = await getPayloadClient()
  const res = await payload.find({ collection: 'payments', overrideAccess: true, depth: 1, limit: 1, where: { providerLinkId: { equals: linkId } } })
  const payment = res.docs[0] as unknown as
    | {
        id: string
        amount: number
        description?: string
        status: string
        tenant: { slug: string; name: string }
        appointment?: { id: string } | null
        kind: string
      }
    | undefined
  if (!payment) return <p className='p-8'>Payment not found.</p>
  async function pay() {
    'use server'
    await captureByProviderLink(await getPayloadClient(), linkId, `pay_test_${Date.now()}`)
    const slug = payment!.tenant.slug
    if (payment!.kind === 'deposit' && payment!.appointment) redirect(`/s/${slug}/appointments/${payment!.appointment.id}?paid=1`)
    if (payment!.kind === 'gift-card') redirect(`/s/${slug}/invite?gift=sent`)
    if (payment!.kind === 'package') redirect(`/s/${slug}/rewards?package=1`)
    redirect(`/s/${slug}`)
  }
  return (
    <div className='mx-auto max-w-sm px-6 pt-16 text-center'>
      <p className='text-xs font-semibold uppercase tracking-widest text-muted'>Test payment · no money moves</p>
      <h1 className='mt-3 font-heading text-4xl'>{formatINR(payment.amount)}</h1>
      <p className='mt-1 text-muted'>{payment.description}</p>
      {payment.status === 'captured' ? (
        <p className='mt-8 rounded-card bg-emerald-500/10 p-4 text-emerald-800'>Already paid.</p>
      ) : (
        <form action={pay}>
          <button className='mt-10 h-14 w-full rounded-btn bg-brand font-medium text-on-brand' type='submit'>
            Pay with UPI (test)
          </button>
        </form>
      )}
      <p className='mt-6 text-xs text-muted'>In production this is Razorpay, and the money settles in {payment.tenant.name}'s own account.</p>
    </div>
  )
}
