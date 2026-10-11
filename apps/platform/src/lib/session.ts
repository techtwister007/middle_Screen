import 'server-only'
import { type ID } from '@salon/core'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const secret = () => new TextEncoder().encode(process.env.CUSTOMER_SESSION_SECRET || process.env.PAYLOAD_SECRET || 'dev')
const cookieName = (slug: string) => `cs_${slug}`
const MAX_AGE = 60 * 60 * 24 * 90

export interface CustomerSession {
  customerId: ID
  tenant: ID
  phone: string
}

export const createCustomerSession = async (slug: string, session: CustomerSession) => {
  const token = await new SignJWT({ cid: String(session.customerId), tid: String(session.tenant), ph: session.phone })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret())
  const jar = await cookies()
  jar.set(cookieName(slug), token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: MAX_AGE })
}

const toId = (v: string): ID => (/^\d+$/.test(v) ? Number(v) : v)

export const getCustomerSession = async (slug: string, tenant: ID): Promise<CustomerSession | null> => {
  const jar = await cookies()
  const token = jar.get(cookieName(slug))?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret())
    // A session is only valid for the salon that issued it.
    if (String(payload.tid) !== String(tenant)) return null
    return { customerId: toId(String(payload.cid)), tenant, phone: String(payload.ph) }
  } catch {
    return null
  }
}

export const clearCustomerSession = async (slug: string) => {
  const jar = await cookies()
  jar.delete(cookieName(slug))
}

/** First-touch attribution cookies (referral code and source), kept for 30 days. */
export const setAttribution = async (slug: string, data: { ref?: string; src?: string }) => {
  const jar = await cookies()
  if (data.ref) jar.set(`ref_${slug}`, data.ref, { path: '/', maxAge: 60 * 60 * 24 * 30, sameSite: 'lax' })
  if (data.src && !jar.get(`src_${slug}`)) jar.set(`src_${slug}`, data.src, { path: '/', maxAge: 60 * 60 * 24 * 30, sameSite: 'lax' })
}

export const getAttribution = async (slug: string) => {
  const jar = await cookies()
  return { ref: jar.get(`ref_${slug}`)?.value, src: jar.get(`src_${slug}`)?.value }
}
