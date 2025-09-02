// Enhanced Redis Client for TaskMaster Pro Notifications
// Part of Phase 3.2 - External Integration Layer

import { createClient, RedisClientType } from 'redis'

export interface RedisConfig {
  host: string
  port: number
  password?: string
  db?: number
  maxRetries?: number
  retryDelayOnFailover?: number
}

class EnhancedRedisClient {
  private client: RedisClientType
  private isConnected = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectDelay = 1000

  constructor(config: RedisConfig) {
    const url = config.password 
      ? `redis://:${config.password}@${config.host}:${config.port}/${config.db || 0}`
      : `redis://${config.host}:${config.port}/${config.db || 0}`

    this.client = createClient({
      url,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries >= this.maxReconnectAttempts) {
            return new Error('Max reconnect attempts reached')
          }
          return Math.min(retries * this.reconnectDelay, 30000)
        }
      }
    })

    this.setupEventHandlers()
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      console.log('Enhanced Redis client connected')
      this.isConnected = true
      this.reconnectAttempts = 0
    })

    this.client.on('error', (error) => {
      console.error('Enhanced Redis client error:', error)
      this.isConnected = false
    })

    this.client.on('end', () => {
      console.log('Enhanced Redis client disconnected')
      this.isConnected = false
    })

    this.client.on('reconnecting', () => {
      this.reconnectAttempts++
      console.log(`Enhanced Redis client reconnecting... (attempt ${this.reconnectAttempts})`)
    })
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect()
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.disconnect()
      this.isConnected = false
    }
  }

  // Core Redis operations with error handling
  async set(key: string, value: string, options?: { EX?: number; PX?: number }): Promise<void> {
    await this.ensureConnected()
    await this.client.set(key, value, options)
  }

  async setEx(key: string, seconds: number, value: string): Promise<void> {
    await this.ensureConnected()
    await this.client.setEx(key, seconds, value)
  }

  async get(key: string): Promise<string | null> {
    await this.ensureConnected()
    return await this.client.get(key)
  }

  async del(key: string): Promise<number> {
    await this.ensureConnected()
    return await this.client.del(key)
  }

  async exists(key: string): Promise<number> {
    await this.ensureConnected()
    return await this.client.exists(key)
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    await this.ensureConnected()
    return await this.client.expire(key, seconds)
  }

  // Sorted set operations for priority queues
  async zadd(key: string, score: number, member: string): Promise<number> {
    await this.ensureConnected()
    return await this.client.zAdd(key, { score, value: member })
  }

  async zrangeByScore(
    key: string, 
    min: number, 
    max: number, 
    options?: { LIMIT?: { offset: number; count: number } }
  ): Promise<string[]> {
    await this.ensureConnected()
    return await this.client.zRangeByScore(key, min, max, options)
  }

  async zrem(key: string, ...members: string[]): Promise<number> {
    await this.ensureConnected()
    return await this.client.zRem(key, members)
  }

  async zcard(key: string): Promise<number> {
    await this.ensureConnected()
    return await this.client.zCard(key)
  }

  async zrange(key: string, start: number, stop: number, options?: { WITHSCORES?: boolean }): Promise<string[]> {
    await this.ensureConnected()
    return await this.client.zRange(key, start, stop, options)
  }

  // Pub/Sub operations
  async publish(channel: string, message: string): Promise<number> {
    await this.ensureConnected()
    return await this.client.publish(channel, message)
  }

  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    await this.ensureConnected()
    const subscriber = this.client.duplicate()
    await subscriber.connect()
    
    await subscriber.subscribe(channel, (message) => {
      callback(message)
    })
  }

  // Increment operations for rate limiting
  async incr(key: string): Promise<number> {
    await this.ensureConnected()
    return await this.client.incr(key)
  }

  async incrBy(key: string, increment: number): Promise<number> {
    await this.ensureConnected()
    return await this.client.incrBy(key, increment)
  }

  // Hash operations
  async hset(key: string, field: string, value: string): Promise<number> {
    await this.ensureConnected()
    return await this.client.hSet(key, field, value)
  }

  async hget(key: string, field: string): Promise<string | undefined> {
    await this.ensureConnected()
    return await this.client.hGet(key, field)
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    await this.ensureConnected()
    return await this.client.hGetAll(key)
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    await this.ensureConnected()
    return await this.client.hDel(key, fields)
  }

  // List operations for simple queues
  async lpush(key: string, ...elements: string[]): Promise<number> {
    await this.ensureConnected()
    return await this.client.lPush(key, elements)
  }

  async rpop(key: string): Promise<string | null> {
    await this.ensureConnected()
    return await this.client.rPop(key)
  }

  async llen(key: string): Promise<number> {
    await this.ensureConnected()
    return await this.client.lLen(key)
  }

  // Connection management
  private async ensureConnected(): Promise<void> {
    if (!this.isConnected) {
      await this.connect()
    }
  }

  // Health check
  async ping(): Promise<string> {
    await this.ensureConnected()
    return await this.client.ping()
  }

  // Get connection status
  isHealthy(): boolean {
    return this.isConnected && this.client.isReady
  }

  // Get client stats
  getStats() {
    return {
      connected: this.isConnected,
      ready: this.client.isReady,
      reconnectAttempts: this.reconnectAttempts
    }
  }
}

// Singleton pattern for Redis client
let redisClient: EnhancedRedisClient | null = null

export function createRedisClient(config?: RedisConfig): EnhancedRedisClient {
  if (!redisClient) {
    const defaultConfig: RedisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      maxRetries: parseInt(process.env.REDIS_MAX_RETRIES || '10'),
      retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY || '100')
    }

    redisClient = new EnhancedRedisClient(config || defaultConfig)
  }

  return redisClient
}

export function getRedisClient(): EnhancedRedisClient | null {
  return redisClient
}

export { EnhancedRedisClient }