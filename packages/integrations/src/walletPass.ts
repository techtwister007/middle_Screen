import { SignJWT, importPKCS8 } from 'jose'

export interface LoyaltyPassInput {
  objectId: string
  classId: string
  salonName: string
  customerName: string
  stamps: number
  stampsForReward: number
  points: number
  tier: string
  logoUrl?: string
  heroUrl?: string
  hexColor?: string
  barcodeValue: string
}

/**
 * Builds a "Save to Google Wallet" link for a loyalty card.
 * Requires GOOGLE_WALLET_ISSUER_ID, GOOGLE_WALLET_SA_EMAIL and GOOGLE_WALLET_SA_KEY (PKCS8 PEM).
 * Returns null when Google Wallet is not configured, so the button is simply hidden.
 */
export const googleWalletSaveUrl = async (input: LoyaltyPassInput): Promise<string | null> => {
  const issuer = process.env.GOOGLE_WALLET_ISSUER_ID
  const email = process.env.GOOGLE_WALLET_SA_EMAIL
  const key = process.env.GOOGLE_WALLET_SA_KEY
  if (!issuer || !email || !key) return null
  const privateKey = await importPKCS8(key.replace(/\\n/g, '\n'), 'RS256')
  const loyaltyObject = {
    id: `${issuer}.${input.objectId}`,
    classId: `${issuer}.${input.classId}`,
    state: 'ACTIVE',
    accountName: input.customerName,
    accountId: input.barcodeValue,
    loyaltyPoints: { label: 'Points', balance: { int: input.points } },
    secondaryLoyaltyPoints: { label: 'Stamps', balance: { string: `${input.stamps}/${input.stampsForReward}` } },
    barcode: { type: 'QR_CODE', value: input.barcodeValue },
    textModulesData: [{ header: 'Tier', body: input.tier }],
  }
  const loyaltyClass = {
    id: `${issuer}.${input.classId}`,
    issuerName: input.salonName,
    programName: `${input.salonName} Rewards`,
    programLogo: input.logoUrl ? { sourceUri: { uri: input.logoUrl } } : undefined,
    hexBackgroundColor: input.hexColor,
    reviewStatus: 'UNDER_REVIEW',
  }
  const token = await new SignJWT({
    iss: email,
    aud: 'google',
    typ: 'savetowallet',
    origins: [process.env.PUBLIC_URL ?? ''],
    payload: { loyaltyClasses: [loyaltyClass], loyaltyObjects: [loyaltyObject] },
  })
    .setProtectedHeader({ alg: 'RS256' })
    .sign(privateKey)
  return `https://pay.google.com/gp/v/save/${token}`
}
