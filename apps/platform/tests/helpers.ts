import config from '@payload-config'
import { type Payload, getPayload } from 'payload'

let cached: Payload | null = null
export const payloadForTests = async () => {
  if (!cached) cached = await getPayload({ config })
  return cached
}
