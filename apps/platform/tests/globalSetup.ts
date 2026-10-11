import './env'

export default async function setup() {
  const { getPayload } = await import('payload')
  const { default: config } = await import('../src/payload.config')
  const payload = await getPayload({ config })
  await payload.db.migrateFresh({ forceAcceptWarning: true })
  await payload.destroy?.()
}
