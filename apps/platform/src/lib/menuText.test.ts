import { describe, expect, it } from 'vitest'
import { parseMenuText } from './menuText'

describe('parseMenuText', () => {
  it('reads common menu formats', () => {
    const { parsed, skipped } = parseMenuText(
      [
        'Gel polish, 800, 45',
        'Acrylic extensions - ₹1,800 - 2 hr',
        'Bridal nail art | 3500 | 150 min',
        'Pedicure 900',
        'Gel 2.0 overlay 1500 90',
        'Spa 4x pedicure - ₹900 - 1 hr',
        'Call us',
      ].join('\n'),
    )
    expect(parsed).toEqual([
      { name: 'Gel polish', price: 800, minutes: 45, category: 'gel' },
      { name: 'Acrylic extensions', price: 1800, minutes: 120, category: 'extensions' },
      { name: 'Bridal nail art', price: 3500, minutes: 150, category: 'nail-art' },
      { name: 'Pedicure', price: 900, minutes: 60, category: 'pedicure' },
      { name: 'Gel 2.0 overlay', price: 1500, minutes: 90, category: 'extensions' },
      { name: 'Spa 4x pedicure', price: 900, minutes: 60, category: 'pedicure' },
    ])
    expect(skipped).toEqual(['Call us'])
  })
})
