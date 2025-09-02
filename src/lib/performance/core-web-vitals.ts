/**
 * Core Web Vitals Performance Monitoring
 * 
 * Comprehensive performance tracking system for production monitoring
 * Tracks LCP, FID, CLS, FCP, TTFB and custom application metrics
 */

import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals'

// Performance metric interfaces
export interface CoreWebVitalMetric {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta: number
  id: string
  navigationType: string
}

export interface CustomMetric {
  name: string
  value: number
  timestamp: number
  userId?: string
  sessionId: string
}

export interface PerformanceBudget {
  maxLCP: number      // Largest Contentful Paint (ms)
  maxFID: number      // First Input Delay (ms)  
  maxCLS: number      // Cumulative Layout Shift
  maxFCP: number      // First Contentful Paint (ms)
  maxTTFB: number     // Time to First Byte (ms)
  maxMemoryUsage: number    // Memory usage (bytes)
  maxBundleSize: number     // Bundle size (bytes)
  maxAPIResponse: number    // API response time (ms)
}

export interface PerformanceReport {
  sessionId: string
  userId?: string
  timestamp: string
  url: string
  userAgent: string
  connection: string
  coreWebVitals: Record<string, CoreWebVitalMetric>
  customMetrics: CustomMetric[]
  budgetViolations: string[]
  overallRating: 'good' | 'needs-improvement' | 'poor'
}

// Performance budgets configuration
export const PERFORMANCE_BUDGETS: PerformanceBudget = {
  maxLCP: 2500,          // 2.5s for good LCP
  maxFID: 100,           // 100ms for good FID
  maxCLS: 0.1,           // 0.1 for good CLS
  maxFCP: 1800,          // 1.8s for good FCP
  maxTTFB: 600,          // 600ms for good TTFB
  maxMemoryUsage: 104857600,  // 100MB memory limit
  maxBundleSize: 512000,      // 512KB main bundle
  maxAPIResponse: 1000        // 1s API response time
}

// Performance rating thresholds
const RATING_THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },
  FID: { good: 100, poor: 300 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 600, poor: 1500 }
}

/**
 * Performance Monitor Class
 */
export class PerformanceMonitor {
  private sessionId: string
  private userId?: string
  private metrics: Map<string, CoreWebVitalMetric> = new Map()
  private customMetrics: CustomMetric[] = []
  private observers: PerformanceObserver[] = []
  private reportingInterval: NodeJS.Timeout | null = null

  constructor(userId?: string) {
    this.sessionId = this.generateSessionId()
    this.userId = userId
    
    if (typeof window !== 'undefined') {
      this.initializeWebVitals()
      this.initializeCustomMetrics()
      this.startReporting()
    }
  }

  /**
   * Initialize Core Web Vitals monitoring
   */
  private initializeWebVitals(): void {
    // Largest Contentful Paint
    getLCP((metric) => {
      this.recordMetric('LCP', metric)
    })

    // First Input Delay
    getFID((metric) => {
      this.recordMetric('FID', metric)
    })

    // Cumulative Layout Shift
    getCLS((metric) => {
      this.recordMetric('CLS', metric)
    })

    // First Contentful Paint
    getFCP((metric) => {
      this.recordMetric('FCP', metric)
    })

    // Time to First Byte
    getTTFB((metric) => {
      this.recordMetric('TTFB', metric)
    })
  }

  /**
   * Initialize custom performance metrics
   */
  private initializeCustomMetrics(): void {
    // Navigation timing
    this.observeNavigationTiming()
    
    // Resource timing
    this.observeResourceTiming()
    
    // Memory usage
    this.observeMemoryUsage()
    
    // Long tasks (blocking tasks > 50ms)
    this.observeLongTasks()
  }

  /**
   * Record Core Web Vital metric
   */
  private recordMetric(name: string, metric: any): void {
    const rating = this.getRating(name, metric.value)
    
    const webVitalMetric: CoreWebVitalMetric = {
      name,
      value: metric.value,
      rating,
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType || 'navigate'
    }

    this.metrics.set(name, webVitalMetric)
    
    // Check against performance budget
    this.checkBudgetViolation(name, metric.value)
    
    // Report critical metrics immediately
    if (rating === 'poor') {
      this.reportMetricViolation(webVitalMetric)
    }
  }

  /**
   * Add custom metric
   */
  addCustomMetric(name: string, value: number): void {
    const metric: CustomMetric = {
      name,
      value,
      timestamp: Date.now(),
      userId: this.userId,
      sessionId: this.sessionId
    }
    
    this.customMetrics.push(metric)
  }

  /**
   * Measure API response time
   */
  measureAPICall = <T>(
    name: string,
    apiCall: () => Promise<T>
  ): Promise<T> => {
    const startTime = performance.now()
    
    return apiCall().finally(() => {
      const duration = performance.now() - startTime
      this.addCustomMetric(`api_${name}`, duration)
      
      // Check API response budget
      if (duration > PERFORMANCE_BUDGETS.maxAPIResponse) {
        console.warn(`API ${name} exceeded budget: ${duration}ms > ${PERFORMANCE_BUDGETS.maxAPIResponse}ms`)
      }
    })
  }

  /**
   * Measure React component render time
   */
  measureRender = (componentName: string, renderFn: () => void): void => {
    const startTime = performance.now()
    renderFn()
    const renderTime = performance.now() - startTime
    
    this.addCustomMetric(`render_${componentName}`, renderTime)
  }

  /**
   * Generate performance report
   */
  generateReport(): PerformanceReport {
    const budgetViolations = this.getBudgetViolations()
    const overallRating = this.calculateOverallRating()

    return {
      sessionId: this.sessionId,
      userId: this.userId,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      connection: this.getConnectionInfo(),
      coreWebVitals: Object.fromEntries(this.metrics),
      customMetrics: this.customMetrics,
      budgetViolations,
      overallRating
    }
  }

  /**
   * Send report to analytics endpoint
   */
  async sendReport(): Promise<void> {
    try {
      const report = this.generateReport()
      
      await fetch('/api/analytics/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(report)
      })
    } catch (error) {
      console.error('Failed to send performance report:', error)
    }
  }

  /**
   * Observe navigation timing
   */
  private observeNavigationTiming(): void {
    if ('navigation' in performance && 'timing' in performance) {
      const timing = performance.timing
      const navigation = (performance as any).navigation
      
      // DNS lookup time
      this.addCustomMetric('dns_lookup', timing.domainLookupEnd - timing.domainLookupStart)
      
      // Connection time
      this.addCustomMetric('connection', timing.connectEnd - timing.connectStart)
      
      // Server response time
      this.addCustomMetric('server_response', timing.responseEnd - timing.requestStart)
      
      // DOM processing time
      this.addCustomMetric('dom_processing', timing.domComplete - timing.domLoading)
    }
  }

  /**
   * Observe resource timing
   */
  private observeResourceTiming(): void {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource') {
          const resource = entry as PerformanceResourceTiming
          
          // Track large resources
          if (resource.transferSize > 100000) { // > 100KB
            this.addCustomMetric(`large_resource_${resource.name.split('/').pop()}`, resource.duration)
          }
          
          // Track slow resources
          if (resource.duration > 1000) { // > 1s
            this.addCustomMetric(`slow_resource_${resource.name.split('/').pop()}`, resource.duration)
          }
        }
      }
    })
    
    observer.observe({ entryTypes: ['resource'] })
    this.observers.push(observer)
  }

  /**
   * Observe memory usage
   */
  private observeMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      
      setInterval(() => {
        this.addCustomMetric('memory_used', memory.usedJSHeapSize)
        this.addCustomMetric('memory_total', memory.totalJSHeapSize)
        this.addCustomMetric('memory_limit', memory.jsHeapSizeLimit)
        
        // Check memory budget
        if (memory.usedJSHeapSize > PERFORMANCE_BUDGETS.maxMemoryUsage) {
          console.warn(`Memory usage exceeded budget: ${memory.usedJSHeapSize} > ${PERFORMANCE_BUDGETS.maxMemoryUsage}`)
        }
      }, 30000) // Every 30 seconds
    }
  }

  /**
   * Observe long tasks
   */
  private observeLongTasks(): void {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'longtask') {
          this.addCustomMetric('long_task', entry.duration)
          
          // Log blocking tasks
          if (entry.duration > 100) {
            console.warn(`Long task detected: ${entry.duration}ms`)
          }
        }
      }
    })
    
    try {
      observer.observe({ entryTypes: ['longtask'] })
      this.observers.push(observer)
    } catch (error) {
      // Long task API not supported
      console.log('Long task observation not supported')
    }
  }

  /**
   * Get performance rating
   */
  private getRating(metric: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const thresholds = RATING_THRESHOLDS[metric as keyof typeof RATING_THRESHOLDS]
    if (!thresholds) return 'good'
    
    if (value <= thresholds.good) return 'good'
    if (value <= thresholds.poor) return 'needs-improvement'
    return 'poor'
  }

  /**
   * Check budget violation
   */
  private checkBudgetViolation(metric: string, value: number): void {
    const budgetKey = `max${metric}` as keyof PerformanceBudget
    const budgetValue = PERFORMANCE_BUDGETS[budgetKey]
    
    if (typeof budgetValue === 'number' && value > budgetValue) {
      console.warn(`Performance budget violated: ${metric} = ${value} > ${budgetValue}`)
    }
  }

  /**
   * Get budget violations
   */
  private getBudgetViolations(): string[] {
    const violations: string[] = []
    
    this.metrics.forEach((metric, name) => {
      const budgetKey = `max${name}` as keyof PerformanceBudget
      const budgetValue = PERFORMANCE_BUDGETS[budgetKey]
      
      if (typeof budgetValue === 'number' && metric.value > budgetValue) {
        violations.push(`${name}: ${metric.value} > ${budgetValue}`)
      }
    })
    
    return violations
  }

  /**
   * Calculate overall rating
   */
  private calculateOverallRating(): 'good' | 'needs-improvement' | 'poor' {
    const ratings = Array.from(this.metrics.values()).map(m => m.rating)
    
    if (ratings.includes('poor')) return 'poor'
    if (ratings.includes('needs-improvement')) return 'needs-improvement'
    return 'good'
  }

  /**
   * Get connection information
   */
  private getConnectionInfo(): string {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      return `${connection.effectiveType || 'unknown'} - ${connection.downlink || 'unknown'}Mbps`
    }
    return 'unknown'
  }

  /**
   * Report metric violation immediately
   */
  private async reportMetricViolation(metric: CoreWebVitalMetric): Promise<void> {
    try {
      await fetch('/api/analytics/performance-alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          userId: this.userId,
          metric,
          timestamp: new Date().toISOString(),
          url: window.location.href
        })
      })
    } catch (error) {
      console.error('Failed to report metric violation:', error)
    }
  }

  /**
   * Start periodic reporting
   */
  private startReporting(): void {
    // Report every 5 minutes
    this.reportingInterval = setInterval(() => {
      this.sendReport()
    }, 300000)
    
    // Report on page unload
    window.addEventListener('beforeunload', () => {
      this.sendReport()
    })
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Cleanup observers
   */
  destroy(): void {
    this.observers.forEach(observer => observer.disconnect())
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval)
    }
  }
}

/**
 * Global performance monitor instance
 */
let globalPerformanceMonitor: PerformanceMonitor | null = null

/**
 * Initialize performance monitoring
 */
export function initializePerformanceMonitoring(userId?: string): PerformanceMonitor {
  if (typeof window === 'undefined') {
    throw new Error('Performance monitoring can only be initialized in browser environment')
  }
  
  if (globalPerformanceMonitor) {
    globalPerformanceMonitor.destroy()
  }
  
  globalPerformanceMonitor = new PerformanceMonitor(userId)
  return globalPerformanceMonitor
}

/**
 * Get current performance monitor instance
 */
export function getPerformanceMonitor(): PerformanceMonitor | null {
  return globalPerformanceMonitor
}

/**
 * React hook for performance monitoring
 */
export function usePerformanceMonitoring(userId?: string) {
  const monitor = globalPerformanceMonitor || initializePerformanceMonitoring(userId)
  
  return {
    monitor,
    measureAPICall: monitor.measureAPICall,
    measureRender: monitor.measureRender,
    addCustomMetric: monitor.addCustomMetric.bind(monitor),
    generateReport: monitor.generateReport.bind(monitor)
  }
}