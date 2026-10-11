import { defineModule, emit, forTenant, type ID, idOf, type Paise } from '@salon/core'
import type { CollectionConfig, Payload } from 'payload'
import { salonData } from '../_shared/access'
import { moneyField } from '../_shared/fields'

export const PAYMENT_MODES = ['upi', 'cash', 'card', 'payment-link', 'wallet', 'package', 'mixed'] as const
export type PaymentMode = (typeof PAYMENT_MODES)[number]

export const Visits: CollectionConfig = {
  slug: 'visits',
  admin: { defaultColumns: ['createdAt', 'customer', 'staff', 'total', 'paidStatus'] },
  access: salonData,
  fields: [
    { name: 'customer', type: 'relationship', relationTo: 'customers', required: true, index: true },
    { name: 'appointment', type: 'relationship', relationTo: 'appointments' },
    { name: 'staff', type: 'relationship', relationTo: 'users', index: true },
    {
      name: 'lines',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        { name: 'service', type: 'relationship', relationTo: 'services' },
        { name: 'name', type: 'text', required: true },
        moneyField('price'),
        { name: 'quantity', type: 'number', defaultValue: 1, min: 1 },
      ],
    },
    moneyField('subtotal'),
    moneyField('manualDiscount'),
    { name: 'reward', type: 'relationship', relationTo: 'rewards' },
    moneyField('rewardDiscount'),
    moneyField('walletApplied'),
    { name: 'customerPackage', type: 'relationship', relationTo: 'customer-packages' },
    moneyField('packageCovered'),
    moneyField('total', { admin: { description: 'Amount actually paid / due (paise)' } }),
    { name: 'paymentMode', type: 'select', options: [...PAYMENT_MODES], defaultValue: 'upi' },
    { name: 'payment', type: 'relationship', relationTo: 'payments' },
    { name: 'paidStatus', type: 'select', defaultValue: 'paid', options: ['paid', 'pending'], index: true },
    { name: 'design', type: 'relationship', relationTo: 'designs' },
    { name: 'designName', type: 'text' },
    { name: 'photos', type: 'upload', relationTo: 'media', hasMany: true },
    { name: 'isFirstVisit', type: 'checkbox', defaultValue: false },
    { name: 'notes', type: 'textarea' },
  ],
}

export * from './checkout'

import { type CheckoutInput, computeCheckout } from './checkout'

export interface CheckoutRequest extends CheckoutInput {
  customerId: ID
  staffId?: ID | null
  appointmentId?: ID | null
  rewardId?: ID | null
  customerPackageId?: ID | null
  paymentMode: PaymentMode
  /** When payment happens through a link/QR that confirms later */
  paymentPending?: boolean
  designId?: ID | null
  designName?: string
  notes?: string
}

export interface VisitDoc {
  id: ID
  customer: ID | { id: ID }
  staff?: ID | { id: ID } | null
  total: Paise
  subtotal: Paise
  reward?: ID | { id: ID } | null
  walletApplied?: Paise | null
  customerPackage?: ID | { id: ID } | null
  packageCovered?: Paise | null
  payment?: ID | { id: ID } | null
  paidStatus?: 'paid' | 'pending'
  lines: { service?: ID | { id: ID } | null; name: string; price: Paise; quantity?: number | null }[]
  photos?: (ID | { id: ID })[] | null
  designName?: string | null
  design?: ID | { id: ID } | null
  isFirstVisit?: boolean | null
  createdAt: string
}

/** Records a completed visit and emits `visit.completed`. Returns the visit and totals. */
export const completeVisit = async (payload: Payload, tenant: ID, req: CheckoutRequest) => {
  const repo = forTenant(payload, tenant)
  const totals = computeCheckout(req)
  const previous = await repo.count('visits', { customer: { equals: req.customerId } })
  const visit = await repo.create<VisitDoc>('visits', {
    customer: req.customerId,
    staff: req.staffId ?? undefined,
    appointment: req.appointmentId ?? undefined,
    lines: req.lines.map((l) => ({ service: l.serviceId, name: l.name, price: l.price, quantity: l.quantity ?? 1 })),
    ...totals,
    reward: totals.rewardDiscount > 0 ? (req.rewardId ?? undefined) : undefined,
    customerPackage: totals.packageCovered > 0 ? (req.customerPackageId ?? undefined) : undefined,
    paymentMode: req.paymentMode,
    paidStatus: req.paymentPending && totals.total > 0 ? 'pending' : 'paid',
    design: req.designId ?? undefined,
    designName: req.designName,
    isFirstVisit: previous === 0,
    notes: req.notes,
  })
  if (req.appointmentId) await repo.update('appointments', req.appointmentId, { status: 'completed' })
  await emit(payload, {
    tenant,
    type: 'visit.completed',
    actorType: 'staff',
    actorId: req.staffId ?? undefined,
    payload: {
      visitId: visit.id,
      customerId: req.customerId,
      total: totals.subtotal - totals.manualDiscount - totals.rewardDiscount,
      serviceIds: req.lines.map((l) => l.serviceId).filter((x): x is ID => x != null),
      staffId: req.staffId ?? undefined,
      isFirstVisit: previous === 0,
    },
  })
  return { visit, totals }
}

export const attachPhotos = async (payload: Payload, tenant: ID, visitId: ID, mediaIds: ID[], designName?: string) => {
  const repo = forTenant(payload, tenant)
  const visit = await repo.findByID<VisitDoc>('visits', visitId)
  if (!visit) return null
  const existing = (visit.photos ?? []).map((p) => idOf(p)) as ID[]
  return repo.update<VisitDoc>('visits', visitId, {
    photos: [...existing, ...mediaIds],
    ...(designName ? { designName } : {}),
  })
}

export const visitsModule = defineModule({
  key: 'visits',
  feature: 'visits',
  collections: [Visits],
  tenantCollections: ['visits'],
  on: {
    'payment.captured': async ({ payload, event }) => {
      if (event.payload.kind !== 'visit') return
      const repo = forTenant(payload, event.tenant)
      const visit = await repo.findOne<VisitDoc>('visits', { payment: { equals: event.payload.paymentId } })
      if (visit && visit.paidStatus !== 'paid') await repo.update('visits', visit.id, { paidStatus: 'paid' })
    },
  },
})
