import { addDays, defineModule, emit, forTenant, type ID, idOf, type Paise, shortCode } from '@salon/core'
import { getPayments } from '@salon/integrations'
import type { CollectionConfig, Payload } from 'payload'
import { managersOnly, salonData } from '../_shared/access'
import { moneyField, phoneField } from '../_shared/fields'

export const PAYMENT_KINDS = ['deposit', 'visit', 'package', 'gift-card', 'wallet-topup'] as const
export type PaymentKind = (typeof PAYMENT_KINDS)[number]

export const Payments: CollectionConfig = {
  slug: 'payments',
  admin: { defaultColumns: ['createdAt', 'kind', 'amount', 'status'] },
  access: { ...salonData, delete: () => false },
  fields: [
    { name: 'kind', type: 'select', required: true, options: [...PAYMENT_KINDS], index: true },
    moneyField('amount', { required: true }),
    { name: 'status', type: 'select', defaultValue: 'created', index: true, options: ['created', 'captured', 'failed', 'refunded', 'expired'] },
    { name: 'customer', type: 'relationship', relationTo: 'customers' },
    { name: 'appointment', type: 'relationship', relationTo: 'appointments' },
    { name: 'visit', type: 'relationship', relationTo: 'visits' },
    { name: 'package', type: 'relationship', relationTo: 'packages' },
    { name: 'giftCard', type: 'relationship', relationTo: 'gift-cards' },
    { name: 'description', type: 'text' },
    { name: 'provider', type: 'text' },
    { name: 'providerLinkId', type: 'text', index: true },
    { name: 'providerPaymentId', type: 'text', index: true },
    { name: 'linkUrl', type: 'text' },
    { name: 'upiUri', type: 'text' },
    { name: 'capturedAt', type: 'date' },
    { name: 'refundId', type: 'text' },
    { name: 'refundedAt', type: 'date' },
    { name: 'refundNote', type: 'text' },
  ],
}

/**
 * Refunds a captured payment in full through the salon's own gateway account. Idempotent: a payment that is
 * already refunded is left alone. Returns the updated payment, or null if there was nothing to refund.
 */
export const refundPayment = async (payload: Payload, tenant: ID, paymentId: ID, reason: string) => {
  const repo = forTenant(payload, tenant)
  const payment = await repo.findByID<PaymentDoc & { providerPaymentId?: string | null }>('payments', paymentId)
  if (payment?.status !== 'captured') return null
  const salon = (await payload.findByID({ collection: 'salons' as never, id: tenant, depth: 0, overrideAccess: true })) as unknown as {
    razorpayAccountId?: string | null
  }
  const result = await getPayments().refund({
    providerPaymentId: payment.providerPaymentId ?? String(payment.id),
    amount: payment.amount,
    accountId: salon.razorpayAccountId,
    reason,
  })
  if (result.status === 'failed') {
    await repo.update('payments', payment.id, { refundNote: `Refund failed: ${result.error ?? 'unknown'}` })
    return null
  }
  return repo.update('payments', payment.id, { status: 'refunded', refundId: result.id, refundedAt: new Date().toISOString(), refundNote: reason })
}

/** Append-only wallet ledger. Balance = sum of entries. */
export const WalletEntries: CollectionConfig = {
  slug: 'wallet-entries',
  admin: { defaultColumns: ['createdAt', 'customer', 'amount', 'reason'] },
  access: { read: salonData.read, create: managersOnly, update: () => false, delete: () => false },
  fields: [
    { name: 'customer', type: 'relationship', relationTo: 'customers', required: true, index: true },
    { name: 'amount', type: 'number', required: true, admin: { description: 'Signed paise: credit positive, debit negative' } },
    { name: 'reason', type: 'select', required: true, options: ['top-up', 'bonus', 'gift-card', 'visit', 'refund', 'adjustment', 'reward'] },
    { name: 'reference', type: 'text' },
  ],
}

export const GiftCards: CollectionConfig = {
  slug: 'gift-cards',
  admin: { useAsTitle: 'code' },
  access: salonData,
  fields: [
    { name: 'code', type: 'text', required: true, index: true },
    moneyField('value', { required: true }),
    { name: 'kind', type: 'select', defaultValue: 'gift', options: ['gift', 'referral-invite'] },
    { name: 'buyer', type: 'relationship', relationTo: 'customers' },
    phoneField('recipientPhone'),
    { name: 'recipientName', type: 'text' },
    { name: 'message', type: 'textarea' },
    { name: 'occasion', type: 'text' },
    { name: 'status', type: 'select', defaultValue: 'pending', options: ['pending', 'active', 'redeemed', 'expired'] },
    { name: 'redeemedBy', type: 'relationship', relationTo: 'customers' },
    { name: 'expiresAt', type: 'date' },
  ],
}

export const CustomerPackages: CollectionConfig = {
  slug: 'customer-packages',
  access: salonData,
  fields: [
    { name: 'customer', type: 'relationship', relationTo: 'customers', required: true, index: true },
    { name: 'package', type: 'relationship', relationTo: 'packages', required: true },
    {
      name: 'remaining',
      type: 'array',
      fields: [
        { name: 'service', type: 'relationship', relationTo: 'services', required: true },
        { name: 'quantity', type: 'number', defaultValue: 0 },
      ],
    },
    { name: 'expiresAt', type: 'date' },
    { name: 'status', type: 'select', defaultValue: 'active', options: ['active', 'used', 'expired'] },
  ],
}

interface PaymentDoc {
  id: ID
  kind: PaymentKind
  amount: Paise
  status: string
  customer?: ID | { id: ID } | null
  appointment?: ID | { id: ID } | null
  visit?: ID | { id: ID } | null
  package?: ID | { id: ID } | null
  giftCard?: ID | { id: ID } | null
  providerLinkId?: string | null
}

export interface CreatePaymentInput {
  kind: PaymentKind
  amount: Paise
  customerId?: ID
  appointmentId?: ID
  visitId?: ID
  packageId?: ID
  giftCardId?: ID
  description: string
  customer?: { name?: string; phone?: string }
  callbackUrl?: string
}

export const createPayment = async (payload: Payload, tenant: ID, input: CreatePaymentInput) => {
  const repo = forTenant(payload, tenant)
  const payment = await repo.create<PaymentDoc>('payments', {
    kind: input.kind,
    amount: input.amount,
    status: 'created',
    customer: input.customerId,
    appointment: input.appointmentId,
    visit: input.visitId,
    package: input.packageId,
    giftCard: input.giftCardId,
    description: input.description,
  })
  const salon = (await payload.findByID({ collection: 'salons' as never, id: tenant, depth: 0, overrideAccess: true })) as {
    razorpayAccountId?: string | null
  }
  const provider = getPayments()
  const link = await provider.createLink({
    amount: input.amount,
    description: input.description,
    referenceId: `${tenant}-${payment.id}`,
    customer: input.customer,
    accountId: salon.razorpayAccountId,
    callbackUrl: input.callbackUrl,
    expireBy: addDays(new Date(), 2),
  })
  const updated = await repo.update<PaymentDoc>('payments', payment.id, {
    provider: provider.name,
    providerLinkId: link.id,
    linkUrl: link.url,
    upiUri: link.upiUri,
  })
  return { payment: updated ?? payment, link }
}

/** Marks a payment captured. Safe to call twice (webhook retries). */
export const capturePayment = async (payload: Payload, tenant: ID, paymentId: ID, providerPaymentId?: string) => {
  const repo = forTenant(payload, tenant)
  const payment = await repo.findByID<PaymentDoc>('payments', paymentId)
  if (!payment) return null
  if (payment.status === 'captured') return payment
  const updated = await repo.update<PaymentDoc>('payments', paymentId, {
    status: 'captured',
    providerPaymentId,
    capturedAt: new Date().toISOString(),
  })
  await emit(payload, {
    tenant,
    type: 'payment.captured',
    payload: { paymentId, kind: payment.kind, amount: payment.amount, customerId: idOf(payment.customer) ?? undefined },
  })
  return updated
}

/** Finds the payment for a provider link (webhook) across salons and captures it. */
export const captureByProviderLink = async (payload: Payload, providerLinkId: string, providerPaymentId?: string) => {
  const res = await payload.find({
    collection: 'payments' as never,
    overrideAccess: true,
    depth: 0,
    limit: 1,
    where: { providerLinkId: { equals: providerLinkId } },
  })
  const doc = res.docs[0] as unknown as (PaymentDoc & { tenant: ID | { id: ID } }) | undefined
  if (!doc) return null
  return capturePayment(payload, idOf(doc.tenant) as ID, doc.id, providerPaymentId)
}

export const walletBalance = async (payload: Payload, tenant: ID, customerId: ID): Promise<Paise> => {
  const res = await forTenant(payload, tenant).find<{ amount: number }>('wallet-entries', {
    where: { customer: { equals: customerId } },
    limit: 10000,
  })
  return res.docs.reduce((sum, e) => sum + e.amount, 0)
}

export const addWalletEntry = async (payload: Payload, tenant: ID, input: { customerId: ID; amount: number; reason: string; reference?: string }) => {
  if (input.amount < 0) {
    const balance = await walletBalance(payload, tenant, input.customerId)
    if (balance + input.amount < 0) throw new Error('Insufficient wallet balance')
  }
  return forTenant(payload, tenant).create('wallet-entries', {
    customer: input.customerId,
    amount: input.amount,
    reason: input.reason,
    reference: input.reference,
  })
}

export const createGiftCard = async (
  payload: Payload,
  tenant: ID,
  input: {
    buyerId?: ID
    value: Paise
    recipientPhone: string
    recipientName?: string
    message?: string
    occasion?: string
    kind?: 'gift' | 'referral-invite'
    active?: boolean
  },
) =>
  forTenant(payload, tenant).create<{ id: ID; code: string; value: Paise }>('gift-cards', {
    code: shortCode(8),
    value: input.value,
    kind: input.kind ?? 'gift',
    buyer: input.buyerId,
    recipientPhone: input.recipientPhone,
    recipientName: input.recipientName,
    message: input.message,
    occasion: input.occasion,
    status: input.active ? 'active' : 'pending',
    expiresAt: addDays(new Date(), 365).toISOString(),
  })

export const redeemGiftCard = async (payload: Payload, tenant: ID, code: string, customerId: ID) => {
  const repo = forTenant(payload, tenant)
  const card = await repo.findOne<{ id: ID; status: string; value: Paise; expiresAt?: string }>('gift-cards', {
    code: { equals: code.toUpperCase() },
  })
  if (card?.status !== 'active') throw new Error('This gift card is not valid')
  if (card.expiresAt && new Date(card.expiresAt) < new Date()) throw new Error('This gift card has expired')
  await repo.update('gift-cards', card.id, { status: 'redeemed', redeemedBy: customerId })
  await addWalletEntry(payload, tenant, { customerId, amount: card.value, reason: 'gift-card', reference: code })
  return card
}

export const paymentsModule = defineModule({
  key: 'payments',
  feature: 'payments',
  collections: [Payments, WalletEntries, GiftCards, CustomerPackages],
  tenantCollections: ['payments', 'wallet-entries', 'gift-cards', 'customer-packages'],
  on: {
    'booking.cancelled': async ({ payload, event }) => {
      // Deposits come back in full when the salon cancels, or when the customer cancels early enough.
      const repo = forTenant(payload, event.tenant)
      const deposit = await repo.findOne<{ id: ID }>('payments', {
        and: [{ appointment: { equals: event.payload.appointmentId } }, { kind: { equals: 'deposit' } }, { status: { equals: 'captured' } }],
      })
      if (!deposit) return
      const salon = (await payload.findByID({ collection: 'salons' as never, id: event.tenant, depth: 0, overrideAccess: true })) as unknown as {
        settings?: { depositRefundHours?: number | null } | null
      }
      const windowHours = salon.settings?.depositRefundHours ?? 24
      const hoursBefore = (new Date(event.payload.start).getTime() - new Date(event.occurredAt).getTime()) / 3_600_000
      if (event.actorType === 'customer' && hoursBefore < windowHours) return
      await refundPayment(payload, event.tenant, deposit.id, event.actorType === 'customer' ? 'Cancelled by customer in time' : 'Cancelled by salon')
    },
    'payment.captured': async ({ payload, event }) => {
      const repo = forTenant(payload, event.tenant)
      const payment = await repo.findByID<PaymentDoc>('payments', event.payload.paymentId)
      if (!payment) return
      const customerId = idOf(payment.customer)
      if (payment.kind === 'wallet-topup' && customerId) {
        await addWalletEntry(payload, event.tenant, { customerId, amount: payment.amount, reason: 'top-up', reference: String(payment.id) })
      }
      if (payment.kind === 'package' && customerId && payment.package) {
        const pkg = await repo.findByID<{
          id: ID
          kind: string
          creditValue?: number
          validityDays?: number
          items?: { service: ID | { id: ID }; quantity: number }[]
        }>('packages', idOf(payment.package) as ID)
        if (!pkg) return
        if (pkg.kind === 'prepaid-credit') {
          await addWalletEntry(payload, event.tenant, {
            customerId,
            amount: pkg.creditValue || payment.amount,
            reason: 'top-up',
            reference: `package:${pkg.id}`,
          })
        } else {
          await repo.create('customer-packages', {
            customer: customerId,
            package: pkg.id,
            remaining: (pkg.items ?? []).map((i) => ({ service: idOf(i.service), quantity: i.quantity })),
            expiresAt: addDays(new Date(), pkg.validityDays ?? 180).toISOString(),
            status: 'active',
          })
        }
      }
      if (payment.kind === 'gift-card' && payment.giftCard) {
        const card = await repo.findByID<{ id: ID; recipientPhone: string; status: string }>('gift-cards', idOf(payment.giftCard) as ID)
        if (card && card.status === 'pending') {
          await repo.update('gift-cards', card.id, { status: 'active' })
          await emit(payload, { tenant: event.tenant, type: 'gift.sent', payload: { giftCardId: card.id, recipientPhone: card.recipientPhone } })
        }
      }
    },
    'visit.completed': async ({ payload, event }) => {
      const repo = forTenant(payload, event.tenant)
      const visit = await repo.findByID<{
        id: ID
        walletApplied?: number
        customerPackage?: ID | { id: ID } | null
        packageCovered?: number
        lines: { service?: ID | { id: ID } | null; quantity?: number | null }[]
      }>('visits', event.payload.visitId)
      if (!visit) return
      if (visit.walletApplied && visit.walletApplied > 0) {
        const already = await repo.count('wallet-entries', { reference: { equals: `visit:${visit.id}` } })
        if (!already)
          await addWalletEntry(payload, event.tenant, {
            customerId: event.payload.customerId,
            amount: -visit.walletApplied,
            reason: 'visit',
            reference: `visit:${visit.id}`,
          })
      }
      if (visit.customerPackage && visit.packageCovered) {
        const cp = await repo.findByID<{ id: ID; remaining: { service: ID | { id: ID }; quantity: number }[] }>(
          'customer-packages',
          idOf(visit.customerPackage) as ID,
        )
        if (!cp) return
        const used = new Set(visit.lines.map((l) => String(idOf(l.service))))
        const remaining = cp.remaining.map((r) => ({
          service: idOf(r.service),
          quantity: used.has(String(idOf(r.service))) ? Math.max(0, r.quantity - 1) : r.quantity,
        }))
        await repo.update('customer-packages', cp.id, {
          remaining,
          status: remaining.every((r) => r.quantity === 0) ? 'used' : 'active',
        })
      }
    },
  },
})
