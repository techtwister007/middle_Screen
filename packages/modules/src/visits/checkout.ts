import type { ID, Paise } from '@salon/core'

// ---------------------------------------------------------------------------
// Checkout maths (pure, unit-tested)
// ---------------------------------------------------------------------------

export interface CheckoutLine {
  serviceId?: ID
  name: string
  price: Paise
  quantity?: number
}

export interface CheckoutInput {
  lines: CheckoutLine[]
  manualDiscount?: Paise
  rewardDiscount?: Paise
  packageCovered?: Paise
  walletBalance?: Paise
  useWallet?: boolean
}

export interface CheckoutTotals {
  subtotal: Paise
  manualDiscount: Paise
  rewardDiscount: Paise
  packageCovered: Paise
  walletApplied: Paise
  total: Paise
}

/**
 * Order of application: package-covered services, then manual discount, then reward, then wallet.
 * No step can take the amount below zero.
 */
export const computeCheckout = (input: CheckoutInput): CheckoutTotals => {
  const subtotal = input.lines.reduce((sum, l) => sum + l.price * (l.quantity ?? 1), 0)
  let remaining = subtotal
  const take = (amount: number | undefined) => {
    const v = Math.max(0, Math.min(remaining, Math.round(amount ?? 0)))
    remaining -= v
    return v
  }
  const packageCovered = take(input.packageCovered)
  const manualDiscount = take(input.manualDiscount)
  const rewardDiscount = take(input.rewardDiscount)
  const walletApplied = input.useWallet ? take(input.walletBalance) : 0
  return { subtotal, manualDiscount, rewardDiscount, packageCovered, walletApplied, total: remaining }
}
