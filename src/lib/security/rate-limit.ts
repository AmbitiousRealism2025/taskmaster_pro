/**
 * Rate Limiting Configuration
 * 
 * Implements multi-layer rate limiting for DDoS protection
 */

import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

// Types
export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  keyPrefix: string
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: Date
}

/**
 * Rate limit configurations by endpoint type
 */
export const RATE_LIMIT_CONFIGS = {
  // Authentication endpoints
  auth: {
    signin: { windowMs: 15 * 60 * 1000, maxRequests: 5, keyPrefix: 'auth:signin' },
    signup: { windowMs: 60 * 60 * 1000, maxRequests: 3, keyPrefix: 'auth:signup' },
    passwordReset: { windowMs: 60 * 60 * 1000, maxRequests: 3, keyPrefix: 'auth:reset' },
  },
  
  // API endpoints
  api: {
    default: { windowMs: 60 * 1000, maxRequests: 100, keyPrefix: 'api:default' },
    read: { windowMs: 60 * 1000, maxRequests: 200, keyPrefix: 'api:read' },
    write: { windowMs: 60 * 1000, maxRequests: 50, keyPrefix: 'api:write' },
    upload: { windowMs: 60 * 60 * 1000, maxRequests: 10, keyPrefix: 'api:upload' },
  },
  
  // Analytics endpoints
  analytics: {
    vitals: { windowMs: 60 * 1000, maxRequests: 1000, keyPrefix: 'analytics:vitals' },
    events: { windowMs: 60 * 1000, maxRequests: 500, keyPrefix: 'analytics:events' },
  },
  
  // Public endpoints
  public: {
    default: { windowMs: 60 * 1000, maxRequests: 60, keyPrefix: 'public:default' },
  },
}

/**
 * In-memory rate limiter for development
 */
class InMemoryRateLimiter {
  private store: Map<string, { count: number; resetTime: number }> = new Map()
  
  async check(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const now = Date.now()
    const resetTime = now + config.windowMs
    
    // Clean expired entries
    for (const [k, v] of this.store.entries()) {
      if (v.resetTime < now) {
        this.store.delete(k)
      }
    }
    
    const fullKey = `${config.keyPrefix}:${key}`
    const entry = this.store.get(fullKey)
    
    if (!entry || entry.resetTime < now) {
      // New window
      this.store.set(fullKey, { count: 1, resetTime })
      return {
        success: true,
        limit: config.maxRequests,
        remaining: config.maxRequests - 1,
        reset: new Date(resetTime),
      }
    }
    
    if (entry.count >= config.maxRequests) {
      // Rate limited
      return {
        success: false,
        limit: config.maxRequests,
        remaining: 0,
        reset: new Date(entry.resetTime),
      }
    }
    
    // Increment counter
    entry.count++
    this.store.set(fullKey, entry)
    
    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - entry.count,
      reset: new Date(entry.resetTime),
    }
  }
}

/**
 * Redis-based rate limiter for production
 */
class RedisRateLimiter {
  private redis: Redis
  
  constructor(redis: Redis) {
    this.redis = redis
  }
  
  async check(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const now = Date.now()
    const window = Math.floor(now / config.windowMs)
    const fullKey = `${config.keyPrefix}:${key}:${window}`
    
    try {
      // Use Redis pipeline for atomic operations
      const pipeline = this.redis.pipeline()
      pipeline.incr(fullKey)
      pipeline.expire(fullKey, Math.ceil(config.windowMs / 1000))
      
      const results = await pipeline.exec()
      const count = results?.[0]?.[1] as number || 1
      
      const remaining = Math.max(0, config.maxRequests - count)
      const resetTime = (window + 1) * config.windowMs
      
      return {
        success: count <= config.maxRequests,
        limit: config.maxRequests,
        remaining,
        reset: new Date(resetTime),
      }
    } catch (error) {
      // Fail open on Redis errors
      console.error('Rate limit Redis error:', error)
      return {
        success: true,
        limit: config.maxRequests,
        remaining: config.maxRequests,
        reset: new Date(now + config.windowMs),
      }
    }
  }
}

/**
 * Rate limiter factory
 */
export function createRateLimiter() {
  if (process.env.REDIS_URL) {
    const redis = new Redis({
      url: process.env.REDIS_URL,
      token: process.env.REDIS_TOKEN,
    })
    return new RedisRateLimiter(redis)
  }
  
  return new InMemoryRateLimiter()
}

/**
 * Get client identifier from request
 */
export function getClientId(request: NextRequest): string {
  // Try to get authenticated user ID
  const userId = request.headers.get('x-user-id')
  if (userId) return `user:${userId}`
  
  // Use IP address as fallback
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : request.ip || 'unknown'
  
  return `ip:${ip}`
}

/**
 * Rate limit middleware
 */
export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<RateLimitResult | NextResponse> {
  const limiter = createRateLimiter()
  const clientId = getClientId(request)
  const result = await limiter.check(clientId, config)
  
  // Add rate limit headers to response
  const headers = new Headers({
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toISOString(),
  })
  
  if (!result.success) {
    return NextResponse.json(
      {
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: result.reset,
      },
      {
        status: 429,
        headers,
      }
    )
  }
  
  return result
}

/**
 * Circuit breaker for system protection
 */
export class CircuitBreaker {
  private failures: number = 0
  private lastFailTime: number = 0
  private state: 'closed' | 'open' | 'half-open' = 'closed'
  
  constructor(
    private threshold: number = 5,
    private timeout: number = 60000,
    private halfOpenRequests: number = 3
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === 'open') {
      const now = Date.now()
      if (now - this.lastFailTime > this.timeout) {
        this.state = 'half-open'
        this.failures = 0
      } else {
        throw new Error('Circuit breaker is open')
      }
    }
    
    try {
      const result = await fn()
      
      // Reset on success
      if (this.state === 'half-open') {
        if (++this.failures >= this.halfOpenRequests) {
          this.state = 'closed'
          this.failures = 0
        }
      }
      
      return result
    } catch (error) {
      this.failures++
      this.lastFailTime = Date.now()
      
      if (this.failures >= this.threshold) {
        this.state = 'open'
      }
      
      throw error
    }
  }
  
  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailTime: this.lastFailTime,
    }
  }
}