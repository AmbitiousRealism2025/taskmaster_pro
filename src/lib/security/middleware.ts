/**
 * Security Middleware
 * 
 * Centralized security layer for all requests
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSecurityHeaders, generateCSPNonce } from './csp-config'
import { rateLimit, RATE_LIMIT_CONFIGS, getClientId } from './rate-limit'

export interface SecurityConfig {
  enableCSP: boolean
  enableRateLimit: boolean
  enableSecurityHeaders: boolean
  logViolations: boolean
}

/**
 * Default security configuration
 */
export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  enableCSP: true,
  enableRateLimit: true,
  enableSecurityHeaders: true,
  logViolations: process.env.NODE_ENV === 'production',
}

/**
 * Determine rate limit config based on request path
 */
function getRateLimitConfig(pathname: string) {
  // Authentication endpoints
  if (pathname.includes('/auth/signin')) return RATE_LIMIT_CONFIGS.auth.signin
  if (pathname.includes('/auth/signup')) return RATE_LIMIT_CONFIGS.auth.signup
  if (pathname.includes('/auth/reset')) return RATE_LIMIT_CONFIGS.auth.passwordReset
  
  // Analytics endpoints
  if (pathname.includes('/analytics/vitals')) return RATE_LIMIT_CONFIGS.analytics.vitals
  if (pathname.includes('/analytics/events')) return RATE_LIMIT_CONFIGS.analytics.events
  
  // API endpoints by method
  if (pathname.startsWith('/api/')) {
    if (pathname.includes('/upload')) return RATE_LIMIT_CONFIGS.api.upload
    return RATE_LIMIT_CONFIGS.api.default
  }
  
  // Public pages
  return RATE_LIMIT_CONFIGS.public.default
}

/**
 * Log security events
 */
function logSecurityEvent(
  type: 'rate_limit' | 'csp_violation' | 'suspicious_activity',
  request: NextRequest,
  details: any = {}
) {
  const event = {
    timestamp: new Date().toISOString(),
    type,
    clientId: getClientId(request),
    pathname: request.nextUrl.pathname,
    userAgent: request.headers.get('user-agent'),
    referer: request.headers.get('referer'),
    ip: request.ip || 'unknown',
    ...details,
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.warn('Security Event:', event)
  }
  
  // In production, send to monitoring service
  if (process.env.NODE_ENV === 'production') {
    // This would integrate with your monitoring solution
    // Example: Sentry, DataDog, etc.
  }
}

/**
 * Detect suspicious request patterns
 */
function detectSuspiciousActivity(request: NextRequest): string[] {
  const suspiciousPatterns: string[] = []
  const pathname = request.nextUrl.pathname.toLowerCase()
  const searchParams = request.nextUrl.searchParams
  
  // Common attack patterns
  const attackPatterns = [
    /\.\./,  // Directory traversal
    /<script/i,  // XSS attempts
    /union.*select/i,  // SQL injection
    /exec\(/i,  // Code injection
    /eval\(/i,  // Code injection
    /javascript:/i,  // Protocol-based XSS
    /data:text\/html/i,  // Data URL XSS
  ]
  
  // Check pathname
  for (const pattern of attackPatterns) {
    if (pattern.test(pathname)) {
      suspiciousPatterns.push(`pathname_attack: ${pattern.source}`)
    }
  }
  
  // Check query parameters
  for (const [key, value] of searchParams.entries()) {
    for (const pattern of attackPatterns) {
      if (pattern.test(value)) {
        suspiciousPatterns.push(`param_attack: ${key}=${pattern.source}`)
      }
    }
  }
  
  // Check for common admin paths
  const adminPaths = ['/admin', '/wp-admin', '/.env', '/config', '/backup']
  if (adminPaths.some(path => pathname.includes(path))) {
    suspiciousPatterns.push('admin_path_probe')
  }
  
  // Check for excessive path depth
  if (pathname.split('/').length > 10) {
    suspiciousPatterns.push('deep_path_probe')
  }
  
  return suspiciousPatterns
}

/**
 * Main security middleware
 */
export async function securityMiddleware(
  request: NextRequest,
  config: SecurityConfig = DEFAULT_SECURITY_CONFIG
): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl
  
  // Skip security for static assets in development
  if (process.env.NODE_ENV === 'development' && 
      (pathname.startsWith('/_next/') || pathname.startsWith('/static/'))) {
    return null
  }
  
  // Detect suspicious activity
  const suspiciousPatterns = detectSuspiciousActivity(request)
  if (suspiciousPatterns.length > 0) {
    logSecurityEvent('suspicious_activity', request, { patterns: suspiciousPatterns })
    
    // Block obviously malicious requests
    if (suspiciousPatterns.some(p => p.includes('attack'))) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Request blocked by security filter' },
        { status: 400 }
      )
    }
  }
  
  // Rate limiting
  if (config.enableRateLimit) {
    const rateLimitConfig = getRateLimitConfig(pathname)
    const result = await rateLimit(request, rateLimitConfig)
    
    if (result instanceof NextResponse) {
      logSecurityEvent('rate_limit', request, { config: rateLimitConfig })
      return result
    }
  }
  
  return null // Continue to next middleware/handler
}

/**
 * Apply security headers to response
 */
export function applySecurityHeaders(
  response: NextResponse,
  config: SecurityConfig = DEFAULT_SECURITY_CONFIG
): NextResponse {
  if (!config.enableSecurityHeaders) return response
  
  // Generate nonce for CSP
  const nonce = config.enableCSP ? generateCSPNonce() : undefined
  const securityHeaders = getSecurityHeaders(nonce)
  
  // Apply all security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    if (value) {
      response.headers.set(key, value)
    }
  })
  
  // Add custom headers for debugging
  if (process.env.NODE_ENV === 'development') {
    response.headers.set('X-Security-Applied', 'true')
    if (nonce) {
      response.headers.set('X-CSP-Nonce', nonce)
    }
  }
  
  return response
}

/**
 * Validate request origin for sensitive operations
 */
export function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  
  // Allow same-origin requests
  const expectedOrigin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  
  if (!origin && !referer) {
    // Allow requests without origin (e.g., server-to-server)
    return true
  }
  
  if (origin && origin === expectedOrigin) {
    return true
  }
  
  if (referer && referer.startsWith(expectedOrigin)) {
    return true
  }
  
  return false
}

/**
 * CSRF token validation
 */
export function validateCSRFToken(request: NextRequest): boolean {
  const method = request.method
  
  // Only validate CSRF for state-changing operations
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return true
  }
  
  // Get CSRF token from header or body
  const tokenFromHeader = request.headers.get('x-csrf-token')
  const tokenFromCookie = request.cookies.get('csrf-token')?.value
  
  if (!tokenFromHeader || !tokenFromCookie) {
    return false
  }
  
  // Simple token comparison (in production, use cryptographic comparison)
  return tokenFromHeader === tokenFromCookie
}

/**
 * Complete security check
 */
export async function performSecurityCheck(
  request: NextRequest,
  config: SecurityConfig = DEFAULT_SECURITY_CONFIG
): Promise<NextResponse | null> {
  // Apply middleware checks
  const middlewareResult = await securityMiddleware(request, config)
  if (middlewareResult) return middlewareResult
  
  // For sensitive operations, add additional checks
  const isSensitive = request.nextUrl.pathname.includes('/api/') && 
                     ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)
  
  if (isSensitive) {
    // Validate origin
    if (!validateOrigin(request)) {
      logSecurityEvent('suspicious_activity', request, { reason: 'invalid_origin' })
      return NextResponse.json(
        { error: 'Forbidden', message: 'Invalid request origin' },
        { status: 403 }
      )
    }
    
    // Validate CSRF token (if implemented)
    if (process.env.CSRF_PROTECTION === 'enabled' && !validateCSRFToken(request)) {
      logSecurityEvent('suspicious_activity', request, { reason: 'invalid_csrf' })
      return NextResponse.json(
        { error: 'Forbidden', message: 'Invalid CSRF token' },
        { status: 403 }
      )
    }
  }
  
  return null
}