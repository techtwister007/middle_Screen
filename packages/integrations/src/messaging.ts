import { waDigits } from '@salon/core'

export type MessageCategory = 'utility' | 'marketing' | 'authentication' | 'service'

export interface OutgoingMessage {
  /** E.164 phone */
  to: string
  /** Template key, e.g. booking_confirmed */
  template: string
  category: MessageCategory
  language: string
  /** Rendered text (used by fake/click-to-chat and as the template body) */
  body: string
  variables?: Record<string, string>
  buttonUrl?: string
  imageUrl?: string
  /** Sender identity: the salon's WhatsApp number when it has its own */
  from?: string
}

export interface SendResult {
  providerId: string
  status: 'sent' | 'queued' | 'failed'
  /** Cost in paise as charged by Meta / the provider */
  cost: number
  error?: string
}

export interface MessagingProvider {
  name: string
  send(message: OutgoingMessage): Promise<SendResult>
}

/**
 * Approximate Meta per-message prices for India in paise. Configure exact values per provider
 * with env vars; these are only used when no override is set.
 */
export const messagePrice = (category: MessageCategory): number => {
  const env = (k: string, d: number) => (process.env[k] ? Number(process.env[k]) : d)
  switch (category) {
    case 'marketing':
      return env('WA_PRICE_MARKETING_PAISE', 79)
    case 'utility':
      return env('WA_PRICE_UTILITY_PAISE', 12)
    case 'authentication':
      return env('WA_PRICE_AUTH_PAISE', 12)
    default:
      return 0
  }
}

/** Keeps messages in memory. Used in development, tests and demo mode. */
export class FakeMessaging implements MessagingProvider {
  name = 'fake'
  static outbox: (OutgoingMessage & { at: string; id: string })[] = []
  async send(message: OutgoingMessage): Promise<SendResult> {
    const id = `fake_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    FakeMessaging.outbox.push({ ...message, at: new Date().toISOString(), id })
    if (FakeMessaging.outbox.length > 500) FakeMessaging.outbox.shift()
    return { providerId: id, status: 'sent', cost: messagePrice(message.category) }
  }
  static clear() {
    FakeMessaging.outbox = []
  }
  static to(phone: string) {
    return FakeMessaging.outbox.filter((m) => m.to === phone)
  }
}

/**
 * Generic adapter for an official WhatsApp Business Solution Provider (AiSensy, Interakt, WATI, Gupshup).
 * Each BSP has a slightly different payload; set WHATSAPP_API_URL to a small proxy or adjust `toBody`.
 */
export class HttpWhatsApp implements MessagingProvider {
  name = 'whatsapp-http'
  constructor(
    private url = process.env.WHATSAPP_API_URL ?? '',
    private apiKey = process.env.WHATSAPP_API_KEY ?? '',
  ) {}
  toBody(m: OutgoingMessage) {
    return {
      to: waDigits(m.to),
      template: m.template,
      language: m.language,
      category: m.category,
      variables: m.variables ?? {},
      buttonUrl: m.buttonUrl,
      imageUrl: m.imageUrl,
      from: m.from,
    }
  }
  async send(m: OutgoingMessage): Promise<SendResult> {
    if (!this.url) return { providerId: '', status: 'failed', cost: 0, error: 'WHATSAPP_API_URL not set' }
    try {
      const res = await fetch(this.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify(this.toBody(m)),
      })
      if (!res.ok) return { providerId: '', status: 'failed', cost: 0, error: `HTTP ${res.status}` }
      const json = (await res.json().catch(() => ({}))) as { id?: string; messageId?: string }
      return { providerId: json.id ?? json.messageId ?? '', status: 'sent', cost: messagePrice(m.category) }
    } catch (err) {
      return { providerId: '', status: 'failed', cost: 0, error: (err as Error).message }
    }
  }
}

/** wa.me link with a prefilled message: the zero-cost fallback that always works. */
export const clickToChat = (phone: string, text: string) => `https://wa.me/${waDigits(phone)}?text=${encodeURIComponent(text)}`

/** WhatsApp share sheet without a recipient (customer picks a contact or Status). */
export const whatsappShare = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`

let messaging: MessagingProvider | null = null
export const getMessaging = (): MessagingProvider => {
  if (!messaging) messaging = process.env.MESSAGING_PROVIDER === 'live' ? new HttpWhatsApp() : new FakeMessaging()
  return messaging
}
export const setMessaging = (provider: MessagingProvider) => {
  messaging = provider
}
