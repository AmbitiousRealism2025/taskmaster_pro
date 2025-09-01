import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import { applyRateLimit } from '@/lib/middleware/rate-limit-middleware'

export default withAuth(
  async function middleware(req) {
    // Apply rate limiting first
    const rateLimitResponse = await applyRateLimit(req)
    if (rateLimitResponse && rateLimitResponse.status === 429) {
      return rateLimitResponse
    }

    const token = req.nextauth.token
    const { pathname } = req.nextUrl

    // Allow access to auth pages when not authenticated
    if (pathname.startsWith('/auth/') && !token) {
      return NextResponse.next()
    }

    // Redirect to signin if trying to access protected route without auth
    if (!token && (
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/api/') && !pathname.startsWith('/api/auth')
    )) {
      const signInUrl = new URL('/auth/signin', req.url)
      signInUrl.searchParams.set('callbackUrl', req.url)
      return NextResponse.redirect(signInUrl)
    }

    // Redirect to dashboard if authenticated and trying to access auth pages
    if (token && pathname.startsWith('/auth/') && pathname !== '/auth/signout') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        
        // Allow public routes
        if (
          pathname === '/' ||
          pathname.startsWith('/auth/') ||
          pathname.startsWith('/api/auth/') ||
          pathname.startsWith('/_next') ||
          pathname.includes('/favicon')
        ) {
          return true
        }

        // Require authentication for protected routes
        return !!token
      }
    }
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)  
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ]
}