/**
 * Enhanced Rate Limiting System
 * 
 * Production-ready rate limiting with multiple strategies, monitoring, and security features
 * Supports user-based, IP-based, and endpoint-specific rate limits
 */

import { NextRequest, NextResponse } from 'next/server'
import { logSecurityEvent } from '@/lib/middleware/security-middleware'

// Rate limit store interfaces
interface RateLimitEntry {
  count: number
  resetTime: number
  firstRequest: number
  lastRequest: number
  violations: number
}

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  blockDurationMs?: number
  enableBurst?: boolean
  burstMax?: number
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

interface EndpointConfig {
  endpoint: string
  config: RateLimitConfig
  description: string
}

// In-memory store (replace with Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>()
const blockedIPs = new Map<string, number>() // IP -> unblock timestamp

// Enhanced rate limit configurations
export const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  // API endpoints - general
  api_general: {
    windowMs: 15 * 60 * 1000,    // 15 minutes
    maxRequests: 1000,           // 1000 requests per window
    enableBurst: true,
    burstMax: 50                 // 50 requests in quick succession
  },

  // Authentication endpoints - stricter
  api_auth: {
    windowMs: 15 * 60 * 1000,    // 15 minutes
    maxRequests: 10,             // 10 auth attempts per window
    blockDurationMs: 30 * 60 * 1000, // 30 minute block after violations
    skipSuccessfulRequests: false
  },

  // Password/security operations - very strict
  api_security: {
    windowMs: 60 * 1000,         // 1 minute
    maxRequests: 3,              // 3 attempts per minute
    blockDurationMs: 60 * 60 * 1000, // 1 hour block
    skipSuccessfulRequests: false
  },

  // File uploads - moderate
  api_upload: {
    windowMs: 60 * 1000,         // 1 minute
    maxRequests: 10,             // 10 uploads per minute
    skipSuccessfulRequests: true
  },

  // AI/ML endpoints - expensive operations
  api_ai: {
    windowMs: 60 * 1000,         // 1 minute
    maxRequests: 20,             // 20 AI requests per minute
    enableBurst: false
  },

  // Analytics/reporting - moderate
  api_analytics: {
    windowMs: 5 * 60 * 1000,     // 5 minutes
    maxRequests: 100,            // 100 analytics calls per 5 minutes
    skipFailedRequests: true
  }
}

// Endpoint-specific configurations
export const ENDPOINT_CONFIGS: EndpointConfig[] = [
  // Authentication endpoints
  {
    endpoint: '/api/auth',
    config: RATE_LIMIT_CONFIGS.api_auth,
    description: 'Authentication and authorization'
  },
  
  // Security-sensitive endpoints
  {
    endpoint: '/api/auth/reset-password',
    config: RATE_LIMIT_CONFIGS.api_security,
    description: 'Password reset operations'
  },
  {
    endpoint: '/api/auth/verify',
    config: RATE_LIMIT_CONFIGS.api_security,
    description: 'Account verification'
  },
  
  // AI endpoints
  {
    endpoint: '/api/tasks/extract',
    config: RATE_LIMIT_CONFIGS.api_ai,
    description: 'AI task extraction'
  },
  
  // Upload endpoints
  {
    endpoint: '/api/upload',
    config: RATE_LIMIT_CONFIGS.api_upload,
    description: 'File upload operations'
  },
  
  // Analytics endpoints
  {
    endpoint: '/api/analytics',
    config: RATE_LIMIT_CONFIGS.api_analytics,
    description: 'Analytics and performance monitoring'
  }
]

/**
 * Enhanced Rate Limiter Class
 */
export class EnhancedRateLimiter {
  private config: RateLimitConfig
  private identifier: string

  constructor(config: RateLimitConfig, identifier: string) {
    this.config = config
    this.identifier = identifier
  }

  /**
   * Check and apply rate limit
   */
  async checkLimit(request: NextRequest, userId?: string): Promise<NextResponse | null> {
    const key = this.generateKey(request, userId)
    const now = Date.now()
    
    // Check if IP is blocked
    if (this.isBlocked(key, now)) {
      const blockEndTime = blockedIPs.get(key) || 0
      const remainingBlock = Math.ceil((blockEndTime - now) / 1000)
      
      await logSecurityEvent('rate_limit', {
        type: 'blocked_request',
        key,
        remainingBlock,
        endpoint: request.nextUrl.pathname
      })
      
      return NextResponse.json(
        {
          error: 'IP Blocked',
          message: `Too many violations. Blocked for ${remainingBlock} more seconds.`,
          code: 'IP_BLOCKED',
          unblockTime: new Date(blockEndTime).toISOString()
        },
        { 
          status: 429,
          headers: {
            'Retry-After': remainingBlock.toString(),
            'X-Block-Duration': remainingBlock.toString()
          }
        }
      )
    }

    // Get or create rate limit entry
    let entry = rateLimitStore.get(key)
    
    if (!entry || now > entry.resetTime) {
      // Create new window
      entry = {
        count: 0,
        resetTime: now + this.config.windowMs,
        firstRequest: now,
        lastRequest: now,
        violations: entry?.violations || 0
      }
      rateLimitStore.set(key, entry)
    }

    // Update entry
    entry.count++
    entry.lastRequest = now

    // Check burst limit
    if (this.config.enableBurst && this.config.burstMax) {
      const burstWindow = 10 * 1000 // 10 seconds
      if (now - entry.firstRequest < burstWindow && entry.count > this.config.burstMax) {
        entry.violations++
        return this.createRateLimitResponse(entry, 'burst_limit', now)
      }
    }

    // Check main limit
    if (entry.count > this.config.maxRequests) {
      entry.violations++
      
      // Check if should be blocked
      if (this.config.blockDurationMs && entry.violations >= 3) {
        blockedIPs.set(key, now + this.config.blockDurationMs)
        await logSecurityEvent('rate_limit', {
          type: 'ip_blocked',
          key,
          violations: entry.violations,
          blockDuration: this.config.blockDurationMs
        })
      }
      
      return this.createRateLimitResponse(entry, 'rate_limit', now)
    }

    return null // No limit applied
  }

  /**
   * Generate rate limit key
   */
  private generateKey(request: NextRequest, userId?: string): string {
    const ip = this.getClientIP(request)
    const endpoint = request.nextUrl.pathname
    
    // Use user ID if available and authenticated endpoint
    if (userId && this.shouldUseUserBasedLimiting(endpoint)) {
      return `user:${userId}:${this.identifier}`
    }
    
    // Use IP-based limiting
    return `ip:${ip}:${this.identifier}`
  }

  /**
   * Check if should use user-based limiting
   */
  private shouldUseUserBasedLimiting(endpoint: string): boolean {
    const userBasedEndpoints = [
      '/api/tasks',
      '/api/projects', 
      '/api/notes',
      '/api/analytics'
    ]
    
    return userBasedEndpoints.some(pattern => endpoint.startsWith(pattern))
  }

  /**
   * Check if key is blocked
   */
  private isBlocked(key: string, now: number): boolean {
    const blockEndTime = blockedIPs.get(key)
    
    if (!blockEndTime) return false
    
    if (now > blockEndTime) {
      blockedIPs.delete(key)
      return false
    }
    
    return true
  }

  /**
   * Create rate limit response
   */
  private createRateLimitResponse(
    entry: RateLimitEntry, 
    type: 'rate_limit' | 'burst_limit', 
    now: number
  ): NextResponse {
    const remaining = Math.max(0, this.config.maxRequests - entry.count)
    const resetTime = Math.ceil(entry.resetTime / 1000)
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000)
    
    const response = NextResponse.json(
      {
        error: 'Rate Limit Exceeded',
        message: type === 'burst_limit' 
          ? 'Too many requests in quick succession'
          : 'Rate limit exceeded for this endpoint',
        code: type.toUpperCase(),
        retryAfter,
        limit: this.config.maxRequests,
        remaining: 0,
        resetTime: new Date(entry.resetTime).toISOString()
      },
      { status: 429 }
    )

    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', this.config.maxRequests.toString())
    response.headers.set('X-RateLimit-Remaining', remaining.toString())
    response.headers.set('X-RateLimit-Reset', resetTime.toString())
    response.headers.set('Retry-After', retryAfter.toString())
    response.headers.set('X-RateLimit-Policy', this.identifier)

    return response
  }

  /**
   * Get client IP address
   */
  private getClientIP(request: NextRequest): string {
    // Try various headers for real IP
    const headers = [
      'x-forwarded-for',
      'x-real-ip',
      'x-client-ip',
      'cf-connecting-ip'
    ]
    
    for (const header of headers) {
      const value = request.headers.get(header)
      if (value) {
        return value.split(',')[0].trim()
      }
    }
    
    return request.ip || 'unknown'
  }
}

/**
 * Get rate limiter for endpoint
 */
export function getRateLimiter(endpoint: string): EnhancedRateLimiter | null {
  // Find matching endpoint configuration
  const endpointConfig = ENDPOINT_CONFIGS.find(config => 
    endpoint.startsWith(config.endpoint)
  )
  
  if (endpointConfig) {
    return new EnhancedRateLimiter(
      endpointConfig.config,
      endpointConfig.endpoint.replace('/', '_').replace(/\//g, '_')
    )
  }
  
  // Default API rate limiter
  if (endpoint.startsWith('/api/')) {
    return new EnhancedRateLimiter(
      RATE_LIMIT_CONFIGS.api_general,
      'api_general'
    )
  }
  
  return null
}

/**
 * Enhanced rate limit middleware
 */
export async function applyEnhancedRateLimit(
  request: NextRequest,
  userId?: string
): Promise<NextResponse | null> {
  const endpoint = request.nextUrl.pathname
  const rateLimiter = getRateLimiter(endpoint)
  
  if (!rateLimiter) {
    return null // No rate limiting for this endpoint
  }
  
  return await rateLimiter.checkLimit(request, userId)
}

/**
 * Get rate limit statistics
 */
export function getRateLimitStats(): {
  activeKeys: number
  blockedIPs: number
  totalRequests: number
  totalViolations: number
} {
  let totalRequests = 0
  let totalViolations = 0
  
  for (const entry of rateLimitStore.values()) {
    totalRequests += entry.count
    totalViolations += entry.violations
  }
  
  return {
    activeKeys: rateLimitStore.size,
    blockedIPs: blockedIPs.size,
    totalRequests,
    totalViolations
  }
}

/**
 * Clean expired entries
 */
export function cleanExpiredEntries(): void {
  const now = Date.now()
  
  // Clean rate limit entries
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key)
    }
  }
  
  // Clean blocked IPs
  for (const [ip, unblockTime] of blockedIPs.entries()) {
    if (now > unblockTime) {
      blockedIPs.delete(ip)
    }
  }
}

// Clean expired entries every 5 minutes
setInterval(cleanExpiredEntries, 5 * 60 * 1000)