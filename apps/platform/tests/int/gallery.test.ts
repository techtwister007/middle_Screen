import { forTenant, type ID } from '@salon/core'
import { copyLibraryDesign, DEFAULT_STYLES, salonStyles, styleIdsByName } from '@salon/modules'
import { createSalon, createService } from '@salon/testing'
import type { Payload } from 'payload'
import sharp from 'sharp'
import { beforeAll, describe, expect, it } from 'vitest'
import { payloadForTests } from '../helpers'

let payload: Payload
let salon: { id: ID }
let other: { id: ID }
let libraryId: ID

beforeAll(async () => {
  payload = await payloadForTests()
  salon = await createSalon(payload)
  other = await createSalon(payload)
  await createService(payload, salon.id, { name: 'Gel polish (hands)' })
  const photo = await sharp({ create: { width: 400, height: 400, channels: 3, background: '#c0406a' } })
    .jpeg()
    .toBuffer()
  const media = (await payload.create({
    collection: 'library-media',
    overrideAccess: true,
    data: { alt: 'Test look' } as never,
    file: { data: photo, mimetype: 'image/jpeg', name: `look-${Date.now()}.jpg`, size: photo.length },
  })) as unknown as { id: ID }
  libraryId = (
    (await payload.create({
      collection: 'library-designs',
      overrideAccess: true,
      data: {
        title: 'Ruby French',
        images: [media.id],
        styleNames: ['French', 'Korean jelly'],
        suggestedService: 'Gel polish',
        occasions: ['party'],
        published: true,
      } as never,
    })) as unknown as { id: ID }
  ).id
})

describe('design styles', () => {
  it('every salon starts with the default styles, in order', async () => {
    const styles = await salonStyles(payload, salon.id)
    expect(styles.map((s) => s.name)).toEqual(DEFAULT_STYLES.map((s) => s.name))
  })

  it('styles are per salon, and missing ones are created by name', async () => {
    const ids = await styleIdsByName(payload, salon.id, ['french', 'Marble'])
    expect(ids).toHaveLength(2)
    const names = (await salonStyles(payload, salon.id)).map((s) => s.name)
    expect(names).toContain('Marble')
    expect((await salonStyles(payload, other.id)).map((s) => s.name)).not.toContain('Marble')
  })
})

describe('design library', () => {
  it('copies a look into a salon with its photo, styles and service, once', async () => {
    const first = await copyLibraryDesign(payload, salon.id, libraryId)
    expect(first.created).toBe(true)
    const repo = forTenant(payload, salon.id)
    const design = await repo.findByID<{ title: string; images: unknown[]; styles: { name: string }[]; service?: { name: string }; published: boolean }>(
      'designs',
      first.id,
      1,
    )
    expect(design?.title).toBe('Ruby French')
    expect(design?.images).toHaveLength(1)
    expect(design?.styles.map((s) => s.name).sort()).toEqual(['French', 'Korean jelly'])
    expect(design?.service?.name).toBe('Gel polish (hands)')
    expect(design?.published).toBe(true)
    // The photo is the salon's own copy.
    const media = await repo.findByID<{ tenant: unknown }>('media', (design?.images[0] as { id: ID }).id)
    expect(media).not.toBeNull()

    const again = await copyLibraryDesign(payload, salon.id, libraryId)
    expect(again).toEqual({ id: first.id, created: false })
    const lib = (await payload.findByID({ collection: 'library-designs', id: libraryId, overrideAccess: true })) as unknown as { timesCopied: number }
    expect(lib.timesCopied).toBe(1)
  })
})
