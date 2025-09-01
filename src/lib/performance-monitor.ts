// Performance monitoring utilities for database queries

interface QueryMetric {
  query: string
  duration: number
  timestamp: Date
  params?: string
}

interface PerformanceStats {
  slowQueries: QueryMetric[]
  averageQueryTime: number
  totalQueries: number
  slowQueryCount: number
  criticalQueryCount: number
}

class PerformanceMonitor {
  private metrics: QueryMetric[] = []
  private readonly maxMetrics = 1000 // Keep last 1000 queries
  private readonly slowThreshold = 1000 // 1 second
  private readonly criticalThreshold = 5000 // 5 seconds

  addMetric(metric: QueryMetric) {
    this.metrics.push(metric)
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics)
    }
  }

  getStats(): PerformanceStats {
    const slowQueries = this.metrics.filter(m => m.duration >= this.slowThreshold)
    const criticalQueries = this.metrics.filter(m => m.duration >= this.criticalThreshold)
    
    const totalDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0)
    const averageQueryTime = this.metrics.length > 0 ? totalDuration / this.metrics.length : 0

    return {
      slowQueries: slowQueries.slice(-50), // Return last 50 slow queries
      averageQueryTime: Math.round(averageQueryTime),
      totalQueries: this.metrics.length,
      slowQueryCount: slowQueries.length,
      criticalQueryCount: criticalQueries.length
    }
  }

  getRecentSlowQueries(limit = 10): QueryMetric[] {
    return this.metrics
      .filter(m => m.duration >= this.slowThreshold)
      .slice(-limit)
      .sort((a, b) => b.duration - a.duration)
  }

  clearMetrics() {
    this.metrics = []
  }

  // Get performance report for monitoring
  getPerformanceReport(): string {
    const stats = this.getStats()
    
    return `
📊 Database Performance Report
=============================
Total Queries: ${stats.totalQueries}
Average Query Time: ${stats.averageQueryTime}ms
Slow Queries (>1s): ${stats.slowQueryCount}
Critical Queries (>5s): ${stats.criticalQueryCount}

Recent Slow Queries:
${this.getRecentSlowQueries(5)
  .map(q => `- ${q.duration}ms: ${q.query.substring(0, 80)}...`)
  .join('\n')}
    `.trim()
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor()

// Middleware to track API performance
export function withPerformanceTracking<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now()
  
  return fn()
    .then(result => {
      const duration = Date.now() - startTime
      
      if (duration > 2000) { // Log slow API operations
        console.warn(`🐌 Slow API operation: ${operation} took ${duration}ms`)
      }
      
      return result
    })
    .catch(error => {
      const duration = Date.now() - startTime
      console.error(`❌ API operation failed: ${operation} (${duration}ms)`, error)
      throw error
    })
}

// Health check for performance monitoring
export function getPerformanceHealth() {
  const stats = performanceMonitor.getStats()
  const criticalIssues = []
  const warnings = []

  // Check for critical performance issues
  if (stats.criticalQueryCount > 0) {
    criticalIssues.push(`${stats.criticalQueryCount} critical slow queries (>5s)`)
  }

  if (stats.averageQueryTime > 500) {
    warnings.push(`High average query time: ${stats.averageQueryTime}ms`)
  }

  if (stats.slowQueryCount > stats.totalQueries * 0.1) {
    warnings.push(`${Math.round(stats.slowQueryCount / stats.totalQueries * 100)}% queries are slow`)
  }

  return {
    healthy: criticalIssues.length === 0,
    criticalIssues,
    warnings,
    stats
  }
}