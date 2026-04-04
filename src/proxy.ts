import { NextResponse, type NextRequest } from 'next/server'
import { match } from 'path-to-regexp'
import { updateSession } from './supabase-clients/middleware'

const RATE_LIMIT = 100
const WINDOW_MS = 60 * 1000

type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()

function getIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  )
}

const apiRoutes = ['/api{/*path}']

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  if (apiRoutes.some((route) => match(route)(pathname))) {
    // Apply rate limiting to /api/v1/ routes except /health
    if (
      pathname.startsWith('/api/v1/') &&
      pathname !== '/api/v1/health'
    ) {
      const ip = getIp(request)
      const now = Date.now()

      let bucket = buckets.get(ip)
      if (!bucket || now >= bucket.resetAt) {
        bucket = { count: 0, resetAt: now + WINDOW_MS }
        buckets.set(ip, bucket)
      }

      bucket.count++

      if (bucket.count > RATE_LIMIT) {
        const retryAfter = Math.ceil((bucket.resetAt - now) / 1000)
        return NextResponse.json(
          { error: 'Too Many Requests' },
          {
            status: 429,
            headers: { 'Retry-After': String(retryAfter) },
          }
        )
      }
    }

    return null
  }

  if (request.nextUrl.pathname) return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
