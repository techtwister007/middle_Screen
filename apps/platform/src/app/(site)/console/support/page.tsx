import { formatINR, formatIST, type ID, normalizePhone } from '@salon/core'
import { buttonClass } from '@salon/ui'
import Link from 'next/link'
import { getPayloadClient } from '@/lib/payload'
import { requirePlatformAdmin } from '@/lib/staff'

export const metadata = { title: 'Find a customer' }

/**
 * Support lookup: which salons know this phone number. Cross-salon access is a privileged action, so every search
 * is written to the audit trail, and only the minimum is shown here; details stay inside each salon's Studio.
 */
export default async function SupportPage({ searchParams }: { searchParams: Promise<{ phone?: string; reason?: string }> }) {
  const user = await requirePlatformAdmin()
  const sp = await searchParams
  const phone = sp.phone ? normalizePhone(sp.phone) : null
  const payload = await getPayloadClient()
  let rows: {
    id: ID
    name?: string
    phone: string
    visitCount?: number
    lifetimeSpend?: number
    lastVisitAt?: string
    tenant: { id: ID; name: string; slug: string }
  }[] = []
  if (phone) {
    if (!sp.reason?.trim()) {
      // Ask for a reason first; nothing is looked up without one.
    } else {
      rows = (await payload.find({ collection: 'customers', overrideAccess: true, depth: 1, limit: 50, where: { phone: { equals: phone } } }))
        .docs as unknown as typeof rows
      await payload.create({
        collection: 'audit-log',
        overrideAccess: true,
        data: { actor: user.id, action: 'support.customer_lookup', details: { phone, reason: sp.reason.trim(), matches: rows.length } } as never,
      })
    }
  }
  return (
    <div className='max-w-3xl'>
      <h1 className='font-heading text-3xl'>Find a customer</h1>
      <p className='mt-1 text-sm text-muted'>For support requests, e.g. "I can't log in" or "delete my data". Every search is logged with its reason.</p>
      <form className='mt-6 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end'>
        <label className='text-sm'>
          <span className='mb-1 block text-muted'>Phone</span>
          <input className='h-11 w-full rounded-btn border border-line bg-surface px-3' defaultValue={sp.phone} inputMode='tel' name='phone' required />
        </label>
        <label className='text-sm'>
          <span className='mb-1 block text-muted'>Reason (logged)</span>
          <input
            className='h-11 w-full rounded-btn border border-line bg-surface px-3'
            defaultValue={sp.reason}
            name='reason'
            placeholder='Ticket #, or what they asked'
            required
          />
        </label>
        <button className={buttonClass('primary', 'md', 'h-11')} type='submit'>
          Search
        </button>
      </form>
      {sp.phone && !phone ? <p className='mt-4 text-sm text-red-700'>That doesn't look like an Indian mobile number.</p> : null}
      {phone && sp.reason ? (
        <div className='mt-6 divide-y divide-line rounded-card border border-line bg-surface'>
          {rows.map((c) => (
            <div className='flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm' key={String(c.id)}>
              <div>
                <p className='font-medium'>
                  {c.name ?? 'No name'} <span className='font-normal text-muted'>at {c.tenant?.name}</span>
                </p>
                <p className='text-xs text-muted'>
                  {c.visitCount ?? 0} visit{c.visitCount === 1 ? '' : 's'} · {formatINR(c.lifetimeSpend ?? 0)}
                  {c.lastVisitAt ? ` · last ${formatIST(c.lastVisitAt, 'd MMM yyyy')}` : ''}
                </p>
              </div>
              <Link
                className={buttonClass('secondary', 'sm')}
                href={`/console/salons/${c.tenant?.slug}/open?to=${encodeURIComponent(`/customers/${c.id}`)}&reason=${encodeURIComponent(sp.reason ?? 'support')}`}
              >
                Open in their Studio
              </Link>
            </div>
          ))}
          {!rows.length ? <p className='p-4 text-sm text-muted'>No salon has this number.</p> : null}
        </div>
      ) : null}
    </div>
  )
}
