import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(dirname, '../.env') })

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgres://postgres@localhost:5432/salon_test'
process.env.EVENTS_MODE = 'inline'
process.env.EVENTS_THROW = 'true'
process.env.MESSAGING_PROVIDER = 'fake'
process.env.PAYMENTS_PROVIDER = 'fake'
process.env.IMAGE_AI_PROVIDER = 'fake'
process.env.OTP_FIXED_CODE = '000000'
process.env.MEDIA_DIR = path.resolve(dirname, '../.test-media')
process.env.PAYLOAD_SECRET ||= 'test-secret'
process.env.CUSTOMER_SESSION_SECRET ||= 'test-session'
