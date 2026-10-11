import { waDigits } from '@salon/core'

/** Fallback channel for login codes when WhatsApp can't deliver (no WhatsApp, provider down). */
export interface SmsProvider {
  name: string
  sendOtp(to: string, code: string, brand: string): Promise<{ status: 'sent' | 'failed'; cost: number; providerId?: string; error?: string }>
}

const smsPrice = () => (process.env.SMS_PRICE_PAISE ? Number(process.env.SMS_PRICE_PAISE) : 20)

/** Keeps SMS in memory for development and tests. */
export class FakeSms implements SmsProvider {
  name = 'fake-sms'
  static outbox: { to: string; code: string; at: string }[] = []
  async sendOtp(to: string, code: string) {
    FakeSms.outbox.push({ to, code, at: new Date().toISOString() })
    if (FakeSms.outbox.length > 200) FakeSms.outbox.shift()
    return { status: 'sent' as const, cost: smsPrice(), providerId: `fake_sms_${Date.now()}` }
  }
  static clear() {
    FakeSms.outbox = []
  }
}

/**
 * MSG91 OTP API (DLT-registered template required in India). Set SMS_API_KEY and SMS_TEMPLATE_ID.
 * Other providers: swap this class; only `sendOtp` is used.
 */
export class Msg91Sms implements SmsProvider {
  name = 'msg91'
  constructor(
    private apiKey = process.env.SMS_API_KEY ?? '',
    private templateId = process.env.SMS_TEMPLATE_ID ?? '',
  ) {}
  async sendOtp(to: string, code: string) {
    if (!this.apiKey || !this.templateId) return { status: 'failed' as const, cost: 0, error: 'SMS_API_KEY / SMS_TEMPLATE_ID not set' }
    try {
      const res = await fetch(`https://control.msg91.com/api/v5/otp?template_id=${this.templateId}&mobile=${waDigits(to)}&otp=${code}`, {
        method: 'POST',
        headers: { authkey: this.apiKey, 'content-type': 'application/json' },
      })
      const json = (await res.json().catch(() => ({}))) as { type?: string; request_id?: string; message?: string }
      if (!res.ok || json.type === 'error') return { status: 'failed' as const, cost: 0, error: json.message ?? `HTTP ${res.status}` }
      return { status: 'sent' as const, cost: smsPrice(), providerId: json.request_id }
    } catch (err) {
      return { status: 'failed' as const, cost: 0, error: (err as Error).message }
    }
  }
}

let sms: SmsProvider | null = null
export const getSms = (): SmsProvider => {
  if (!sms) sms = process.env.SMS_PROVIDER === 'msg91' ? new Msg91Sms() : new FakeSms()
  return sms
}
export const setSms = (provider: SmsProvider) => {
  sms = provider
}
