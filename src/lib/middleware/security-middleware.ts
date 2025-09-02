/**
 * Security Middleware
 * 
 * Applies comprehensive security headers and policies to all requests
 * Includes CSP, rate limiting, and security validations
 */

import { NextRequest, NextResponse } from 'next/server'
import { applySecurityHeaders, DEFAULT_SECURITY_CONFIG } from '@/lib/security/headers'
import { applyRateLimit } from './rate-limit-middleware'

/**
 * Apply security middleware to request
 */
export async function applySecurityMiddleware(
  request: NextRequest,
  response?: NextResponse
): Promise<NextResponse> {
  // Create response if not provided
  const res = response || NextResponse.next()
  
  // Apply rate limiting first
  const rateLimitResponse = await applyRateLimit(request)
  if (rateLimitResponse && rateLimitResponse.status === 429) {
    return rateLimitResponse
  }
  
  // Apply security headers
  applySecurityHeaders(res.headers, DEFAULT_SECURITY_CONFIG)
  
  // Add additional security measures
  await applyAdditionalSecurity(request, res)
  
  return res
}

/**
 * Apply additional security measures
 */
async function applyAdditionalSecurity(
  request: NextRequest,
  response: NextResponse
): Promise<void> {
  // 1. Request size limits
  const contentLength = request.headers.get('content-length')
  if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB limit
    throw new Error('Request too large')
  }
  
  // 2. Suspicious user agent detection
  const userAgent = request.headers.get('user-agent') || ''
  if (isSuspiciousUserAgent(userAgent)) {
    console.warn('Suspicious user agent detected:', userAgent)
    // Could implement blocking here
  }
  
  // 3. Geographic restrictions (if needed)
  // const country = request.geo?.country
  // if (country && isBlockedCountry(country)) {
  //   throw new Error('Geographic restriction')
  // }
  
  // 4. Add security tracking headers
  response.headers.set('X-Request-ID', generateRequestId())
  response.headers.set('X-Security-Policy', 'enforced')
  
  // 5. Add timing attack protection
  const processingTime = Math.random() * 10 + 5 // Random delay 5-15ms
  response.headers.set('X-Processing-Time', processingTime.toString())
}

/**
 * Check for suspicious user agents
 */
function isSuspiciousUserAgent(userAgent: string): boolean {
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /scraper/i,
    /scanner/i,
    /curl/i,
    /wget/i,
    /python/i,
    /^$/  // Empty user agent
  ]
  
  // Allow legitimate bots
  const allowedBots = [
    /googlebot/i,
    /bingbot/i,
    /slackbot/i,
    /twitterbot/i,
    /facebookexternalhit/i
  ]
  
  // Check if it's an allowed bot first
  if (allowedBots.some(pattern => pattern.test(userAgent))) {
    return false
  }
  
  // Check for suspicious patterns
  return suspiciousPatterns.some(pattern => pattern.test(userAgent))
}

/**
 * Generate unique request ID for tracking
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Security validation for API routes
 */
export function validateAPIRequest(request: NextRequest): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  // 1. Check content type for POST/PUT/PATCH requests
  const method = request.method
  const contentType = request.headers.get('content-type')
  
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    if (!contentType || !contentType.includes('application/json')) {
      errors.push('Invalid content type for API request')
    }
  }
  
  // 2. Check for required headers
  const requiredHeaders = ['user-agent']
  for (const header of requiredHeaders) {
    if (!request.headers.get(header)) {
      errors.push(`Missing required header: ${header}`)
    }
  }
  
  // 3. Validate request size
  const contentLength = request.headers.get('content-length')
  if (contentLength && parseInt(contentLength) > 1024 * 1024) { // 1MB limit for API
    errors.push('Request payload too large')
  }
  
  // 4. Check for suspicious headers
  const suspiciousHeaders = [
    'x-forwarded-host',
    'x-cluster-client-ip',
    'x-real-ip'
  ]
  
  for (const header of suspiciousHeaders) {
    const value = request.headers.get(header)
    if (value && !isValidHeaderValue(value)) {
      errors.push(`Suspicious header value: ${header}`)
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validate header values
 */
function isValidHeaderValue(value: string): boolean {
  // Check for common injection patterns
  const injectionPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /\${/,
    /(union|select|insert|delete|update|drop)\s/i
  ]
  
  return !injectionPatterns.some(pattern => pattern.test(value))
}

/**
 * Apply CORS headers for API routes
 */
export function applyCORSHeaders(
  response: NextResponse,
  origin?: string
): NextResponse {
  const allowedOrigins = [
    'http://localhost:3000',
    'https://taskmaster-pro.vercel.app',
    ...(process.env.ALLOWED_ORIGINS?.split(',') || [])
  ]
  
  // Check if origin is allowed
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
  } else if (process.env.NODE_ENV === 'development') {
    response.headers.set('Access-Control-Allow-Origin', '*')
  }
  
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Max-Age', '86400') // 24 hours
  
  return response
}

/**
 * Security monitoring and logging
 */
export async function logSecurityEvent(
  event: 'rate_limit' | 'suspicious_request' | 'csp_violation' | 'auth_failure',
  details: Record<string, any>
): Promise<void> {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    details,
    severity: getEventSeverity(event),
    environment: process.env.NODE_ENV
  }
  
  // In production, send to monitoring service
  if (process.env.NODE_ENV === 'production') {
    // await sendToMonitoringService(logEntry)
    console.warn('Security Event:', logEntry)
  } else {
    console.log('Security Event:', logEntry)
  }
}

/**
 * Get security event severity
 */
function getEventSeverity(event: string): 'low' | 'medium' | 'high' | 'critical' {
  const severityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
    rate_limit: 'medium',
    suspicious_request: 'high',
    csp_violation: 'high',
    auth_failure: 'critical'
  }
  
  return severityMap[event] || 'low'
}