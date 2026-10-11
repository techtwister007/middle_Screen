import { normalizePhone } from '@salon/core'
import type { Field, FieldHook, NumberField, TextField } from 'payload'

/** Money in integer paise. The admin shows a hint so nobody types rupees by mistake. */
export const moneyField = (name: string, overrides: Partial<NumberField> = {}): NumberField => ({
  name,
  type: 'number',
  min: 0,
  defaultValue: 0,
  admin: { description: 'Amount in paise (₹1 = 100)', ...(overrides.admin ?? {}) },
  validate: (value: unknown) =>
    value == null || (Number.isInteger(value) && (value as number) >= 0) ? true : 'Must be a whole number of paise',
  ...overrides,
}) as NumberField

const normalisePhoneHook: FieldHook = ({ value }) => {
  if (!value) return value
  return normalizePhone(String(value)) ?? value
}

export const phoneField = (name = 'phone', overrides: Partial<TextField> = {}): TextField => ({
  name,
  type: 'text',
  index: true,
  hooks: { beforeValidate: [normalisePhoneHook] },
  validate: (value: unknown) =>
    !value || (typeof value === 'string' && /^\+\d{8,15}$/.test(value)) ? true : 'Enter a valid phone number',
  ...overrides,
}) as TextField

export const statusField = (options: string[], defaultValue: string): Field => ({
  name: 'status',
  type: 'select',
  required: true,
  defaultValue,
  index: true,
  options: options.map((o) => ({ label: o.replace(/[-_]/g, ' ').replace(/^\w/, (c) => c.toUpperCase()), value: o })),
})

export const relation = (name: string, relationTo: string, overrides: Record<string, unknown> = {}): Field =>
  ({ name, type: 'relationship', relationTo, ...overrides }) as Field
