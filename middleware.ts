/**
 * Next.js Middleware
 * 
 * Global middleware for security, rate limiting, and monitoring
 */

import { NextRequest, NextResponse } from 'next/server'
import { performSecurityCheck, applySecurityHeaders } from '@/lib/security/middleware'
import { log } from '@/lib/monitoring/logger'

// Paths that should skip middleware
const SKIP_PATHS = [
  '/_next/',
  '/api/health',
  '/favicon.ico',
  '/manifest.json',
  '/sw.js',
  '/service-worker.js',
  '/offline.html',
  '/robots.txt',
  '/sitemap.xml',
]

// Static asset extensions
const STATIC_EXTENSIONS = [
  '.js',
  '.css',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.ico',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.webp',
  '.avif',
]

/**
 * Check if path should skip middleware
 */
function shouldSkipPath(pathname: string): boolean {
  // Skip static paths
  if (SKIP_PATHS.some(path => pathname.startsWith(path))) {
    return true
  }
  
  // Skip static assets
  if (STATIC_EXTENSIONS.some(ext => pathname.endsWith(ext))) {
    return true
  }
  
  return false
}

/**
 * Add request tracking headers
 */
function addTrackingHeaders(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {}
  
  // Generate or use existing request ID
  const requestId = request.headers.get('x-request-id') || 
                   crypto.randomUUID().slice(0, 8)
  
  headers['x-request-id'] = requestId
  headers['x-forwarded-for'] = request.headers.get('x-forwarded-for') || 
                              request.ip || 'unknown'
  headers['x-real-ip'] = request.ip || 'unknown'
  
  return headers
}

/**
 * Main middleware function
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl
  const startTime = Date.now()
  
  // Skip middleware for certain paths
  if (shouldSkipPath(pathname)) {
    return NextResponse.next()
  }
  
  try {
    // Add tracking headers
    const trackingHeaders = addTrackingHeaders(request)
    const requestId = trackingHeaders['x-request-id']
    
    // Log request start (only for non-static requests)
    if (!pathname.startsWith('/_next/')) {
      log.http('Middleware: Request started', {
        requestId,
        method: request.method,
        pathname,
        userAgent: request.headers.get('user-agent')?.substring(0, 100),
        ip: request.ip,
        referrer: request.headers.get('referrer'),
      })
    }
    
    // Perform security checks
    const securityResponse = await performSecurityCheck(request)
    if (securityResponse) {
      log.security('Request blocked by security check', 'medium', {
        requestId,
        pathname,
        reason: 'security_violation',
        duration: Date.now() - startTime,
      })
      return securityResponse
    }
    
    // Create response
    const response = NextResponse.next({
      request: {
        headers: new Headers({
          ...Object.fromEntries(request.headers.entries()),
          ...trackingHeaders,
        }),
      },
    })
    
    // Apply security headers
    const securedResponse = applySecurityHeaders(response)
    
    // Add performance headers
    securedResponse.headers.set('X-Response-Time', (Date.now() - startTime).toString())
    securedResponse.headers.set('X-Request-ID', requestId)
    
    // Log successful request (only for API routes)
    if (pathname.startsWith('/api/')) {
      log.http('Middleware: Request completed', {
        requestId,
        method: request.method,
        pathname,
        duration: Date.now() - startTime,
        status: 'success',
      })
    }
    
    return securedResponse
    
  } catch (error) {
    // Log middleware error
    log.error('Middleware error', error as Error, {
      pathname,
      method: request.method,
      duration: Date.now() - startTime,
    })
    
    // Continue with request despite middleware error
    const response = NextResponse.next()
    response.headers.set('X-Middleware-Error', 'true')
    return response
  }
}

/**
 * Middleware configuration
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    {
      source: '/((?!_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}