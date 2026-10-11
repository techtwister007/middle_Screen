'use server'

import { findOrCreateCustomer } from '@salon/modules'
import { revalidatePath } from 'next/cache'
import type { FormState } from '@/app/(site)/studio/[salon]/settings/actions'
import { parseContacts } from '@/lib/contacts'
import { getPayloadClient } from '@/lib/payload'
import { requireStaff } from '@/lib/staff'

export async function importCustomers(slug: string, _prev: FormState, f: FormData): Promise<FormState> {
  const { salon } = await requireStaff(slug, { manager: true })
  const payload = await getPayloadClient()
  const file = f.get('file')
  const text = [typeof f.get('text') === 'string' ? (f.get('text') as string) : '', file instanceof File && file.size ? await file.text() : ''].join('\n')
  const { contacts, skipped } = parseContacts(text)
  if (!contacts.length) return { ok: false, error: 'No phone numbers found. One customer per line: name, phone' }
  if (contacts.length > 5000) return { ok: false, error: 'Up to 5,000 at a time please' }
  // Consent can only be recorded if the owner confirms these customers agreed to hear from the salon.
  const consent = f.get('consent') === 'on'
  let created = 0
  for (const c of contacts) {
    const r = await findOrCreateCustomer(payload, salon.id, { phone: c.phone, name: c.name, source: 'import', marketingConsent: consent })
    if (r.created) created++
  }
  revalidatePath(`/studio/${slug}/customers`)
  return {
    ok: true,
    message: `${created} new customer${created === 1 ? '' : 's'} added, ${contacts.length - created} already here. No messages were sent.`,
    ...(skipped.length ? { error: `Skipped ${skipped.length} line${skipped.length === 1 ? '' : 's'} without a valid number, e.g. “${skipped[0]}”` } : {}),
  }
}
