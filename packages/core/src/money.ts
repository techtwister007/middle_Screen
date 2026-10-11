/** Money is always stored as integer paise. Never use floats for money. */
export type Paise = number

export const rupees = (amount: number): Paise => Math.round(amount * 100)

export const toRupees = (paise: Paise): number => paise / 100

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

const inrPrecise = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Formats paise as ₹1,999 (or ₹1,999.50 when there are paise). */
export const formatINR = (paise: Paise): string =>
  paise % 100 === 0 ? inr.format(paise / 100) : inrPrecise.format(paise / 100)

export const assertPaise = (value: number): Paise => {
  if (!Number.isInteger(value)) throw new Error(`Money must be integer paise, got ${value}`)
  return value
}

/** Percentage of an amount, rounded to the nearest paisa. */
export const percentOf = (paise: Paise, percent: number): Paise =>
  Math.round((paise * percent) / 100)

export const sumPaise = (values: Paise[]): Paise => values.reduce((a, b) => a + b, 0)
