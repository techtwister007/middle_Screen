import { createHash, randomInt } from 'node:crypto'
import { type ID, forTenant, normalizePhone } from '@salon/core'
import type { Payload } from 'payload'

const OTP_TTL_MS = 5 * 60 * 1000
const MAX_ATTEMPTS = 3
const MAX_SENDS_PER_HOUR = 5

const hash = (code: string, phone: string) =>
  createHash('sha256')
    .update(`${process.env.CUSTOMER_SESSION_SECRET ?? 'dev'}:${phone}:${code}`)
    .digest('hex')

export class OtpError extends Error {
  constructor(
    public code: 'invalid-phone' | 'rate-limited' | 'expired' | 'wrong-code' | 'too-many-attempts',
    message: string,
  ) {
    super(message)
  }
}

/** Creates a one-time code. The caller delivers it (WhatsApp, SMS fallback). */
export const createOtp = async (payload: Payload, tenant: ID, rawPhone: string, purpose = 'login') => {
  const phone = normalizePhone(rawPhone)
  if (!phone) throw new OtpError('invalid-phone', 'Please enter a valid mobile number')
  const repo = forTenant(payload, tenant)
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const recent = await repo.count('otp-codes', { and: [{ phone: { equals: phone } }, { createdAt: { greater_than: hourAgo } }] })
  if (recent >= MAX_SENDS_PER_HOUR) throw new OtpError('rate-limited', 'Too many codes requested. Try again in a while.')
  const code =
    process.env.OTP_FIXED_CODE && process.env.NODE_ENV !== 'production'
      ? process.env.OTP_FIXED_CODE
      : String(randomInt(0, 1_000_000)).padStart(6, '0')
  await repo.create('otp-codes', {
    phone,
    purpose,
    codeHash: hash(code, phone),
    expiresAt: new Date(Date.now() + OTP_TTL_MS).toISOString(),
    attempts: 0,
    consumed: false,
  })
  return { phone, code }
}

export const verifyOtp = async (payload: Payload, tenant: ID, rawPhone: string, code: string, purpose = 'login') => {
  const phone = normalizePhone(rawPhone)
  if (!phone) throw new OtpError('invalid-phone', 'Please enter a valid mobile number')
  const repo = forTenant(payload, tenant)
  const { docs } = await repo.find<{ id: ID; codeHash: string; expiresAt: string; attempts: number; consumed: boolean }>(
    'otp-codes',
    {
      where: { and: [{ phone: { equals: phone } }, { purpose: { equals: purpose } }, { consumed: { equals: false } }] },
      sort: '-createdAt',
      limit: 1,
    },
  )
  const found = docs[0] ?? null
  if (!found || new Date(found.expiresAt).getTime() < Date.now()) throw new OtpError('expired', 'This code has expired. Request a new one.')
  if (found.attempts >= MAX_ATTEMPTS) throw new OtpError('too-many-attempts', 'Too many wrong attempts. Request a new code.')
  if (found.codeHash !== hash(code.trim(), phone)) {
    await repo.update('otp-codes', found.id, { attempts: found.attempts + 1 })
    throw new OtpError('wrong-code', 'That code is not right. Please check and try again.')
  }
  await repo.update('otp-codes', found.id, { consumed: true })
  return phone
}
