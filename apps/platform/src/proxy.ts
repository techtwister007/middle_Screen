import { type NextRequest, NextResponse } from 'next/server'

const RESERVED = new Set(['www', 'app', 'admin', 'api', 'studio', 'console', 'demo'])

/**
 * Salon addressing:
 *   glamnails.ourbrand.in/designs  ->  /s/glamnails/designs   (subdomain)
 *   ourbrand.in/s/glamnails/designs                          (path, always works)
 * Custom domains are resolved through /api/resolve-host and cached for a minute.
 */
const hostCache = new Map<string, { slug: string | null; at: number }>()

export async function proxy(request: NextRequest) {
  const url = request.nextUrl
  const host = (request.headers.get('host') ?? '').toLowerCase().split(':')[0]
  const root = (process.env.ROOT_DOMAIN ?? 'localhost').toLowerCase().split(':')[0]
  const path = url.pathname

  if (path.startsWith('/_next') || path.startsWith('/api') || path.startsWith('/admin') || /\.[\w]+$/.test(path)) return NextResponse.next()

  let slug: string | null = null
  if (host.endsWith(`.${root}`)) {
    const sub = host.slice(0, -(root.length + 1))
    if (sub && !sub.includes('.') && !RESERVED.has(sub)) slug = sub
  } else if (host !== root && host !== 'localhost' && host !== '127.0.0.1' && !host.endsWith('.vercel.app')) {
    const cached = hostCache.get(host)
    if (cached && Date.now() - cached.at < 60_000) slug = cached.slug
    else {
      try {
        const res = await fetch(new URL(`/api/resolve-host?host=${encodeURIComponent(host)}`, request.url))
        slug = res.ok ? ((await res.json()) as { slug: string | null }).slug : null
      } catch {
        slug = null
      }
      hostCache.set(host, { slug, at: Date.now() })
    }
  }

  if (slug && !path.startsWith('/s/') && !path.startsWith('/paused/')) {
    const rewritten = url.clone()
    rewritten.pathname = `/s/${slug}${path === '/' ? '' : path}`
    return NextResponse.rewrite(rewritten)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
