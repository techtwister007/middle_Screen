/**
 * Checks configuration at server start. In production, missing or unsafe settings stop the app
 * (a clear crash at deploy beats silent misbehaviour); in development they are only warnings.
 */
export interface EnvProblem {
  level: 'error' | 'warn'
  message: string
}

const WEAK = /change-me|changeme|secret|password|^dev/i

export const checkEnv = (env: NodeJS.ProcessEnv = process.env): EnvProblem[] => {
  const prod = env.NODE_ENV === 'production'
  const problems: EnvProblem[] = []
  const need = (key: string, why: string) => {
    if (!env[key]) problems.push({ level: prod ? 'error' : 'warn', message: `${key} is not set: ${why}` })
  }
  need('DATABASE_URL', 'the app cannot store anything')
  need('PAYLOAD_SECRET', 'staff logins cannot be signed')
  need('CUSTOMER_SESSION_SECRET', 'customer logins cannot be signed')
  need('PUBLIC_URL', 'links in WhatsApp messages would point to localhost')
  for (const key of ['PAYLOAD_SECRET', 'CUSTOMER_SESSION_SECRET']) {
    const v = env[key] ?? ''
    if (v && (v.length < 32 || WEAK.test(v))) problems.push({ level: prod ? 'error' : 'warn', message: `${key} is weak: use at least 32 random characters` })
  }
  if (prod) {
    if (env.PUBLIC_URL && !env.PUBLIC_URL.startsWith('https://')) problems.push({ level: 'error', message: 'PUBLIC_URL must start with https://' })
    if (env.EVENTS_MODE === 'queue' && !env.CRON_SECRET) problems.push({ level: 'error', message: 'CRON_SECRET is required so only Vercel Cron can run jobs' })
    if (env.EVENTS_MODE !== 'queue')
      problems.push({ level: 'warn', message: 'EVENTS_MODE is not "queue": delayed reminders run inline and may be lost on timeouts' })
    if (env.ALLOW_FIXED_OTP_ON_LOCALHOST === '1') problems.push({ level: 'error', message: 'ALLOW_FIXED_OTP_ON_LOCALHOST is for CI only; remove it' })
    else if (env.OTP_FIXED_CODE) problems.push({ level: 'warn', message: 'OTP_FIXED_CODE is set but ignored in production; remove it' })
    if (env.MESSAGING_PROVIDER !== 'live') problems.push({ level: 'warn', message: 'MESSAGING_PROVIDER is not "live": WhatsApp messages are only logged' })
    else if (!env.WHATSAPP_API_URL || !env.WHATSAPP_API_KEY)
      problems.push({ level: 'error', message: 'WHATSAPP_API_URL and WHATSAPP_API_KEY are required for live messaging' })
    if (env.PAYMENTS_PROVIDER !== 'live') problems.push({ level: 'warn', message: 'PAYMENTS_PROVIDER is not "live": payments use the test checkout' })
    else if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET || !env.RAZORPAY_WEBHOOK_SECRET)
      problems.push({ level: 'error', message: 'RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET are required for live payments' })
    if (!env.S3_BUCKET) problems.push({ level: 'error', message: 'S3_BUCKET (Supabase Storage) is required: serverless disks are not persistent' })
  }
  return problems
}

export const assertEnv = () => {
  const problems = checkEnv()
  for (const p of problems) console[p.level === 'error' ? 'error' : 'warn'](`[config] ${p.message}`)
  const fatal = problems.filter((p) => p.level === 'error')
  if (fatal.length && process.env.SKIP_ENV_CHECK !== '1') throw new Error(`Configuration errors:\n- ${fatal.map((p) => p.message).join('\n- ')}`)
}
