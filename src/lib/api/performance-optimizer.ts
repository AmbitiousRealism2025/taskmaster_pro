/**
 * API Performance Optimization & Rate Limiting
 * Enterprise-grade request handling, response optimization, and traffic control
 */

import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import rateLimit from 'express-rate-limit'
import slowDown from 'express-slow-down'
import { CachingService } from '../caching/redis-client'
import { createHash } from 'crypto'

export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
  keyGenerator?: (request: NextRequest) => string
}

export interface PerformanceConfig {
  enableCompression: boolean
  enableEtag: boolean
  cacheStatic: boolean
  optimizeImages: boolean
  enablePreload: boolean
}

export interface APIMetrics {
  requestCount: number
  averageResponseTime: number
  errorRate: number
  rateLimitHits: number
  cacheHitRate: number
  throughput: number
}

export class APIPerformanceOptimizer {
  private static requestMetrics = new Map<string, {
    count: number
    totalTime: number
    errors: number
    rateLimitHits: number
    cacheHits: number
    cacheMisses: number
  }>()

  /**
   * Rate limiting configurations for different endpoint types
   */
  static readonly RATE_LIMITS: Record<string, RateLimitConfig> = {
    AUTH: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 10, // Strict for auth endpoints
    },
    API: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 1000, // General API endpoints
    },
    HEAVY: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 10, // Heavy operations (analytics, exports)
    },
    PUBLIC: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100, // Public endpoints
    },
    REALTIME: {
      windowMs: 5 * 1000, // 5 seconds
      maxRequests: 50, // WebSocket/SSE connections
    }
  }

  /**
   * Advanced rate limiting with Redis backend
   */
  static async checkRateLimit(
    request: NextRequest,
    config: RateLimitConfig
  ): Promise<{ allowed: boolean; resetTime?: number; remaining?: number }> {
    const key = config.keyGenerator 
      ? config.keyGenerator(request)
      : this.generateRateLimitKey(request)
    
    const windowKey = `ratelimit:${key}:${Math.floor(Date.now() / config.windowMs)}`
    
    try {
      const current = await CachingService.get<number>(windowKey) || 0
      
      if (current >= config.maxRequests) {
        this.recordRateLimitHit(request.nextUrl.pathname)
        return {
          allowed: false,
          resetTime: Math.ceil(Date.now() / config.windowMs) * config.windowMs,
          remaining: 0
        }
      }
      
      // Increment counter
      await CachingService.set(windowKey, current + 1, {
        ttl: Math.ceil(config.windowMs / 1000),
        tier: 'redis'
      })
      
      return {
        allowed: true,
        remaining: config.maxRequests - current - 1
      }
    } catch (error) {
      console.error('Rate limit check failed:', error)
      return { allowed: true } // Fail open
    }
  }

  /**
   * Request optimization middleware
   */
  static async optimizeRequest(request: NextRequest): Promise<{
    shouldCompress: boolean
    shouldCache: boolean
    cacheKey?: string
    cacheTTL?: number
  }> {
    const pathname = request.nextUrl.pathname
    const method = request.method
    const acceptEncoding = request.headers.get('accept-encoding') || ''
    
    // Check if compression is supported and beneficial
    const shouldCompress = acceptEncoding.includes('gzip') && 
      (method === 'GET' && this.isCompressibleEndpoint(pathname))
    
    // Determine caching strategy
    const shouldCache = method === 'GET' && this.isCacheableEndpoint(pathname)
    let cacheKey: string | undefined
    let cacheTTL: number | undefined
    
    if (shouldCache) {
      const queryParams = Object.fromEntries(request.nextUrl.searchParams.entries())
      cacheKey = this.generateCacheKey(pathname, queryParams)
      cacheTTL = this.getCacheTTL(pathname)
    }
    
    return {
      shouldCompress,
      shouldCache,
      cacheKey,
      cacheTTL
    }
  }

  /**
   * Response optimization
   */
  static async optimizeResponse(
    response: NextResponse,
    optimization: {
      shouldCompress: boolean
      shouldCache: boolean
      cacheKey?: string
      cacheTTL?: number
    }
  ): Promise<NextResponse> {
    // Add performance headers
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    
    // Enable compression hint
    if (optimization.shouldCompress) {
      response.headers.set('Content-Encoding', 'gzip')
    }
    
    // Set cache headers
    if (optimization.shouldCache && optimization.cacheTTL) {
      response.headers.set('Cache-Control', `public, max-age=${optimization.cacheTTL}, s-maxage=${optimization.cacheTTL}`)
      response.headers.set('ETag', this.generateETag(response))
    }
    
    // Add performance timing headers
    response.headers.set('X-Response-Time', Date.now().toString())
    
    return response
  }

  /**
   * Cached API handler wrapper
   */
  static withCache<T>(
    handler: (request: NextRequest) => Promise<T>,
    config: { ttl: number; tags?: string[] }
  ) {
    return async (request: NextRequest): Promise<T> => {
      const cacheKey = this.generateCacheKey(
        request.nextUrl.pathname,
        Object.fromEntries(request.nextUrl.searchParams.entries())
      )
      
      // Try cache first
      const cached = await CachingService.get<T>(cacheKey)
      if (cached !== null) {
        this.recordCacheHit(request.nextUrl.pathname)
        return cached
      }
      
      // Execute handler
      const result = await handler(request)
      
      // Cache result
      await CachingService.set(cacheKey, result, {
        ttl: config.ttl,
        tier: 'redis',
        tags: config.tags
      })
      
      this.recordCacheMiss(request.nextUrl.pathname)
      return result
    }
  }

  /**
   * API response compression
   */
  static compressResponse(data: any): Buffer {
    const zlib = require('zlib')
    const jsonString = JSON.stringify(data)
    
    // Only compress if size > 1KB
    if (jsonString.length > 1024) {
      return zlib.gzipSync(Buffer.from(jsonString))
    }
    
    return Buffer.from(jsonString)
  }

  /**
   * Batch API request optimizer
   */
  static async optimizeBatchRequest<T>(
    requests: Array<() => Promise<T>>,
    maxConcurrency: number = 5
  ): Promise<T[]> {
    const results: T[] = []
    
    // Process requests in batches to avoid overwhelming the system
    for (let i = 0; i < requests.length; i += maxConcurrency) {
      const batch = requests.slice(i, i + maxConcurrency)
      const batchResults = await Promise.all(batch.map(request => request()))
      results.push(...batchResults)
    }
    
    return results
  }

  /**
   * Database query optimization for APIs
   */
  static optimizeQuery(baseQuery: any, request: NextRequest): any {
    const searchParams = request.nextUrl.searchParams
    
    // Add pagination
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')
    
    // Add sorting
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    
    // Add filtering
    const filters: any = {}
    for (const [key, value] of searchParams) {
      if (key.startsWith('filter_')) {
        const filterKey = key.replace('filter_', '')
        filters[filterKey] = value
      }
    }
    
    return {
      ...baseQuery,
      take: limit,
      skip: offset,
      orderBy: { [sortBy]: sortOrder },
      where: {
        ...baseQuery.where,
        ...filters
      }
    }
  }

  /**
   * Generate rate limit key based on user and IP
   */
  private static generateRateLimitKey(request: NextRequest): string {
    const ip = this.getClientIP(request)
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const userId = request.headers.get('authorization') ? 'authenticated' : 'anonymous'
    
    return createHash('sha256')
      .update(`${ip}:${userId}:${userAgent}`)
      .digest('hex')
      .substring(0, 16)
  }

  /**
   * Get client IP address
   */
  private static getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for')
    const real = request.headers.get('x-real-ip')
    const cloudflare = request.headers.get('cf-connecting-ip')
    
    if (cloudflare) return cloudflare
    if (real) return real
    if (forwarded) return forwarded.split(',')[0].trim()
    
    return 'unknown'
  }

  /**
   * Check if endpoint should be compressed
   */
  private static isCompressibleEndpoint(pathname: string): boolean {
    const compressiblePatterns = [
      /^\/api\/tasks/,
      /^\/api\/notes/,
      /^\/api\/analytics/,
      /^\/api\/habits/,
      /^\/api\/projects/
    ]
    
    return compressiblePatterns.some(pattern => pattern.test(pathname))
  }

  /**
   * Check if endpoint should be cached
   */
  private static isCacheableEndpoint(pathname: string): boolean {
    const cacheablePatterns = [
      /^\/api\/analytics\/summary/,
      /^\/api\/habits\/streaks/,
      /^\/api\/productivity\/metrics/,
      /^\/api\/user\/profile/
    ]
    
    const nonCacheablePatterns = [
      /^\/api\/auth/,
      /^\/api\/realtime/,
      /^\/api\/.*\/create/,
      /^\/api\/.*\/update/,
      /^\/api\/.*\/delete/
    ]
    
    // Don't cache auth, realtime, or mutation endpoints
    if (nonCacheablePatterns.some(pattern => pattern.test(pathname))) {
      return false
    }
    
    // Cache specific analytical endpoints
    return cacheablePatterns.some(pattern => pattern.test(pathname))
  }

  /**
   * Generate cache key from pathname and parameters
   */
  private static generateCacheKey(pathname: string, params: Record<string, any>): string {
    const paramString = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|')
    
    const hash = createHash('sha256')
      .update(`${pathname}:${paramString}`)
      .digest('hex')
      .substring(0, 16)
    
    return `api:${hash}`
  }

  /**
   * Get cache TTL based on endpoint type
   */
  private static getCacheTTL(pathname: string): number {
    if (pathname.includes('analytics')) return 1800 // 30 minutes
    if (pathname.includes('profile')) return 3600 // 1 hour
    if (pathname.includes('habits')) return 300 // 5 minutes
    if (pathname.includes('metrics')) return 900 // 15 minutes
    
    return 600 // Default 10 minutes
  }

  /**
   * Generate ETag for response
   */
  private static generateETag(response: NextResponse): string {
    // Simple ETag based on response headers and timestamp
    const content = response.headers.get('content-length') || '0'
    const modified = response.headers.get('last-modified') || Date.now().toString()
    
    return createHash('md5')
      .update(`${content}:${modified}`)
      .digest('hex')
      .substring(0, 16)
  }

  /**
   * Metrics tracking
   */
  private static recordRequest(pathname: string, responseTime: number, isError: boolean = false): void {
    const metrics = this.requestMetrics.get(pathname) || {
      count: 0,
      totalTime: 0,
      errors: 0,
      rateLimitHits: 0,
      cacheHits: 0,
      cacheMisses: 0
    }
    
    metrics.count++
    metrics.totalTime += responseTime
    if (isError) metrics.errors++
    
    this.requestMetrics.set(pathname, metrics)
  }

  private static recordRateLimitHit(pathname: string): void {
    const metrics = this.requestMetrics.get(pathname) || {
      count: 0,
      totalTime: 0,
      errors: 0,
      rateLimitHits: 0,
      cacheHits: 0,
      cacheMisses: 0
    }
    
    metrics.rateLimitHits++
    this.requestMetrics.set(pathname, metrics)
  }

  private static recordCacheHit(pathname: string): void {
    const metrics = this.requestMetrics.get(pathname) || {
      count: 0,
      totalTime: 0,
      errors: 0,
      rateLimitHits: 0,
      cacheHits: 0,
      cacheMisses: 0
    }
    
    metrics.cacheHits++
    this.requestMetrics.set(pathname, metrics)
  }

  private static recordCacheMiss(pathname: string): void {
    const metrics = this.requestMetrics.get(pathname) || {
      count: 0,
      totalTime: 0,
      errors: 0,
      rateLimitHits: 0,
      cacheHits: 0,
      cacheMisses: 0
    }
    
    metrics.cacheMisses++
    this.requestMetrics.set(pathname, metrics)
  }

  /**
   * Get API performance metrics
   */
  static getMetrics(): Record<string, APIMetrics> {
    const result: Record<string, APIMetrics> = {}
    
    for (const [pathname, metrics] of this.requestMetrics) {
      const totalCacheRequests = metrics.cacheHits + metrics.cacheMisses
      
      result[pathname] = {
        requestCount: metrics.count,
        averageResponseTime: metrics.count > 0 ? metrics.totalTime / metrics.count : 0,
        errorRate: metrics.count > 0 ? metrics.errors / metrics.count : 0,
        rateLimitHits: metrics.rateLimitHits,
        cacheHitRate: totalCacheRequests > 0 ? metrics.cacheHits / totalCacheRequests : 0,
        throughput: metrics.count // Requests per time window
      }
    }
    
    return result
  }

  /**
   * Middleware wrapper for Next.js API routes
   */
  static withPerformanceOptimization(
    handler: (request: NextRequest) => Promise<NextResponse>,
    config?: {
      rateLimit?: keyof typeof APIPerformanceOptimizer.RATE_LIMITS
      cache?: { ttl: number; tags?: string[] }
    }
  ) {
    return async (request: NextRequest): Promise<NextResponse> => {
      const startTime = Date.now()
      const pathname = request.nextUrl.pathname
      
      try {
        // Rate limiting
        if (config?.rateLimit) {
          const rateLimitConfig = this.RATE_LIMITS[config.rateLimit]
          const rateLimitResult = await this.checkRateLimit(request, rateLimitConfig)
          
          if (!rateLimitResult.allowed) {
            return NextResponse.json(
              { error: 'Too many requests' },
              { 
                status: 429,
                headers: {
                  'X-RateLimit-Reset': rateLimitResult.resetTime?.toString() || '',
                  'X-RateLimit-Remaining': '0'
                }
              }
            )
          }
        }
        
        // Request optimization
        const optimization = await this.optimizeRequest(request)
        
        // Check cache for GET requests
        if (optimization.shouldCache && optimization.cacheKey) {
          const cached = await CachingService.get(optimization.cacheKey)
          if (cached !== null) {
            this.recordCacheHit(pathname)
            return NextResponse.json(cached, {
              headers: {
                'X-Cache': 'HIT',
                'X-Response-Time': (Date.now() - startTime).toString()
              }
            })
          }
        }
        
        // Execute handler
        const response = await handler(request)
        
        // Cache response if applicable
        if (optimization.shouldCache && optimization.cacheKey && response.ok) {
          const responseData = await response.json()
          await CachingService.set(optimization.cacheKey, responseData, {
            ttl: optimization.cacheTTL || 600,
            tier: 'redis',
            tags: config?.cache?.tags
          })
          this.recordCacheMiss(pathname)
        }
        
        // Optimize response
        const optimizedResponse = await this.optimizeResponse(response, optimization)
        
        // Record metrics
        this.recordRequest(pathname, Date.now() - startTime)
        
        return optimizedResponse
      } catch (error) {
        this.recordRequest(pathname, Date.now() - startTime, true)
        throw error
      }
    }
  }
}

// Utility functions for common API patterns
export const withRateLimit = (config: keyof typeof APIPerformanceOptimizer.RATE_LIMITS) =>
  (handler: (request: NextRequest) => Promise<NextResponse>) =>
    APIPerformanceOptimizer.withPerformanceOptimization(handler, { rateLimit: config })

export const withCache = (ttl: number, tags?: string[]) =>
  (handler: (request: NextRequest) => Promise<NextResponse>) =>
    APIPerformanceOptimizer.withPerformanceOptimization(handler, { cache: { ttl, tags } })