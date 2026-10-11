import { createHmac, timingSafeEqual } from 'node:crypto'

export interface PaymentLinkInput {
  amount: number // paise
  description: string
  referenceId: string
  customer?: { name?: string; phone?: string }
  /** The salon's connected Razorpay account (partner/sub-merchant). Money settles there, never with us. */
  accountId?: string | null
  callbackUrl?: string
  expireBy?: Date
}

export interface PaymentLink {
  id: string
  url: string
  /** UPI deep link usable as a QR code at the counter */
  upiUri?: string
  status: 'created' | 'paid' | 'expired' | 'cancelled'
}

export interface RefundInput {
  providerPaymentId: string
  amount: number // paise
  accountId?: string | null
  reason?: string
}

export interface PaymentProvider {
  name: string
  createLink(input: PaymentLinkInput): Promise<PaymentLink>
  /** Refunds a captured payment back to the customer, from the salon's own account. */
  refund(input: RefundInput): Promise<{ id: string; status: 'processed' | 'pending' | 'failed'; error?: string }>
  verifyWebhook(rawBody: string, signature: string | null): boolean
}

export class FakePayments implements PaymentProvider {
  name = 'fake'
  static links = new Map<string, PaymentLink & { input: PaymentLinkInput }>()
  async createLink(input: PaymentLinkInput): Promise<PaymentLink> {
    const id = `plink_fake_${input.referenceId}`
    const base = process.env.PUBLIC_URL ?? 'http://localhost:3000'
    const link: PaymentLink = {
      id,
      url: `${base}/pay/test/${encodeURIComponent(id)}`,
      upiUri: `upi://pay?pa=demo@upi&pn=Demo%20Salon&am=${(input.amount / 100).toFixed(2)}&tn=${encodeURIComponent(input.description)}`,
      status: 'created',
    }
    FakePayments.links.set(id, { ...link, input })
    return link
  }
  static refunds: (RefundInput & { id: string })[] = []
  async refund(input: RefundInput) {
    const id = `rfnd_fake_${Date.now()}`
    FakePayments.refunds.push({ ...input, id })
    return { id, status: 'processed' as const }
  }
  verifyWebhook() {
    return true
  }
}

export class RazorpayPayments implements PaymentProvider {
  name = 'razorpay'
  constructor(
    private keyId = process.env.RAZORPAY_KEY_ID ?? '',
    private keySecret = process.env.RAZORPAY_KEY_SECRET ?? '',
    private webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET ?? '',
  ) {}
  async createLink(input: PaymentLinkInput): Promise<PaymentLink> {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      authorization: `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64')}`,
    }
    // Partner integration: act on the salon's own account so funds settle with the salon.
    if (input.accountId) headers['X-Razorpay-Account'] = input.accountId
    const res = await fetch('https://api.razorpay.com/v1/payment_links', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        amount: input.amount,
        currency: 'INR',
        description: input.description,
        reference_id: input.referenceId,
        customer: input.customer ? { name: input.customer.name, contact: input.customer.phone } : undefined,
        notify: { sms: false, email: false },
        callback_url: input.callbackUrl,
        callback_method: input.callbackUrl ? 'get' : undefined,
        expire_by: input.expireBy ? Math.floor(input.expireBy.getTime() / 1000) : undefined,
        upi_link: false,
      }),
    })
    if (!res.ok) throw new Error(`Razorpay error ${res.status}: ${await res.text()}`)
    const json = (await res.json()) as { id: string; short_url: string; status: string }
    return { id: json.id, url: json.short_url, status: json.status === 'paid' ? 'paid' : 'created' }
  }
  async refund(input: RefundInput) {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      authorization: `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64')}`,
    }
    if (input.accountId) headers['X-Razorpay-Account'] = input.accountId
    try {
      const res = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(input.providerPaymentId)}/refund`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ amount: input.amount, speed: 'normal', notes: input.reason ? { reason: input.reason } : undefined }),
      })
      const json = (await res.json().catch(() => ({}))) as { id?: string; status?: string; error?: { description?: string } }
      if (!res.ok) return { id: '', status: 'failed' as const, error: json.error?.description ?? `HTTP ${res.status}` }
      return { id: json.id ?? '', status: json.status === 'processed' ? ('processed' as const) : ('pending' as const) }
    } catch (err) {
      return { id: '', status: 'failed' as const, error: (err as Error).message }
    }
  }
  verifyWebhook(rawBody: string, signature: string | null) {
    if (!signature || !this.webhookSecret) return false
    const expected = createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex')
    const a = Buffer.from(expected)
    const b = Buffer.from(signature)
    return a.length === b.length && timingSafeEqual(a, b)
  }
}

let payments: PaymentProvider | null = null
export const getPayments = (): PaymentProvider => {
  if (!payments) payments = process.env.PAYMENTS_PROVIDER === 'live' ? new RazorpayPayments() : new FakePayments()
  return payments
}
export const setPayments = (p: PaymentProvider) => {
  payments = p
}

/** Static UPI URI for the counter QR when a salon has no payment gateway connected. */
export const upiUri = (vpa: string, payeeName: string, amountPaise: number, note: string) =>
  `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(payeeName)}&am=${(amountPaise / 100).toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}`
