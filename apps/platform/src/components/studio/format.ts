/** "1 visit", "3 visits". Pass the plural when it isn't just +s. */
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** Human labels for share channels and link sources (never show raw enum values). */
export const CHANNEL_LABEL: Record<string, string> = {
  instagram: 'Instagram',
  'whatsapp-status': 'WhatsApp Status',
  whatsapp: 'WhatsApp',
  other: 'somewhere else',
}

export const SOURCE_LABEL: Record<string, string> = {
  qr: 'QR code in the salon',
  instagram: 'Instagram',
  poster: 'Poster or flyer',
  partner: 'Partner shop',
  influencer: 'Influencer',
  google: 'Google',
  whatsapp: 'WhatsApp',
  other: 'Other',
}

export const PAY_LABEL: Record<string, string> = {
  upi: 'UPI',
  cash: 'Cash',
  card: 'Card',
  'payment-link': 'Payment link',
  wallet: 'Wallet',
  package: 'Package',
  mixed: 'Split',
}

/** wa.me link with prefilled text. Phone in E.164 or digits. */
export const waLink = (phone: string | null | undefined, text: string) => `https://wa.me/${(phone ?? '').replace(/\D/g, '')}?text=${encodeURIComponent(text)}`

/** Bottom offset that clears the fixed mobile tab bar (h-16 + safe area); flush on desktop. */
export const ABOVE_NAV = 'bottom-[calc(4rem+env(safe-area-inset-bottom))] md:bottom-0'
