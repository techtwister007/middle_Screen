/** Public base URL of the platform, e.g. https://ourbrand.in */
export const publicUrl = () => (process.env.PUBLIC_URL ?? 'http://localhost:3000').replace(/\/$/, '')

/** Link into a salon's customer app. Path-based links always work; subdomains are optional. */
export const salonLink = (slug: string, path = '') => `${publicUrl()}/s/${slug}${path.startsWith('/') || !path ? path : `/${path}`}`

export const studioLink = (slug: string, path = '') => `${publicUrl()}/studio/${slug}${path}`
