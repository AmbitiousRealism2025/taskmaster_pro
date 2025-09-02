/**
 * Performance Monitoring Dashboard
 * 
 * Centralized performance monitoring and alerting system
 */

import { WebVitalsMetric } from './web-vitals'
import { BundleAnalysisReport } from './bundle-analyzer'

export interface PerformanceAlert {
  id: string
  type: 'web-vital' | 'bundle-size' | 'api-response' | 'resource-load'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  value: number
  threshold: number
  url?: string
  timestamp: string
  resolved: boolean
}

export interface PerformanceDashboardData {
  webVitals: {
    lcp: { value: number; rating: string; trend: 'up' | 'down' | 'stable' }
    fid: { value: number; rating: string; trend: 'up' | 'down' | 'stable' }
    cls: { value: number; rating: string; trend: 'up' | 'down' | 'stable' }
    fcp: { value: number; rating: string; trend: 'up' | 'down' | 'stable' }
    ttfb: { value: number; rating: string; trend: 'up' | 'down' | 'stable' }
  }
  bundleSize: {
    total: number
    trend: 'up' | 'down' | 'stable'
    budget: number
    budgetUsed: number
  }
  alerts: PerformanceAlert[]
  recommendations: string[]
  lastUpdated: string
}

export interface PerformanceThresholds {
  webVitals: {
    lcp: { good: number; poor: number }
    fid: { good: number; poor: number } 
    cls: { good: number; poor: number }
    fcp: { good: number; poor: number }
    ttfb: { good: number; poor: number }
  }
  bundleSize: {
    warning: number
    critical: number
  }
  apiResponse: {
    warning: number
    critical: number
  }
}

export const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  webVitals: {
    lcp: { good: 2500, poor: 4000 },
    fid: { good: 100, poor: 300 },
    cls: { good: 0.1, poor: 0.25 },
    fcp: { good: 1800, poor: 3000 },
    ttfb: { good: 800, poor: 1800 }
  },
  bundleSize: {
    warning: 300, // KB
    critical: 500  // KB
  },
  apiResponse: {
    warning: 1000, // ms
    critical: 3000  // ms
  }
}

/**
 * Performance monitoring class
 */
export class PerformanceMonitor {
  private alerts: PerformanceAlert[] = []
  private thresholds: PerformanceThresholds
  private subscribers: ((alert: PerformanceAlert) => void)[] = []
  
  constructor(thresholds: PerformanceThresholds = DEFAULT_THRESHOLDS) {
    this.thresholds = thresholds
  }
  
  /**
   * Subscribe to performance alerts
   */
  subscribe(callback: (alert: PerformanceAlert) => void) {
    this.subscribers.push(callback)
  }
  
  /**
   * Create and emit alert
   */
  private createAlert(
    type: PerformanceAlert['type'],
    severity: PerformanceAlert['severity'],
    message: string,
    value: number,
    threshold: number,
    url?: string
  ): PerformanceAlert {
    const alert: PerformanceAlert = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      message,
      value,
      threshold,
      url,
      timestamp: new Date().toISOString(),
      resolved: false
    }
    
    this.alerts.push(alert)
    this.subscribers.forEach(callback => callback(alert))
    
    return alert
  }
  
  /**
   * Check Web Vitals metric and create alerts if needed
   */
  checkWebVital(metric: WebVitalsMetric) {
    const thresholds = this.thresholds.webVitals[metric.name.toLowerCase() as keyof typeof this.thresholds.webVitals]
    if (!thresholds) return
    
    let severity: PerformanceAlert['severity'] = 'low'
    let shouldAlert = false
    
    if (metric.value > thresholds.poor) {
      severity = 'high'
      shouldAlert = true
    } else if (metric.value > thresholds.good && metric.rating !== 'good') {
      severity = 'medium' 
      shouldAlert = true
    }
    
    if (shouldAlert) {
      this.createAlert(
        'web-vital',
        severity,
        `${metric.name} is ${metric.rating} (${Math.round(metric.value)}${getMetricUnit(metric.name)})`,
        metric.value,
        metric.name === 'CLS' ? thresholds.poor : thresholds.poor,
        metric.navigationType || undefined
      )
    }
  }
  
  /**
   * Check bundle size and create alerts if needed
   */
  checkBundleSize(report: BundleAnalysisReport) {
    const totalSizeKB = report.totalSize
    
    if (totalSizeKB > this.thresholds.bundleSize.critical) {
      this.createAlert(
        'bundle-size',
        'critical',
        `Bundle size is critically large (${Math.round(totalSizeKB)}KB)`,
        totalSizeKB,
        this.thresholds.bundleSize.critical
      )
    } else if (totalSizeKB > this.thresholds.bundleSize.warning) {
      this.createAlert(
        'bundle-size',
        'medium',
        `Bundle size exceeds warning threshold (${Math.round(totalSizeKB)}KB)`,
        totalSizeKB,
        this.thresholds.bundleSize.warning
      )
    }
  }
  
  /**
   * Check API response time
   */
  checkApiResponse(endpoint: string, responseTime: number) {
    if (responseTime > this.thresholds.apiResponse.critical) {
      this.createAlert(
        'api-response',
        'high',
        `API response time is critical for ${endpoint} (${Math.round(responseTime)}ms)`,
        responseTime,
        this.thresholds.apiResponse.critical,
        endpoint
      )
    } else if (responseTime > this.thresholds.apiResponse.warning) {
      this.createAlert(
        'api-response',
        'medium',
        `API response time is slow for ${endpoint} (${Math.round(responseTime)}ms)`,
        responseTime,
        this.thresholds.apiResponse.warning,
        endpoint
      )
    }
  }
  
  /**
   * Get all alerts
   */
  getAlerts(includeResolved = false): PerformanceAlert[] {
    return includeResolved 
      ? this.alerts 
      : this.alerts.filter(alert => !alert.resolved)
  }
  
  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.resolved = true
      return true
    }
    return false
  }
  
  /**
   * Clear resolved alerts
   */
  clearResolvedAlerts() {
    this.alerts = this.alerts.filter(alert => !alert.resolved)
  }
  
  /**
   * Get performance summary
   */
  getSummary(): {
    totalAlerts: number
    criticalAlerts: number
    highAlerts: number
    mediumAlerts: number
    lowAlerts: number
  } {
    const activeAlerts = this.getAlerts(false)
    
    return {
      totalAlerts: activeAlerts.length,
      criticalAlerts: activeAlerts.filter(a => a.severity === 'critical').length,
      highAlerts: activeAlerts.filter(a => a.severity === 'high').length,
      mediumAlerts: activeAlerts.filter(a => a.severity === 'medium').length,
      lowAlerts: activeAlerts.filter(a => a.severity === 'low').length
    }
  }
}

/**
 * Get metric unit for display
 */
function getMetricUnit(metricName: string): string {
  switch (metricName.toUpperCase()) {
    case 'CLS':
      return ''
    case 'FCP':
    case 'FID': 
    case 'LCP':
    case 'TTFB':
      return 'ms'
    default:
      return 'ms'
  }
}

/**
 * Global performance monitor instance
 */
export const performanceMonitor = new PerformanceMonitor()

/**
 * Initialize performance monitoring
 */
export function initPerformanceMonitoring() {
  // Set up alert notifications
  performanceMonitor.subscribe((alert) => {
    if (typeof window !== 'undefined' && 'console' in window) {
      const emoji = getSeverityEmoji(alert.severity)
      console.warn(`${emoji} Performance Alert: ${alert.message}`)
    }
    
    // In production, you might want to send alerts to an external service
    if (process.env.NODE_ENV === 'production') {
      // Send to monitoring service (e.g., Sentry, DataDog, etc.)
    }
  })
  
  // Clean up resolved alerts periodically
  if (typeof window !== 'undefined') {
    setInterval(() => {
      performanceMonitor.clearResolvedAlerts()
    }, 5 * 60 * 1000) // Every 5 minutes
  }
}

/**
 * Get emoji for alert severity
 */
function getSeverityEmoji(severity: PerformanceAlert['severity']): string {
  switch (severity) {
    case 'critical': return '🚨'
    case 'high': return '⚠️'
    case 'medium': return '🟡'
    case 'low': return '🔵'
    default: return '📊'
  }
}