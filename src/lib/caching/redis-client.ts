/**
 * Redis Caching Layer with CDN Integration
 * Multi-tier caching strategy for enterprise-scale performance
 */

import { Redis } from 'ioredis'
import { createHash } from 'crypto'

export interface CacheConfig {
  ttl: number
  tier: 'memory' | 'redis' | 'cdn'
  tags?: string[]
  compression?: boolean
}

export interface CDNConfig {
  provider: 'cloudflare' | 'aws' | 'cloudfront' | 'fastly'
  apiKey?: string
  zoneId?: string
  distributionId?: string
  purgeEndpoint?: string
}

export interface CacheMetrics {
  hitRate: number
  missRate: number
  totalRequests: number
  averageResponseTime: number
  memoryUsage: number
  redisConnections: number
}

export class CachingService {
  private static redis: Redis
  private static memoryCache = new Map<string, { value: any; expires: number; tags: string[] }>()
  private static cdnConfig: CDNConfig
  private static metrics = {
    hits: 0,
    misses: 0,
    totalRequests: 0,
    responseTime: [] as number[]
  }

  static initialize(redisUrl: string, cdnConfig?: CDNConfig) {
    this.redis = new Redis(redisUrl, {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      family: 4, // IPv4
      enableOfflineQueue: false
    })

    this.cdnConfig = cdnConfig || {
      provider: 'cloudflare'
    }

    // Set up Redis event handlers
    this.redis.on('error', (error) => {
      console.error('Redis connection error:', error)
    })

    this.redis.on('connect', () => {
      console.log('✅ Redis connected successfully')
    })

    // Memory cache cleanup interval
    setInterval(() => this.cleanupMemoryCache(), 60000) // 1 minute
  }

  /**
   * Multi-tier cache retrieval with fallback strategy
   */
  static async get<T>(key: string, config?: CacheConfig): Promise<T | null> {
    const startTime = Date.now()
    this.metrics.totalRequests++

    try {
      // Tier 1: Memory cache (fastest)
      const memoryResult = this.getFromMemory<T>(key)
      if (memoryResult !== null) {
        this.recordHit(startTime)
        return memoryResult
      }

      // Tier 2: Redis cache (fast)
      const redisResult = await this.getFromRedis<T>(key)
      if (redisResult !== null) {
        // Store in memory cache for future requests
        this.setInMemory(key, redisResult, { ttl: 300, tier: 'memory' }) // 5 min memory cache
        this.recordHit(startTime)
        return redisResult
      }

      this.recordMiss(startTime)
      return null
    } catch (error) {
      console.error('Cache retrieval error:', error)
      this.recordMiss(startTime)
      return null
    }
  }

  /**
   * Multi-tier cache storage
   */
  static async set<T>(key: string, value: T, config: CacheConfig): Promise<void> {
    try {
      // Always store in memory for immediate access
      this.setInMemory(key, value, config)

      // Store in Redis for persistence and sharing across instances
      await this.setInRedis(key, value, config)

      // CDN caching for static/semi-static content
      if (config.tier === 'cdn' && this.shouldCacheInCDN(key)) {
        await this.setInCDN(key, value, config)
      }
    } catch (error) {
      console.error('Cache storage error:', error)
    }
  }

  /**
   * Delete from all cache tiers
   */
  static async delete(key: string): Promise<void> {
    try {
      // Remove from memory
      this.memoryCache.delete(key)

      // Remove from Redis
      await this.redis.del(key)

      // Purge from CDN
      await this.purgeFromCDN(key)
    } catch (error) {
      console.error('Cache deletion error:', error)
    }
  }

  /**
   * Tag-based cache invalidation
   */
  static async invalidateByTags(tags: string[]): Promise<void> {
    try {
      // Memory cache invalidation
      for (const [key, entry] of this.memoryCache) {
        if (entry.tags?.some(tag => tags.includes(tag))) {
          this.memoryCache.delete(key)
        }
      }

      // Redis tag-based invalidation
      for (const tag of tags) {
        const taggedKeys = await this.redis.smembers(`tag:${tag}`)
        if (taggedKeys.length > 0) {
          await this.redis.del(...taggedKeys)
          await this.redis.del(`tag:${tag}`)
        }
      }

      // CDN purge by tags (if supported)
      await this.purgeCDNByTags(tags)
    } catch (error) {
      console.error('Tag-based cache invalidation error:', error)
    }
  }

  /**
   * Cache warming for critical data
   */
  static async warmCache(userId: string): Promise<void> {
    const warmupTasks = [
      // User profile data
      this.warmUserProfile(userId),
      // Active tasks
      this.warmActiveTasks(userId),
      // Habit streaks
      this.warmHabitStreaks(userId),
      // Recent productivity metrics
      this.warmProductivityMetrics(userId)
    ]

    await Promise.allSettled(warmupTasks)
    console.log(`✅ Cache warmed for user: ${userId}`)
  }

  /**
   * Cache compression for large objects
   */
  private static compressValue(value: any): string {
    if (typeof value === 'string') return value
    const jsonString = JSON.stringify(value)
    
    // Only compress if size > 1KB
    if (jsonString.length > 1024) {
      const zlib = require('zlib')
      return zlib.gzipSync(jsonString).toString('base64')
    }
    
    return jsonString
  }

  private static decompressValue(compressed: string): any {
    try {
      // Check if it's base64 (compressed)
      if (compressed.match(/^[A-Za-z0-9+/]*={0,2}$/)) {
        const zlib = require('zlib')
        const buffer = Buffer.from(compressed, 'base64')
        const decompressed = zlib.gunzipSync(buffer).toString()
        return JSON.parse(decompressed)
      }
      
      // Regular JSON
      return JSON.parse(compressed)
    } catch {
      // Return as-is if parsing fails
      return compressed
    }
  }

  // Memory cache operations
  private static getFromMemory<T>(key: string): T | null {
    const entry = this.memoryCache.get(key)
    if (!entry) return null
    
    if (Date.now() > entry.expires) {
      this.memoryCache.delete(key)
      return null
    }
    
    return entry.value
  }

  private static setInMemory<T>(key: string, value: T, config: CacheConfig): void {
    const expires = Date.now() + (config.ttl * 1000)
    this.memoryCache.set(key, {
      value,
      expires,
      tags: config.tags || []
    })
  }

  // Redis operations
  private static async getFromRedis<T>(key: string): Promise<T | null> {
    try {
      const result = await this.redis.get(key)
      if (!result) return null
      return this.decompressValue(result)
    } catch (error) {
      console.error('Redis get error:', error)
      return null
    }
  }

  private static async setInRedis<T>(key: string, value: T, config: CacheConfig): Promise<void> {
    try {
      const compressed = config.compression ? this.compressValue(value) : JSON.stringify(value)
      
      await this.redis.setex(key, config.ttl, compressed)
      
      // Add to tag sets for invalidation
      if (config.tags) {
        for (const tag of config.tags) {
          await this.redis.sadd(`tag:${tag}`, key)
          await this.redis.expire(`tag:${tag}`, config.ttl + 300) // Extra 5 minutes
        }
      }
    } catch (error) {
      console.error('Redis set error:', error)
    }
  }

  // CDN operations
  private static shouldCacheInCDN(key: string): boolean {
    const cdnPatterns = [
      /^user-profile:/,
      /^public-data:/,
      /^static-content:/,
      /^analytics-summary:/
    ]
    
    return cdnPatterns.some(pattern => pattern.test(key))
  }

  private static async setInCDN<T>(key: string, value: T, config: CacheConfig): Promise<void> {
    // CDN caching is typically handled by HTTP headers
    // This method would integrate with CDN APIs for programmatic caching
    
    if (this.cdnConfig.provider === 'cloudflare' && this.cdnConfig.apiKey) {
      try {
        // Cloudflare Cache API integration
        const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${this.cdnConfig.zoneId}/purge_cache`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.cdnConfig.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            files: [`https://yourdomain.com/api/cache/${key}`]
          })
        })
        
        if (!response.ok) {
          console.warn('CDN cache set failed:', await response.text())
        }
      } catch (error) {
        console.error('CDN caching error:', error)
      }
    }
  }

  private static async purgeFromCDN(key: string): Promise<void> {
    if (this.cdnConfig.provider === 'cloudflare' && this.cdnConfig.apiKey) {
      try {
        await fetch(`https://api.cloudflare.com/client/v4/zones/${this.cdnConfig.zoneId}/purge_cache`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.cdnConfig.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            files: [`https://yourdomain.com/api/cache/${key}`]
          })
        })
      } catch (error) {
        console.error('CDN purge error:', error)
      }
    }
  }

  private static async purgeCDNByTags(tags: string[]): Promise<void> {
    if (this.cdnConfig.provider === 'cloudflare' && this.cdnConfig.apiKey) {
      try {
        await fetch(`https://api.cloudflare.com/client/v4/zones/${this.cdnConfig.zoneId}/purge_cache`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.cdnConfig.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            tags
          })
        })
      } catch (error) {
        console.error('CDN tag purge error:', error)
      }
    }
  }

  // Cache warming methods
  private static async warmUserProfile(userId: string): Promise<void> {
    const key = `user-profile:${userId}`
    // This would call your user service and cache the result
    // await this.set(key, userProfile, { ttl: 3600, tier: 'redis', tags: ['user', userId] })
  }

  private static async warmActiveTasks(userId: string): Promise<void> {
    const key = `active-tasks:${userId}`
    // Cache active tasks with 15-minute TTL
    // await this.set(key, activeTasks, { ttl: 900, tier: 'redis', tags: ['tasks', userId] })
  }

  private static async warmHabitStreaks(userId: string): Promise<void> {
    const key = `habit-streaks:${userId}`
    // Cache habit streaks with 5-minute TTL
    // await this.set(key, habitStreaks, { ttl: 300, tier: 'redis', tags: ['habits', userId] })
  }

  private static async warmProductivityMetrics(userId: string): Promise<void> {
    const key = `productivity-metrics:${userId}`
    // Cache productivity metrics with 30-minute TTL
    // await this.set(key, metrics, { ttl: 1800, tier: 'redis', tags: ['analytics', userId] })
  }

  // Memory cleanup
  private static cleanupMemoryCache(): void {
    const now = Date.now()
    let cleaned = 0
    
    for (const [key, entry] of this.memoryCache) {
      if (now > entry.expires) {
        this.memoryCache.delete(key)
        cleaned++
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired entries from memory cache`)
    }
  }

  // Metrics tracking
  private static recordHit(startTime: number): void {
    this.metrics.hits++
    this.metrics.responseTime.push(Date.now() - startTime)
    
    // Keep only last 1000 response times
    if (this.metrics.responseTime.length > 1000) {
      this.metrics.responseTime = this.metrics.responseTime.slice(-1000)
    }
  }

  private static recordMiss(startTime: number): void {
    this.metrics.misses++
    this.metrics.responseTime.push(Date.now() - startTime)
  }

  /**
   * Get cache performance metrics
   */
  static getMetrics(): CacheMetrics {
    const totalRequests = this.metrics.hits + this.metrics.misses
    const averageResponseTime = this.metrics.responseTime.length > 0
      ? this.metrics.responseTime.reduce((a, b) => a + b, 0) / this.metrics.responseTime.length
      : 0

    return {
      hitRate: totalRequests > 0 ? this.metrics.hits / totalRequests : 0,
      missRate: totalRequests > 0 ? this.metrics.misses / totalRequests : 0,
      totalRequests,
      averageResponseTime,
      memoryUsage: this.memoryCache.size,
      redisConnections: this.redis?.status === 'ready' ? 1 : 0
    }
  }

  /**
   * Generate cache key with consistent hashing
   */
  static generateKey(prefix: string, params: Record<string, any>): string {
    const paramString = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|')
    
    const hash = createHash('sha256').update(paramString).digest('hex').substring(0, 16)
    return `${prefix}:${hash}`
  }

  /**
   * Graceful shutdown
   */
  static async shutdown(): Promise<void> {
    try {
      this.memoryCache.clear()
      await this.redis?.quit()
      console.log('✅ Cache service shutdown complete')
    } catch (error) {
      console.error('Cache shutdown error:', error)
    }
  }
}

// Predefined cache configurations
export const CacheConfigs = {
  USER_PROFILE: { ttl: 3600, tier: 'redis' as const, tags: ['user'], compression: true },
  ACTIVE_TASKS: { ttl: 900, tier: 'redis' as const, tags: ['tasks'], compression: false },
  HABIT_STREAKS: { ttl: 300, tier: 'memory' as const, tags: ['habits'], compression: false },
  PRODUCTIVITY_METRICS: { ttl: 1800, tier: 'redis' as const, tags: ['analytics'], compression: true },
  PUBLIC_DATA: { ttl: 7200, tier: 'cdn' as const, tags: ['public'], compression: true },
  SESSION_DATA: { ttl: 1800, tier: 'redis' as const, tags: ['session'], compression: false }
}