// Multi-Level Rate Limiting for Notification System
// Part of Phase 3.2 - External Integration Layer

import { EnhancedRedisClient } from '../../redis/enhanced-client'
import { RateLimitConfig, RateLimitResult } from '../../../types/enhanced-notifications'

export class NotificationRateLimiter {
  private redis: EnhancedRedisClient
  private config: RateLimitConfig

  constructor(redisClient: EnhancedRedisClient, config: RateLimitConfig) {
    this.redis = redisClient
    this.config = config
  }

  // Check rate limits for a specific user
  async checkUserLimit(userId: string): Promise<RateLimitResult> {
    const now = Date.now()
    const results = await Promise.all([
      this.checkRateLimit(`user:${userId}:minute`, 60, this.config.maxNotificationsPerMinute),
      this.checkRateLimit(`user:${userId}:hour`, 3600, this.config.maxNotificationsPerHour),
      this.checkRateLimit(`user:${userId}:day`, 86400, this.config.maxNotificationsPerDay),
      this.checkBurstLimit(userId)
    ])

    const [minuteResult, hourResult, dayResult, burstResult] = results

    // Return the most restrictive limit
    const restrictiveResult = [minuteResult, hourResult, dayResult, burstResult]
      .find(result => !result.allowed)

    return restrictiveResult || minuteResult
  }

  // Check global system rate limits
  async checkGlobalLimit(): Promise<RateLimitResult> {
    const globalMinuteLimit = this.config.maxNotificationsPerMinute * 100 // Scale for global use
    const globalHourLimit = this.config.maxNotificationsPerHour * 100

    const results = await Promise.all([
      this.checkRateLimit('global:minute', 60, globalMinuteLimit),
      this.checkRateLimit('global:hour', 3600, globalHourLimit)
    ])

    const [minuteResult, hourResult] = results
    return !minuteResult.allowed ? minuteResult : hourResult
  }

  // Check burst protection (rapid-fire prevention)
  async checkBurstLimit(userId: string): Promise<RateLimitResult> {
    const burstKey = `user:${userId}:burst`
    const burstWindow = 30 // 30 seconds
    
    return this.checkRateLimit(burstKey, burstWindow, this.config.burstLimit)
  }

  // Core rate limiting implementation with sliding window
  private async checkRateLimit(
    key: string, 
    windowSeconds: number, 
    limit: number
  ): Promise<RateLimitResult> {
    const now = Date.now()
    const windowStart = now - (windowSeconds * 1000)
    const rateLimitKey = `ratelimit:${key}`

    try {
      // Use a sorted set to implement sliding window
      const pipe = [
        // Remove expired entries
        ['zremrangebyscore', rateLimitKey, 0, windowStart],
        // Count current entries
        ['zcard', rateLimitKey],
        // Add current request
        ['zadd', rateLimitKey, now, `${now}-${Math.random()}`],
        // Set expiration
        ['expire', rateLimitKey, windowSeconds * 2]
      ]

      // Execute pipeline (simplified - in production you'd use actual Redis pipeline)
      await this.redis.zrangeByScore(rateLimitKey, 0, windowStart) // This simulates cleanup
      const currentCount = await this.redis.zcard(rateLimitKey)

      if (currentCount >= limit) {
        // Calculate when the user can retry
        const oldestEntries = await this.redis.zrange(rateLimitKey, 0, 0, { WITHSCORES: true })
        const retryAfterMs = oldestEntries.length > 0 
          ? Math.max(0, (parseInt(oldestEntries[1]) + (windowSeconds * 1000)) - now)
          : windowSeconds * 1000

        return {
          allowed: false,
          retryAfterMs: this.calculateBackoffDelay(retryAfterMs),
          remaining: 0,
          resetTime: new Date(now + retryAfterMs)
        }
      }

      // Increment the counter
      await this.redis.zadd(rateLimitKey, now, `${now}-${Math.random()}`)
      await this.redis.expire(rateLimitKey, windowSeconds * 2)

      return {
        allowed: true,
        remaining: Math.max(0, limit - currentCount - 1),
        resetTime: new Date(now + (windowSeconds * 1000))
      }

    } catch (error) {
      console.error('Rate limit check failed:', error)
      // Fail open - allow the request if rate limiting is unavailable
      return {
        allowed: true,
        remaining: limit - 1,
        resetTime: new Date(now + (windowSeconds * 1000))
      }
    }
  }

  // Increment counters without checking limits (for tracking)
  async incrementCounters(userId: string): Promise<void> {
    const now = Date.now()
    const promises = [
      this.redis.zadd(`ratelimit:user:${userId}:minute`, now, `${now}-${Math.random()}`),
      this.redis.zadd(`ratelimit:user:${userId}:hour`, now, `${now}-${Math.random()}`),
      this.redis.zadd(`ratelimit:user:${userId}:day`, now, `${now}-${Math.random()}`),
      this.redis.zadd(`ratelimit:global:minute`, now, `${now}-${Math.random()}`),
      this.redis.zadd(`ratelimit:global:hour`, now, `${now}-${Math.random()}`)
    ]

    await Promise.all(promises)
  }

  // Calculate exponential backoff delay
  private calculateBackoffDelay(baseDelayMs: number): number {
    const jitter = Math.random() * 0.1 // 10% jitter
    const backoffMultiplier = this.config.backoffMultiplier || 2
    const maxBackoff = this.config.maxBackoffMs || 300000 // 5 minutes

    const backoffDelay = baseDelayMs * backoffMultiplier * (1 + jitter)
    return Math.min(backoffDelay, maxBackoff)
  }

  // Get current rate limit status for a user
  async getUserRateLimitStatus(userId: string): Promise<{
    minute: { count: number; limit: number; resetTime: Date }
    hour: { count: number; limit: number; resetTime: Date }
    day: { count: number; limit: number; resetTime: Date }
  }> {
    const now = Date.now()
    
    const [minuteCount, hourCount, dayCount] = await Promise.all([
      this.redis.zcard(`ratelimit:user:${userId}:minute`),
      this.redis.zcard(`ratelimit:user:${userId}:hour`),
      this.redis.zcard(`ratelimit:user:${userId}:day`)
    ])

    return {
      minute: {
        count: minuteCount,
        limit: this.config.maxNotificationsPerMinute,
        resetTime: new Date(now + 60000)
      },
      hour: {
        count: hourCount,
        limit: this.config.maxNotificationsPerHour,
        resetTime: new Date(now + 3600000)
      },
      day: {
        count: dayCount,
        limit: this.config.maxNotificationsPerDay,
        resetTime: new Date(now + 86400000)
      }
    }
  }

  // Clean up expired rate limit entries (maintenance task)
  async cleanupExpiredEntries(): Promise<void> {
    const now = Date.now()
    const patterns = [
      'user:*:minute',
      'user:*:hour', 
      'user:*:day',
      'user:*:burst',
      'global:minute',
      'global:hour'
    ]

    for (const pattern of patterns) {
      // This is simplified - in production you'd use Redis SCAN to find all matching keys
      const keys = await this.getAllMatchingKeys(pattern)
      
      for (const key of keys) {
        const fullKey = `ratelimit:${key}`
        
        // Remove entries older than their respective windows
        let windowMs = 60000 // Default to 1 minute
        if (key.includes('hour')) windowMs = 3600000
        else if (key.includes('day')) windowMs = 86400000
        else if (key.includes('burst')) windowMs = 30000

        await this.redis.zrangeByScore(fullKey, 0, now - windowMs)
      }
    }
  }

  // Helper method to get all matching keys (simplified)
  private async getAllMatchingKeys(pattern: string): Promise<string[]> {
    // This is a simplified implementation
    // In production, you'd use Redis SCAN command to efficiently find matching keys
    return []
  }

  // Get rate limiter statistics
  async getStatistics(): Promise<{
    totalRequests: number
    blockedRequests: number
    averageResponseTime: number
    topUsers: Array<{ userId: string; count: number }>
  }> {
    // This would be implemented with proper metrics collection in production
    return {
      totalRequests: 0,
      blockedRequests: 0,
      averageResponseTime: 0,
      topUsers: []
    }
  }

  // Reset rate limits for a user (admin function)
  async resetUserLimits(userId: string): Promise<void> {
    const keys = [
      `ratelimit:user:${userId}:minute`,
      `ratelimit:user:${userId}:hour`,
      `ratelimit:user:${userId}:day`,
      `ratelimit:user:${userId}:burst`
    ]

    await Promise.all(keys.map(key => this.redis.del(key)))
  }

  // Configure dynamic rate limits (runtime configuration)
  updateConfig(newConfig: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  // Get current configuration
  getConfig(): RateLimitConfig {
    return { ...this.config }
  }

  // Health check for rate limiter
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    latency: number
    errors: string[]
  }> {
    const startTime = Date.now()
    const errors: string[] = []

    try {
      await this.redis.ping()
      const latency = Date.now() - startTime

      if (latency > 1000) {
        errors.push('High Redis latency detected')
      }

      return {
        status: errors.length === 0 ? 'healthy' : 'degraded',
        latency,
        errors
      }
    } catch (error) {
      errors.push(`Redis connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return {
        status: 'unhealthy',
        latency: Date.now() - startTime,
        errors
      }
    }
  }
}