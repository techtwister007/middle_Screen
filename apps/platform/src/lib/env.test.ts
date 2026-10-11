import { describe, expect, it } from 'vitest'
import { checkEnv } from './env'

const good = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgres://x',
  PAYLOAD_SECRET: 'a'.repeat(40),
  CUSTOMER_SESSION_SECRET: 'b'.repeat(40),
  PUBLIC_URL: 'https://glow.example',
  EVENTS_MODE: 'queue',
  CRON_SECRET: 'c'.repeat(32),
  MESSAGING_PROVIDER: 'live',
  WHATSAPP_API_URL: 'https://bsp',
  WHATSAPP_API_KEY: 'k',
  PAYMENTS_PROVIDER: 'live',
  RAZORPAY_KEY_ID: 'id',
  RAZORPAY_KEY_SECRET: 's',
  RAZORPAY_WEBHOOK_SECRET: 'w',
  S3_BUCKET: 'media',
} as unknown as NodeJS.ProcessEnv

describe('checkEnv', () => {
  it('passes a complete production config', () => {
    expect(checkEnv(good)).toEqual([])
  })
  it('blocks production with weak secrets, http links or missing storage', () => {
    const errors = checkEnv({ ...good, PAYLOAD_SECRET: 'change-me', PUBLIC_URL: 'http://x', S3_BUCKET: undefined } as NodeJS.ProcessEnv).filter(
      (p) => p.level === 'error',
    )
    expect(errors.map((e) => e.message.split(' ')[0])).toEqual(['PAYLOAD_SECRET', 'PUBLIC_URL', 'S3_BUCKET'])
  })
  it('only warns in development', () => {
    expect(checkEnv({ NODE_ENV: 'development' } as NodeJS.ProcessEnv).every((p) => p.level === 'warn')).toBe(true)
  })
})
