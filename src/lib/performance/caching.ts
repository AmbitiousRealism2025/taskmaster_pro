/**
 * Performance Caching Strategies
 * 
 * Implements intelligent caching for optimal performance
 */

export interface CacheConfig {
  ttl: number // Time to live in milliseconds
  maxSize: number // Maximum cache size
  strategy: 'lru' | 'fifo' | 'lfu' // Cache eviction strategy
}

export interface CacheEntry<T> {
  data: T
  timestamp: number
  accessCount: number
  lastAccessed: number
}

export interface CacheStats {
  hits: number
  misses: number
  hitRate: number
  size: number
  maxSize: number
  usage: number // Percentage
}

/**
 * High-performance in-memory cache with configurable eviction strategies
 */
export class PerformanceCache<T> {
  private cache = new Map<string, CacheEntry<T>>()
  private stats = { hits: 0, misses: 0 }
  private config: CacheConfig

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      ttl: 5 * 60 * 1000, // 5 minutes default
      maxSize: 1000,
      strategy: 'lru',
      ...config
    }
  }

  /**
   * Get item from cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      this.stats.misses++
      return null
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.cache.delete(key)
      this.stats.misses++
      return null
    }

    // Update access metadata
    entry.accessCount++
    entry.lastAccessed = Date.now()
    this.stats.hits++

    return entry.data
  }

  /**
   * Set item in cache
   */
  set(key: string, data: T): void {
    const now = Date.now()
    
    // Check if we need to evict
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this.evict()
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      accessCount: 1,
      lastAccessed: now
    }

    this.cache.set(key, entry)
  }

  /**
   * Delete item from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear()
    this.stats = { hits: 0, misses: 0 }
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > this.config.ttl
  }

  /**
   * Evict items based on strategy
   */
  private evict(): void {
    if (this.cache.size === 0) return

    switch (this.config.strategy) {
      case 'lru':
        this.evictLRU()
        break
      case 'fifo':
        this.evictFIFO()
        break
      case 'lfu':
        this.evictLFU()
        break
    }
  }

  /**
   * Evict least recently used item
   */
  private evictLRU(): void {
    let oldestKey = ''
    let oldestTime = Date.now()

    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }

  /**
   * Evict first in, first out
   */
  private evictFIFO(): void {
    let oldestKey = ''
    let oldestTime = Date.now()

    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }

  /**
   * Evict least frequently used item
   */
  private evictLFU(): void {
    let leastUsedKey = ''
    let leastCount = Number.MAX_SAFE_INTEGER

    for (const [key, entry] of this.cache) {
      if (entry.accessCount < leastCount) {
        leastCount = entry.accessCount
        leastUsedKey = key
      }
    }

    if (leastUsedKey) {
      this.cache.delete(leastUsedKey)
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      size: this.cache.size,
      maxSize: this.config.maxSize,
      usage: Math.round((this.cache.size / this.config.maxSize) * 10000) / 100
    }
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now()
    const expired: string[] = []

    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > this.config.ttl) {
        expired.push(key)
      }
    }

    expired.forEach(key => this.cache.delete(key))
  }

  /**
   * Get or set with factory function
   */
  async getOrSet(key: string, factory: () => Promise<T> | T): Promise<T> {
    const cached = this.get(key)
    if (cached !== null) {
      return cached
    }

    const data = await factory()
    this.set(key, data)
    return data
  }
}

/**
 * Specialized API response cache
 */
export class ApiCache extends PerformanceCache<any> {
  constructor() {
    super({
      ttl: 2 * 60 * 1000, // 2 minutes for API responses
      maxSize: 500,
      strategy: 'lru'
    })
  }

  /**
   * Cache HTTP responses with automatic serialization
   */
  cacheResponse(url: string, method: string, data: any): void {
    const key = `${method.toUpperCase()}:${url}`
    this.set(key, {
      data,
      timestamp: Date.now(),
      url,
      method
    })
  }

  /**
   * Get cached HTTP response
   */
  getCachedResponse(url: string, method: string): any | null {
    const key = `${method.toUpperCase()}:${url}`
    const cached = this.get(key)
    return cached ? cached.data : null
  }
}

/**
 * Component render cache for expensive computations
 */
export class ComponentCache extends PerformanceCache<any> {
  constructor() {
    super({
      ttl: 10 * 60 * 1000, // 10 minutes for component data
      maxSize: 200,
      strategy: 'lfu' // Frequently used components stay cached
    })
  }

  /**
   * Cache component props/state combination
   */
  cacheComponent(componentName: string, props: Record<string, any>, result: any): void {
    const key = this.getComponentKey(componentName, props)
    this.set(key, result)
  }

  /**
   * Get cached component result
   */
  getCachedComponent(componentName: string, props: Record<string, any>): any | null {
    const key = this.getComponentKey(componentName, props)
    return this.get(key)
  }

  /**
   * Generate consistent key for component + props
   */
  private getComponentKey(componentName: string, props: Record<string, any>): string {
    const propsHash = JSON.stringify(props, Object.keys(props).sort())
    return `${componentName}:${propsHash}`
  }
}

/**
 * Query result cache for database/API queries
 */
export class QueryCache extends PerformanceCache<any> {
  constructor() {
    super({
      ttl: 5 * 60 * 1000, // 5 minutes for queries
      maxSize: 1000,
      strategy: 'lru'
    })
  }

  /**
   * Cache query with parameters
   */
  cacheQuery(queryName: string, params: Record<string, any>, result: any): void {
    const key = this.getQueryKey(queryName, params)
    this.set(key, result)
  }

  /**
   * Get cached query result
   */
  getCachedQuery(queryName: string, params: Record<string, any>): any | null {
    const key = this.getQueryKey(queryName, params)
    return this.get(key)
  }

  /**
   * Invalidate queries by pattern
   */
  invalidateQueries(pattern: string): void {
    const keysToDelete: string[] = []
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => this.delete(key))
  }

  /**
   * Generate consistent key for query + params
   */
  private getQueryKey(queryName: string, params: Record<string, any>): string {
    const paramsHash = JSON.stringify(params, Object.keys(params).sort())
    return `${queryName}:${paramsHash}`
  }
}

/**
 * Global cache instances
 */
export const apiCache = new ApiCache()
export const componentCache = new ComponentCache()
export const queryCache = new QueryCache()

/**
 * Browser storage cache with compression
 */
export class BrowserStorageCache {
  private prefix: string

  constructor(prefix = 'taskmaster_cache') {
    this.prefix = prefix
  }

  /**
   * Set item in localStorage with compression and TTL
   */
  set(key: string, data: any, ttl?: number): boolean {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false
    }

    try {
      const item = {
        data,
        timestamp: Date.now(),
        ttl: ttl || 5 * 60 * 1000 // 5 minutes default
      }

      const compressed = this.compress(JSON.stringify(item))
      localStorage.setItem(`${this.prefix}:${key}`, compressed)
      return true
    } catch (error) {
      // Storage quota exceeded or other error
      this.cleanup()
      return false
    }
  }

  /**
   * Get item from localStorage with decompression
   */
  get(key: string): any | null {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null
    }

    try {
      const compressed = localStorage.getItem(`${this.prefix}:${key}`)
      if (!compressed) return null

      const decompressed = this.decompress(compressed)
      const item = JSON.parse(decompressed)

      // Check if expired
      if (Date.now() - item.timestamp > item.ttl) {
        this.delete(key)
        return null
      }

      return item.data
    } catch (error) {
      this.delete(key)
      return null
    }
  }

  /**
   * Delete item from localStorage
   */
  delete(key: string): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(`${this.prefix}:${key}`)
    }
  }

  /**
   * Clean up expired items
   */
  cleanup(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return
    }

    const keysToDelete: string[] = []
    const now = Date.now()

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(`${this.prefix}:`)) {
        try {
          const compressed = localStorage.getItem(key)
          if (compressed) {
            const item = JSON.parse(this.decompress(compressed))
            if (now - item.timestamp > item.ttl) {
              keysToDelete.push(key)
            }
          }
        } catch {
          keysToDelete.push(key)
        }
      }
    }

    keysToDelete.forEach(key => localStorage.removeItem(key))
  }

  /**
   * Simple compression using base64 and string replacement
   */
  private compress(data: string): string {
    // Simple compression - in production you might want to use a proper compression library
    return btoa(data.replace(/\s+/g, ' '))
  }

  /**
   * Simple decompression
   */
  private decompress(data: string): string {
    return atob(data)
  }
}

/**
 * Global browser storage cache
 */
export const browserCache = new BrowserStorageCache()

/**
 * Initialize caching system with cleanup intervals
 */
export function initCaching(): void {
  if (typeof window !== 'undefined') {
    // Clean up caches every 10 minutes
    setInterval(() => {
      apiCache.cleanup()
      componentCache.cleanup()
      queryCache.cleanup()
      browserCache.cleanup()
    }, 10 * 60 * 1000)

    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
      browserCache.cleanup()
    })
  }
}

/**
 * Cache performance metrics
 */
export function getCacheMetrics(): Record<string, CacheStats> {
  return {
    api: apiCache.getStats(),
    component: componentCache.getStats(),
    query: queryCache.getStats()
  }
}