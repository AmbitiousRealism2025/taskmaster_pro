import { NextRequest } from 'next/server'
import { apiLimiter, authLimiter, strictLimiter } from '@/lib/rate-limit'

export async function applyRateLimit(req: NextRequest) {
  const { pathname } = req.nextUrl
  
  // Apply stricter limits to auth endpoints
  if (pathname.startsWith('/api/auth/')) {
    return authLimiter(req)
  }
  
  // Apply strict limits to sensitive endpoints
  if (
    pathname.includes('/password') ||
    pathname.includes('/reset') ||
    pathname.includes('/verify')
  ) {
    return strictLimiter(req)
  }
  
  // Apply general API limits to all other API routes
  if (pathname.startsWith('/api/')) {
    return apiLimiter(req)
  }
  
  // No rate limiting for non-API routes
  return null
}