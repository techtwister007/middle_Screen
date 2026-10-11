import { describe, expect, it } from 'vitest'
import { parseContacts } from './contacts'

describe('parseContacts', () => {
  it('reads pasted lists, sheets and vCards', () => {
    const { contacts, skipped } = parseContacts('Name,Phone\nPriya Shah, 98250 11111\n9824012345 Neha\nRiya\t+91 98111 22233\nno number here\n98250-11111')
    expect(contacts).toEqual([
      { phone: '+919825011111', name: 'Priya Shah' },
      { phone: '+919824012345', name: 'Neha' },
      { phone: '+919811122233', name: 'Riya' },
    ])
    expect(skipped).toEqual(['no number here'])
    const v = parseContacts('BEGIN:VCARD\nFN:Asha Patel\nTEL;TYPE=CELL:+91 99099 88877\nEND:VCARD')
    expect(v.contacts).toEqual([{ phone: '+919909988877', name: 'Asha Patel' }])
  })
})
