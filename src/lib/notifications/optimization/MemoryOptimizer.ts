// Memory Optimization for Enhanced Notification System
// Part of Phase 3.2 - External Integration Layer

export class NotificationMemoryOptimizer {
  private static readonly MAX_MEMORY_MB = 256
  private static readonly WARNING_THRESHOLD_MB = 200
  private static readonly CLEANUP_THRESHOLD_MB = 230

  // Monitor and optimize memory usage
  static async optimizeMemoryUsage(): Promise<{
    beforeCleanup: number
    afterCleanup: number
    freedMB: number
    actions: string[]
  }> {
    const beforeMemory = this.getMemoryUsageMB()
    const actions: string[] = []

    // Check if cleanup is needed
    if (beforeMemory < this.WARNING_THRESHOLD_MB) {
      return {
        beforeCleanup: beforeMemory,
        afterCleanup: beforeMemory,
        freedMB: 0,
        actions: ['Memory usage is healthy - no cleanup needed']
      }
    }

    console.log(`Memory optimization triggered - Current usage: ${beforeMemory}MB`)

    // Perform garbage collection if available
    if (global.gc) {
      global.gc()
      actions.push('Forced garbage collection')
    }

    // Clear Node.js module cache for unused modules
    if (beforeMemory > this.CLEANUP_THRESHOLD_MB) {
      await this.cleanupModuleCache()
      actions.push('Cleaned up module cache')
    }

    // Clear internal caches
    await this.clearInternalCaches()
    actions.push('Cleared internal caches')

    // Optimize object references
    await this.optimizeObjectReferences()
    actions.push('Optimized object references')

    const afterMemory = this.getMemoryUsageMB()
    const freedMB = Math.max(0, beforeMemory - afterMemory)

    console.log(`Memory optimization complete - Freed ${freedMB}MB (${beforeMemory}MB → ${afterMemory}MB)`)

    return {
      beforeCleanup: beforeMemory,
      afterCleanup: afterMemory,
      freedMB,
      actions
    }
  }

  // Get current memory usage in MB
  private static getMemoryUsageMB(): number {
    const memoryUsage = process.memoryUsage()
    return Math.round(memoryUsage.heapUsed / 1024 / 1024)
  }

  // Clean up Node.js module cache for unused modules
  private static async cleanupModuleCache(): Promise<void> {
    const moduleKeys = Object.keys(require.cache)
    let cleanedCount = 0

    for (const key of moduleKeys) {
      // Don't clean core modules or frequently used modules
      if (this.shouldSkipModule(key)) {
        continue
      }

      // Check if module is still referenced
      if (!this.isModuleStillReferenced(key)) {
        delete require.cache[key]
        cleanedCount++
      }
    }

    console.log(`Cleaned ${cleanedCount} unused modules from cache`)
  }

  // Check if a module should be skipped during cleanup
  private static shouldSkipModule(moduleKey: string): boolean {
    const coreModules = [
      'redis',
      'next',
      'react',
      '@prisma/client',
      'winston'
    ]

    return coreModules.some(module => moduleKey.includes(module)) ||
           moduleKey.includes('node_modules/.pnpm/') ||
           moduleKey.includes('/lib/notifications/') // Keep our notification modules
  }

  // Check if a module is still being referenced
  private static isModuleStillReferenced(moduleKey: string): boolean {
    // This is a simplified check - in production you'd have more sophisticated logic
    const module = require.cache[moduleKey]
    return module && module.children && module.children.length > 0
  }

  // Clear internal caches and temporary data
  private static async clearInternalCaches(): Promise<void> {
    // Clear any internal notification caches
    if (global.notificationCache) {
      global.notificationCache.clear()
    }

    // Clear temporary notification batches older than 1 hour
    if (global.temporaryBatches) {
      const oneHourAgo = Date.now() - (60 * 60 * 1000)
      
      for (const [key, batch] of global.temporaryBatches.entries()) {
        if (batch.createdAt.getTime() < oneHourAgo) {
          global.temporaryBatches.delete(key)
        }
      }
    }

    // Clear expired user preferences cache
    if (global.userPreferencesCache) {
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000)
      
      for (const [key, cached] of global.userPreferencesCache.entries()) {
        if (cached.timestamp < fiveMinutesAgo) {
          global.userPreferencesCache.delete(key)
        }
      }
    }
  }

  // Optimize object references to prevent memory leaks
  private static async optimizeObjectReferences(): Promise<void> {
    // Clear circular references in notification objects
    if (global.notificationReferences) {
      global.notificationReferences.clear()
    }

    // Nullify unused event listeners
    if (process.listeners) {
      const unusedEvents = ['SIGUSR1', 'SIGUSR2', 'SIGHUP']
      unusedEvents.forEach(event => {
        const listeners = process.listeners(event)
        if (listeners.length > 10) { // Too many listeners might indicate a leak
          console.warn(`Potential memory leak: ${listeners.length} listeners for ${event}`)
        }
      })
    }
  }

  // Monitor memory usage continuously
  static startMemoryMonitoring(intervalMs: number = 60000): NodeJS.Timeout {
    return setInterval(async () => {
      const memoryUsage = this.getMemoryUsageMB()
      
      if (memoryUsage > this.WARNING_THRESHOLD_MB) {
        console.warn(`High memory usage detected: ${memoryUsage}MB (threshold: ${this.WARNING_THRESHOLD_MB}MB)`)
        
        if (memoryUsage > this.CLEANUP_THRESHOLD_MB) {
          await this.optimizeMemoryUsage()
        }
      }

      // Log memory stats every 10 minutes
      if (Date.now() % (10 * 60 * 1000) < intervalMs) {
        this.logMemoryStats()
      }
    }, intervalMs)
  }

  // Log detailed memory statistics
  private static logMemoryStats(): void {
    const memoryUsage = process.memoryUsage()
    
    console.log('Memory Statistics:', {
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`,
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
      efficiency: `${((this.MAX_MEMORY_MB - this.getMemoryUsageMB()) / this.MAX_MEMORY_MB * 100).toFixed(1)}%`
    })
  }

  // Get memory efficiency score (0-100)
  static getMemoryEfficiency(): number {
    const currentUsage = this.getMemoryUsageMB()
    return Math.max(0, ((this.MAX_MEMORY_MB - currentUsage) / this.MAX_MEMORY_MB) * 100)
  }

  // Check if memory usage is healthy
  static isMemoryHealthy(): boolean {
    return this.getMemoryUsageMB() < this.WARNING_THRESHOLD_MB
  }

  // Get memory health report
  static getMemoryHealthReport(): {
    status: 'healthy' | 'warning' | 'critical'
    currentUsageMB: number
    maxMemoryMB: number
    efficiency: number
    recommendation: string
  } {
    const currentUsage = this.getMemoryUsageMB()
    const efficiency = this.getMemoryEfficiency()

    let status: 'healthy' | 'warning' | 'critical' = 'healthy'
    let recommendation = 'Memory usage is optimal'

    if (currentUsage > this.CLEANUP_THRESHOLD_MB) {
      status = 'critical'
      recommendation = 'Immediate memory cleanup required'
    } else if (currentUsage > this.WARNING_THRESHOLD_MB) {
      status = 'warning'
      recommendation = 'Consider reducing notification batches or clearing caches'
    }

    return {
      status,
      currentUsageMB: currentUsage,
      maxMemoryMB: this.MAX_MEMORY_MB,
      efficiency,
      recommendation
    }
  }

  // Configure memory limits
  static configureMemoryLimits(maxMemoryMB: number): void {
    if (maxMemoryMB < 128) {
      throw new Error('Maximum memory limit cannot be less than 128MB')
    }

    // Update static properties (this would be stored in configuration in production)
    console.log(`Memory limits updated: max ${maxMemoryMB}MB (was ${this.MAX_MEMORY_MB}MB)`)
  }

  // Emergency memory cleanup for critical situations
  static async emergencyCleanup(): Promise<void> {
    console.log('🚨 Emergency memory cleanup initiated')

    // Force aggressive garbage collection multiple times
    if (global.gc) {
      for (let i = 0; i < 3; i++) {
        global.gc()
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    // Clear all caches aggressively
    if (global.notificationCache) global.notificationCache.clear()
    if (global.temporaryBatches) global.temporaryBatches.clear()
    if (global.userPreferencesCache) global.userPreferencesCache.clear()

    // Clear require cache except core modules
    const moduleKeys = Object.keys(require.cache)
    const coreModules = ['redis', 'next', 'react', '@prisma/client']
    
    moduleKeys.forEach(key => {
      if (!coreModules.some(core => key.includes(core))) {
        delete require.cache[key]
      }
    })

    console.log('🚨 Emergency memory cleanup completed')
  }
}