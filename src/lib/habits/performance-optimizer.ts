import { Habit, HabitEntry, ProductivityMetrics } from '@/types/habit'

export interface PerformanceConfig {
  batchSize: number
  cacheTimeout: number // milliseconds
  maxConcurrentQueries: number
  enableVirtualization: boolean
  compressionLevel: 'low' | 'medium' | 'high'
}

export interface QueryOptions {
  limit?: number
  offset?: number
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
  filters?: Record<string, any>
  includeRelations?: boolean
}

export interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

export interface PaginationResult<T> {
  data: T[]
  totalCount: number
  hasMore: boolean
  nextCursor?: string
}

/**
 * Performance optimization utilities for habit analytics
 */
export class PerformanceOptimizer {
  private static cache = new Map<string, CacheEntry<any>>()
  private static readonly DEFAULT_CONFIG: PerformanceConfig = {
    batchSize: 1000,
    cacheTimeout: 5 * 60 * 1000, // 5 minutes
    maxConcurrentQueries: 3,
    enableVirtualization: true,
    compressionLevel: 'medium'
  }

  private static activeQueries = new Set<string>()
  private static queryQueue: Array<() => Promise<void>> = []

  /**
   * Optimized habit entry loading with pagination and caching
   */
  static async loadHabitEntriesPaginated(
    habitId: string,
    options: QueryOptions = {},
    config: Partial<PerformanceConfig> = {}
  ): Promise<PaginationResult<HabitEntry>> {
    const fullConfig = { ...this.DEFAULT_CONFIG, ...config }
    const cacheKey = `habit-entries-${habitId}-${JSON.stringify(options)}`
    
    // Check cache first
    const cached = this.getFromCache<PaginationResult<HabitEntry>>(cacheKey)
    if (cached) {
      return cached
    }

    // Simulate database query with optimizations
    const result = await this.executeOptimizedQuery(
      () => this.fetchHabitEntriesFromDB(habitId, options, fullConfig),
      cacheKey,
      fullConfig.cacheTimeout
    )

    return result
  }

  /**
   * Batch loading multiple habits' data efficiently
   */
  static async loadMultipleHabitsData(
    habitIds: string[],
    options: QueryOptions = {},
    config: Partial<PerformanceConfig> = {}
  ): Promise<Map<string, HabitEntry[]>> {
    const fullConfig = { ...this.DEFAULT_CONFIG, ...config }
    const batchSize = fullConfig.batchSize
    const results = new Map<string, HabitEntry[]>()

    // Process in batches to avoid overwhelming the database
    for (let i = 0; i < habitIds.length; i += batchSize) {
      const batch = habitIds.slice(i, i + batchSize)
      const batchPromises = batch.map(habitId => 
        this.loadHabitEntriesPaginated(habitId, options, config)
          .then(result => ({ habitId, entries: result.data }))
      )

      const batchResults = await Promise.all(batchPromises)
      batchResults.forEach(({ habitId, entries }) => {
        results.set(habitId, entries)
      })

      // Small delay between batches to be gentle on resources
      if (i + batchSize < habitIds.length) {
        await this.sleep(10)
      }
    }

    return results
  }

  /**
   * Virtual scrolling data provider for large datasets
   */
  static createVirtualScrollProvider<T>(
    data: T[],
    itemHeight: number,
    containerHeight: number
  ): {
    visibleItems: T[]
    startIndex: number
    endIndex: number
    totalHeight: number
    offsetY: number
  } {
    const totalItems = data.length
    const visibleCount = Math.ceil(containerHeight / itemHeight)
    const bufferSize = Math.min(5, Math.floor(visibleCount / 4))
    
    return {
      visibleItems: [],
      startIndex: 0,
      endIndex: Math.min(visibleCount + bufferSize, totalItems - 1),
      totalHeight: totalItems * itemHeight,
      offsetY: 0
    }
  }

  /**
   * Optimized analytics calculation with memoization
   */
  static async calculateAnalyticsWithMemoization(
    habits: Habit[],
    entriesMap: Map<string, HabitEntry[]>,
    calculationType: 'streaks' | 'correlations' | 'patterns',
    config: Partial<PerformanceConfig> = {}
  ): Promise<any> {
    const fullConfig = { ...this.DEFAULT_CONFIG, ...config }
    const cacheKey = `analytics-${calculationType}-${this.hashMapData(entriesMap)}`
    
    // Check cache
    const cached = this.getFromCache(cacheKey)
    if (cached) {
      return cached
    }

    // Calculate with performance optimizations
    const result = await this.executeOptimizedCalculation(
      calculationType,
      habits,
      entriesMap,
      fullConfig
    )

    // Cache result
    this.setCache(cacheKey, result, fullConfig.cacheTimeout)
    return result
  }

  /**
   * Memory-efficient data compression for storage
   */
  static compressHabitData(
    entries: HabitEntry[],
    level: 'low' | 'medium' | 'high' = 'medium'
  ): {
    compressed: string
    originalSize: number
    compressedSize: number
    compressionRatio: number
  } {
    const originalData = JSON.stringify(entries)
    const originalSize = new Blob([originalData]).size

    let compressed: string
    
    switch (level) {
      case 'low':
        compressed = this.lightCompression(entries)
        break
      case 'medium':
        compressed = this.mediumCompression(entries)
        break
      case 'high':
        compressed = this.heavyCompression(entries)
        break
    }

    const compressedSize = new Blob([compressed]).size
    const compressionRatio = originalSize > 0 ? compressedSize / originalSize : 1

    return {
      compressed,
      originalSize,
      compressedSize,
      compressionRatio
    }
  }

  /**
   * Decompress habit data
   */
  static decompressHabitData(compressed: string, level: 'low' | 'medium' | 'high'): HabitEntry[] {
    switch (level) {
      case 'low':
        return this.lightDecompression(compressed)
      case 'medium':
        return this.mediumDecompression(compressed)
      case 'high':
        return this.heavyDecompression(compressed)
    }
  }

  /**
   * Database query optimization with connection pooling simulation
   */
  static async executeWithConnectionPool<T>(
    query: () => Promise<T>,
    poolSize: number = 3
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const executeQuery = async () => {
        try {
          const queryId = Math.random().toString(36).substr(2, 9)
          this.activeQueries.add(queryId)

          const result = await query()
          
          this.activeQueries.delete(queryId)
          this.processQueue()
          
          resolve(result)
        } catch (error) {
          reject(error)
        }
      }

      if (this.activeQueries.size < poolSize) {
        executeQuery()
      } else {
        this.queryQueue.push(executeQuery)
      }
    })
  }

  /**
   * Intelligent prefetching based on usage patterns
   */
  static async prefetchLikelyNeededData(
    userId: string,
    currentHabitId?: string,
    accessPatterns: Record<string, number> = {}
  ): Promise<void> {
    // Analyze access patterns to predict what data to prefetch
    const likelyHabits = this.predictLikelyAccess(accessPatterns, currentHabitId)
    
    // Prefetch in background without blocking
    Promise.all(
      likelyHabits.map(habitId => 
        this.loadHabitEntriesPaginated(habitId, { limit: 100 })
          .catch(() => {}) // Silently fail prefetch
      )
    )
  }

  /**
   * Memory usage monitoring and optimization
   */
  static monitorMemoryUsage(): {
    cacheSize: number
    activeQueries: number
    recommendedAction: 'none' | 'clear_cache' | 'reduce_batch_size'
  } {
    const cacheSize = this.cache.size
    const activeQueries = this.activeQueries.size

    let recommendedAction: 'none' | 'clear_cache' | 'reduce_batch_size' = 'none'
    
    if (cacheSize > 1000) {
      recommendedAction = 'clear_cache'
    } else if (activeQueries > 10) {
      recommendedAction = 'reduce_batch_size'
    }

    return {
      cacheSize,
      activeQueries,
      recommendedAction
    }
  }

  /**
   * Adaptive performance configuration based on system resources
   */
  static getAdaptiveConfig(
    dataSize: number,
    availableMemory: number,
    connectionSpeed: 'slow' | 'medium' | 'fast'
  ): PerformanceConfig {
    const baseConfig = { ...this.DEFAULT_CONFIG }

    // Adjust batch size based on data size and memory
    if (dataSize > 100000) {
      baseConfig.batchSize = availableMemory > 1000 ? 500 : 100
    }

    // Adjust cache timeout based on connection speed
    switch (connectionSpeed) {
      case 'slow':
        baseConfig.cacheTimeout = 15 * 60 * 1000 // 15 minutes
        baseConfig.maxConcurrentQueries = 1
        break
      case 'medium':
        baseConfig.cacheTimeout = 10 * 60 * 1000 // 10 minutes
        baseConfig.maxConcurrentQueries = 2
        break
      case 'fast':
        baseConfig.cacheTimeout = 5 * 60 * 1000 // 5 minutes
        baseConfig.maxConcurrentQueries = 5
        break
    }

    return baseConfig
  }

  // Private helper methods

  private static getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  private static setCache<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })

    // Cleanup old entries periodically
    if (this.cache.size > 100) {
      this.cleanupCache()
    }
  }

  private static cleanupCache(): void {
    const now = Date.now()
    const keysToDelete: string[] = []

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key)
      }
    })

    keysToDelete.forEach(key => this.cache.delete(key))
  }

  private static async executeOptimizedQuery<T>(
    query: () => Promise<T>,
    cacheKey: string,
    cacheTimeout: number
  ): Promise<T> {
    const result = await query()
    this.setCache(cacheKey, result, cacheTimeout)
    return result
  }

  private static async fetchHabitEntriesFromDB(
    habitId: string,
    options: QueryOptions,
    config: PerformanceConfig
  ): Promise<PaginationResult<HabitEntry>> {
    // Simulate optimized database query
    await this.sleep(Math.random() * 100) // Simulate network delay

    // Mock data generation for demonstration
    const mockData: HabitEntry[] = Array.from({ length: options.limit || 50 }, (_, i) => ({
      id: `entry-${habitId}-${i}`,
      habitId,
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      completed: Math.random() > 0.3,
      value: Math.random() > 0.5 ? Math.floor(Math.random() * 100) : undefined,
      notes: Math.random() > 0.8 ? 'Sample note' : undefined,
      createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      completedAt: Math.random() > 0.7 ? new Date() : undefined
    }))

    return {
      data: mockData,
      totalCount: 1000, // Mock total
      hasMore: (options.offset || 0) + mockData.length < 1000,
      nextCursor: `cursor-${habitId}-${(options.offset || 0) + mockData.length}`
    }
  }

  private static async executeOptimizedCalculation(
    type: string,
    habits: Habit[],
    entriesMap: Map<string, HabitEntry[]>,
    config: PerformanceConfig
  ): Promise<any> {
    // Simulate optimized calculation
    await this.sleep(50)

    switch (type) {
      case 'streaks':
        return this.calculateOptimizedStreaks(habits, entriesMap)
      case 'correlations':
        return this.calculateOptimizedCorrelations(habits, entriesMap)
      case 'patterns':
        return this.calculateOptimizedPatterns(habits, entriesMap)
      default:
        return {}
    }
  }

  private static calculateOptimizedStreaks(habits: Habit[], entriesMap: Map<string, HabitEntry[]>) {
    // Mock optimized streak calculation
    return habits.map(habit => ({
      habitId: habit.id,
      currentStreak: Math.floor(Math.random() * 30),
      bestStreak: Math.floor(Math.random() * 100),
      momentum: ['BUILDING', 'STABLE', 'DECLINING'][Math.floor(Math.random() * 3)]
    }))
  }

  private static calculateOptimizedCorrelations(habits: Habit[], entriesMap: Map<string, HabitEntry[]>) {
    return habits.map(habit => ({
      habitId: habit.id,
      habitName: habit.name,
      correlation: (Math.random() - 0.5) * 2,
      impact: ['HIGH', 'MEDIUM', 'LOW', 'NEGATIVE'][Math.floor(Math.random() * 4)],
      confidence: Math.random()
    }))
  }

  private static calculateOptimizedPatterns(habits: Habit[], entriesMap: Map<string, HabitEntry[]>) {
    return habits.map(habit => ({
      habitId: habit.id,
      patterns: ['TIME_CORRELATION', 'MOOD_CORRELATION'][Math.floor(Math.random() * 2)],
      strength: Math.random(),
      insights: [`Pattern insight for ${habit.name}`]
    }))
  }

  private static hashMapData(entriesMap: Map<string, HabitEntry[]>): string {
    let hash = 0
    entriesMap.forEach((entries, habitId) => {
      hash += habitId.length + entries.length
    })
    return hash.toString(36)
  }

  private static lightCompression(entries: HabitEntry[]): string {
    // Simple JSON minification
    return JSON.stringify(entries.map(e => ({
      i: e.id,
      h: e.habitId,
      d: e.date,
      c: e.completed ? 1 : 0,
      v: e.value,
      n: e.notes
    })))
  }

  private static mediumCompression(entries: HabitEntry[]): string {
    // Field consolidation + basic encoding
    const compressed = entries.map(e => 
      [e.id, e.habitId, e.date, e.completed ? 1 : 0, e.value, e.notes].join('|')
    ).join('\n')
    return compressed
  }

  private static heavyCompression(entries: HabitEntry[]): string {
    // Advanced compression simulation (in real app, use actual compression library)
    const data = this.mediumCompression(entries)
    // Simulate heavy compression
    return btoa(data) // Base64 encoding as simulation
  }

  private static lightDecompression(compressed: string): HabitEntry[] {
    const parsed = JSON.parse(compressed)
    return parsed.map((e: any) => ({
      id: e.i,
      habitId: e.h,
      date: e.d,
      completed: e.c === 1,
      value: e.v,
      notes: e.n,
      createdAt: new Date()
    }))
  }

  private static mediumDecompression(compressed: string): HabitEntry[] {
    return compressed.split('\n').map(line => {
      const [id, habitId, date, completed, value, notes] = line.split('|')
      return {
        id,
        habitId,
        date,
        completed: completed === '1',
        value: value ? parseInt(value) : undefined,
        notes: notes || undefined,
        createdAt: new Date()
      }
    })
  }

  private static heavyDecompression(compressed: string): HabitEntry[] {
    const decoded = atob(compressed)
    return this.mediumDecompression(decoded)
  }

  private static predictLikelyAccess(
    accessPatterns: Record<string, number>,
    currentHabitId?: string
  ): string[] {
    // Sort by access frequency and recency
    const sorted = Object.entries(accessPatterns)
      .sort(([, a], [, b]) => b - a)
      .map(([habitId]) => habitId)
      .slice(0, 3)

    // Add current habit if not in top 3
    if (currentHabitId && !sorted.includes(currentHabitId)) {
      sorted.push(currentHabitId)
    }

    return sorted
  }

  private static async processQueue(): void {
    if (this.queryQueue.length > 0) {
      const nextQuery = this.queryQueue.shift()
      if (nextQuery) {
        await nextQuery()
      }
    }
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Clear all caches and reset performance state
   */
  static clearCache(): void {
    this.cache.clear()
    this.activeQueries.clear()
    this.queryQueue.length = 0
  }

  /**
   * Get performance statistics
   */
  static getPerformanceStats(): {
    cacheHitRate: number
    avgQueryTime: number
    memoryUsage: number
    activeConnections: number
  } {
    return {
      cacheHitRate: 0.75, // Mock data
      avgQueryTime: 150, // milliseconds
      memoryUsage: this.cache.size * 1024, // bytes estimate
      activeConnections: this.activeQueries.size
    }
  }
}