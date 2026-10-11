'use client'
import { formatINR } from '@salon/core'
import { Button, cn, Input, Label, Textarea } from '@salon/ui'
import { AlertTriangle, Check, Loader2, MessageCircle, Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { editVisit, saveCustomerCare, sendReceipt, setFollowUp, voidVisit, whatsappLink } from '@/app/(site)/studio/[salon]/actions'
import { ConfirmSheet } from './ConfirmSheet'
import { PAY_LABEL } from './format'
import { toast } from './Toast'

type SaveState = 'idle' | 'saving' | 'saved' | { error: string }

/** A text field that saves on demand; "Saved ✓" resets as soon as it's edited again, and errors are shown. */
const CareField = ({
  slug,
  customerId,
  field,
  initial,
  label,
  placeholder,
  rows,
  danger,
}: {
  slug: string
  customerId: string | number
  field: 'notes' | 'allergies'
  initial: string
  label: string
  placeholder: string
  rows: number
  danger?: boolean
}) => {
  const [value, setValue] = useState(initial)
  const [saved, setSaved] = useState(initial)
  const [state, setState] = useState<SaveState>('idle')
  const dirty = value !== saved
  const id = `care-${field}`
  return (
    <div className={cn('rounded-card border p-3', danger && value.trim() ? 'border-red-300 bg-red-500/5' : 'border-line bg-surface')}>
      <Label className={cn('flex items-center gap-1.5', danger && 'text-red-800')} htmlFor={id}>
        {danger ? <AlertTriangle size={16} /> : null} {label}
      </Label>
      <Textarea
        id={id}
        onChange={(e) => {
          setValue(e.target.value)
          if (state !== 'saving') setState('idle')
        }}
        placeholder={placeholder}
        rows={rows}
        value={value}
      />
      <div className='mt-2 flex flex-wrap items-center gap-3'>
        <Button
          disabled={!dirty || state === 'saving'}
          onClick={async () => {
            setState('saving')
            const r = await saveCustomerCare(slug, customerId, { [field]: value })
            if (!r.ok) {
              setState({ error: r.error })
              return
            }
            setSaved(value)
            setState('saved')
          }}
          variant={dirty ? 'primary' : 'secondary'}
        >
          {state === 'saving' ? <Loader2 className='animate-spin' size={16} /> : null} Save {field === 'notes' ? 'notes' : 'allergies'}
        </Button>
        {state === 'saved' && !dirty ? (
          <span className='inline-flex items-center gap-1 text-sm text-emerald-700' role='status'>
            <Check size={16} /> Saved
          </span>
        ) : dirty ? (
          <span className='text-xs text-muted'>Not saved yet</span>
        ) : null}
        {typeof state === 'object' ? (
          <span className='text-sm text-red-700' role='alert'>
            {state.error}
          </span>
        ) : null}
      </div>
    </div>
  )
}

export const CareEditor = ({ slug, customerId, notes, allergies }: { slug: string; customerId: string | number; notes: string; allergies: string }) => (
  <div className='space-y-3'>
    <CareField
      customerId={customerId}
      danger
      field='allergies'
      initial={allergies}
      label='Allergies & sensitivities'
      placeholder='e.g. allergic to acrylic monomer (HEMA), latex'
      rows={2}
      slug={slug}
    />
    <CareField
      customerId={customerId}
      field='notes'
      initial={notes}
      label='Notes'
      placeholder='Preferences, favourite artist, nail shape…'
      rows={3}
      slug={slug}
    />
  </div>
)

/** Kept for older imports. */
export const NotesEditor = ({ slug, customerId, initial }: { slug: string; customerId: string | number; initial: string }) => (
  <CareField
    customerId={customerId}
    field='notes'
    initial={initial}
    label='Notes'
    placeholder='Preferences, sensitivities, favourite artist…'
    rows={3}
    slug={slug}
  />
)

const TEMPLATES = [
  ['refill_due', 'Refill reminder'],
  ['winback', 'We miss you'],
  ['nudge_new_designs', 'New designs'],
  ['aftercare', 'Aftercare check'],
] as const

export const MessageButtons = ({ slug, customerId, link }: { slug: string; customerId: string | number; link: string }) => {
  const [pending, start] = useTransition()
  return (
    <div className='grid grid-cols-2 gap-2 sm:flex sm:flex-wrap'>
      {TEMPLATES.map(([t, label]) => (
        <Button
          disabled={pending}
          key={t}
          onClick={() =>
            start(async () => {
              const r = await whatsappLink(slug, customerId, t, link)
              if (r.ok) window.open(r.data!.url, '_blank')
              else toast({ message: r.error, tone: 'error' })
            })
          }
          variant='secondary'
        >
          <MessageCircle size={16} /> {label}
        </Button>
      ))}
    </div>
  )
}

export const FollowUp = ({ slug, ratingId }: { slug: string; ratingId: string | number }) => {
  const [state, setState] = useState<string | null>(null)
  const [pending, start] = useTransition()
  if (state) return <p className='text-sm text-emerald-700'>Marked {state} ✓</p>
  return (
    <div className='flex gap-2'>
      {(['called', 'resolved'] as const).map((s) => (
        <Button
          disabled={pending}
          key={s}
          onClick={() =>
            start(async () => {
              const r = await setFollowUp(slug, ratingId, s)
              if (r.ok) setState(s)
              else toast({ message: r.error, tone: 'error' })
            })
          }
          variant='secondary'
        >
          Mark {s}
        </Button>
      ))}
    </div>
  )
}

export interface VisitLite {
  id: string | number
  total: number
  tip: number
  paymentMode: string
  staffId: string | number | null
  lines: { name: string; price: number; serviceId?: string | number | null }[]
  manualDiscount: number
  receiptSentAt?: string | null
  voided: boolean
}

const MODES = ['upi', 'cash', 'card', 'payment-link', 'mixed'] as const

/** Receipt resend for everyone; edit and void for managers. */
export const VisitActions = ({
  slug,
  visit,
  manager,
  team,
}: {
  slug: string
  visit: VisitLite
  manager: boolean
  team: { id: string | number; name: string }[]
}) => {
  const router = useRouter()
  const [sheet, setSheet] = useState<null | 'edit' | 'void'>(null)
  const [pending, start] = useTransition()
  const [sentAt, setSentAt] = useState(visit.receiptSentAt ?? null)
  const [lines, setLines] = useState(visit.lines)
  const [discount, setDiscount] = useState(visit.manualDiscount)
  const [tip, setTip] = useState(visit.tip)
  const [mode, setMode] = useState(visit.paymentMode)
  const [staff, setStaff] = useState(visit.staffId)
  const [reason, setReason] = useState('')
  const rupees = (v: string) => Math.max(0, Math.round(Number(v.replace(/[^\d.]/g, '') || 0) * 100))
  if (visit.voided) return null
  return (
    <div className='mt-2 flex flex-wrap gap-2'>
      <Button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await sendReceipt(slug, visit.id)
            if (!r.ok) return void toast({ message: r.error, tone: 'error' })
            if (r.data?.url) {
              window.open(r.data.url, '_blank')
              return void toast('Opened WhatsApp with the receipt')
            }
            setSentAt(r.data?.sentAt ?? new Date().toISOString())
            toast({ message: 'Receipt sent on WhatsApp', tone: 'success' })
          })
        }
        variant='secondary'
      >
        <MessageCircle size={16} /> {sentAt ? 'Resend receipt' : 'Send receipt'}
      </Button>
      {manager ? (
        <>
          <Button disabled={pending} onClick={() => setSheet('edit')} variant='secondary'>
            Edit bill
          </Button>
          <Button className='text-red-700' disabled={pending} onClick={() => setSheet('void')} variant='secondary'>
            Void
          </Button>
        </>
      ) : null}

      <ConfirmSheet
        confirmLabel='Save changes'
        onConfirm={() =>
          start(async () => {
            const r = await editVisit(slug, visit.id, { lines, manualDiscount: discount, tip, paymentMode: mode as never, staffId: staff, reason })
            if (!r.ok) return void toast({ message: r.error, tone: 'error' })
            toast({ message: `Bill updated: ${formatINR(r.data?.total ?? 0)}`, tone: 'success' })
            setSheet(null)
            router.refresh()
          })
        }
        onOpenChange={(o) => setSheet(o ? 'edit' : null)}
        open={sheet === 'edit'}
        pending={pending}
        title='Edit bill'
      >
        <div className='space-y-2'>
          {lines.map((l, i) => (
            <div className='flex items-center gap-2' key={i}>
              <Input
                aria-label={`Line ${i + 1} name`}
                className='flex-1'
                onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                value={l.name}
              />
              <Input
                aria-label={`Line ${i + 1} price (₹)`}
                className='w-24 text-right'
                inputMode='numeric'
                onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, price: rupees(e.target.value) } : x)))}
                value={String(l.price / 100)}
              />
              <button
                aria-label='Remove line'
                className='flex h-11 w-11 items-center justify-center rounded-btn text-muted'
                onClick={() => setLines(lines.filter((_, j) => j !== i))}
                type='button'
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          <Button onClick={() => setLines([...lines, { name: '', price: 0 }])} variant='ghost'>
            <Plus size={16} /> Add line
          </Button>
        </div>
        <div className='grid grid-cols-2 gap-2'>
          <div>
            <Label htmlFor={`ed-${visit.id}`}>Discount (₹)</Label>
            <Input id={`ed-${visit.id}`} inputMode='numeric' onChange={(e) => setDiscount(rupees(e.target.value))} value={String(discount / 100)} />
          </div>
          <div>
            <Label htmlFor={`et-${visit.id}`}>Tip (₹)</Label>
            <Input id={`et-${visit.id}`} inputMode='numeric' onChange={(e) => setTip(rupees(e.target.value))} value={String(tip / 100)} />
          </div>
        </div>
        <div>
          <Label htmlFor={`em-${visit.id}`}>Paid by</Label>
          <select
            className='h-12 w-full rounded-btn border border-line bg-surface px-3'
            id={`em-${visit.id}`}
            onChange={(e) => setMode(e.target.value)}
            value={mode}
          >
            {MODES.map((m) => (
              <option key={m} value={m}>
                {PAY_LABEL[m] ?? m}
              </option>
            ))}
          </select>
        </div>
        {team.length ? (
          <div>
            <Label htmlFor={`es-${visit.id}`}>Artist</Label>
            <select
              className='h-12 w-full rounded-btn border border-line bg-surface px-3'
              id={`es-${visit.id}`}
              onChange={(e) => setStaff(e.target.value || null)}
              value={staff == null ? '' : String(staff)}
            >
              <option value=''>No artist</option>
              {team.map((t) => (
                <option key={String(t.id)} value={String(t.id)}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div>
          <Label htmlFor={`er-${visit.id}`}>Reason for the change (kept on the bill)</Label>
          <Input id={`er-${visit.id}`} onChange={(e) => setReason(e.target.value)} placeholder='e.g. charged gel instead of acrylic' value={reason} />
        </div>
      </ConfirmSheet>

      <ConfirmSheet
        confirmLabel='Void this bill'
        danger
        onConfirm={() =>
          start(async () => {
            const r = await voidVisit(slug, visit.id, reason)
            if (!r.ok) return void toast({ message: r.error, tone: 'error' })
            toast({ message: 'Bill voided', tone: 'success' })
            setSheet(null)
            router.refresh()
          })
        }
        onOpenChange={(o) => setSheet(o ? 'void' : null)}
        open={sheet === 'void'}
        pending={pending}
        title={`Void this ${formatINR(visit.total)} bill?`}
      >
        <p className='text-muted'>Use this for a bill entered by mistake. Amounts become ₹0 so reports drop it; the original stays in the bill's notes.</p>
        <div>
          <Label htmlFor={`vr-${visit.id}`}>Reason</Label>
          <Input id={`vr-${visit.id}`} onChange={(e) => setReason(e.target.value)} placeholder='e.g. duplicate bill' value={reason} />
        </div>
      </ConfirmSheet>
    </div>
  )
}
