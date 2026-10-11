import Link from 'next/link'
import { ActionForm } from '@/components/studio/ActionForm'
import { Field, inputClass } from '@/components/studio/Field'
import { requireStaff } from '@/lib/staff'
import { importCustomers } from './actions'

export const metadata = { title: 'Import customers' }

export default async function ImportPage({ params }: { params: Promise<{ salon: string }> }) {
  const { salon: slug } = await params
  await requireStaff(slug, { manager: true })
  return (
    <div>
      <Link className='text-sm text-brand' href={`/studio/${slug}/customers`}>
        ← Customers
      </Link>
      <h1 className='mt-3 font-heading text-3xl'>Bring your customers</h1>
      <p className='mt-1 text-sm text-muted'>
        From your phone contacts, a register or another app. Nobody is messaged when you import; they start getting reminders after their next visit.
      </p>
      <ActionForm action={importCustomers.bind(null, slug)} className='mt-6' submit='Import customers'>
        <Field hint='One per line: name, phone. Copy from Excel or Google Sheets works too.' label='Paste a list'>
          <textarea className={`${inputClass} h-48 py-2 font-mono text-sm`} name='text' placeholder={'Priya Shah, 98250 11111\nNeha 9824012345'} />
        </Field>
        <Field hint='CSV or vCard (.vcf) from your phone contacts' label='Or upload a file'>
          <input accept='.csv,.txt,.vcf,text/csv,text/vcard' className='w-full min-w-0 text-sm' name='file' type='file' />
        </Field>
        <label className='flex items-start gap-2 text-sm'>
          <input className='mt-1' name='consent' type='checkbox' />
          <span>These customers have agreed to receive offers from us on WhatsApp. (Leave unticked if unsure: they can opt in from the app.)</span>
        </label>
      </ActionForm>
    </div>
  )
}
