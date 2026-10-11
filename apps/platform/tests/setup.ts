import './env'
import { afterAll } from 'vitest'

afterAll(async () => {
  const { payloadForTests } = await import('./helpers')
  const payload = await payloadForTests()
  await payload.db.destroy?.()
})
