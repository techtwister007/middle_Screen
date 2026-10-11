import config from '@payload-config'
import { getPayload, type Payload } from 'payload'

let cached: Payload | null = null
export const payloadForTests = async () => {
  if (!cached) cached = await getPayload({ config })
  return cached
}
