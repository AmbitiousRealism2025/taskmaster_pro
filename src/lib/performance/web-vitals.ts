/**
 * Web Vitals Performance Monitoring
 * 
 * Tracks Core Web Vitals and sends metrics to analytics
 */

import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals'

export interface WebVitalsMetric {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta: number
  id: string
  navigationType: string
}

// Thresholds based on Google's Core Web Vitals
const THRESHOLDS = {
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  FID: { good: 100, poor: 300 },
  LCP: { good: 2500, poor: 4000 },
  TTFB: { good: 800, poor: 1800 },
}

/**
 * Get rating based on metric value and thresholds
 */
function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[name as keyof typeof THRESHOLDS]
  if (!threshold) return 'needs-improvement'
  
  if (value <= threshold.good) return 'good'
  if (value > threshold.poor) return 'poor'
  return 'needs-improvement'
}

/**
 * Send metric to analytics endpoint
 */
async function sendToAnalytics(metric: WebVitalsMetric) {
  // Only send in production
  if (process.env.NODE_ENV !== 'production') {
    if (process.env.NODE_ENV === 'development') {
      console.log('Web Vital:', metric)
    }
    return
  }
  
  try {
    const body = JSON.stringify({
      metric: metric.name,
      value: Math.round(metric.value),
      rating: metric.rating,
      delta: Math.round(metric.delta),
      id: metric.id,
      navigationType: metric.navigationType,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    })
    
    // Use sendBeacon for reliability
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/vitals', body)
    } else {
      // Fallback to fetch
      fetch('/api/analytics/vitals', {
        method: 'POST',
        body,
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
      })
    }
  } catch (error) {
    // Silently fail - don't impact user experience
  }
}

/**
 * Initialize Web Vitals tracking
 */
export function initWebVitals() {
  const handleMetric = (metric: any) => {
    const webVitalMetric: WebVitalsMetric = {
      name: metric.name,
      value: metric.value,
      rating: getRating(metric.name, metric.value),
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType || 'navigate',
    }
    
    sendToAnalytics(webVitalMetric)
  }
  
  // Track all Core Web Vitals
  onCLS(handleMetric)
  onFCP(handleMetric)
  onINP(handleMetric) // Replaces FID as of web-vitals v4
  onLCP(handleMetric)
  onTTFB(handleMetric)
}

/**
 * Custom performance marks for important user interactions
 */
export class PerformanceTracker {
  private marks: Map<string, number> = new Map()
  private measures: Map<string, number> = new Map()
  
  /**
   * Mark the start of a performance measurement
   */
  mark(name: string) {
    this.marks.set(name, performance.now())
    if ('performance' in window && 'mark' in performance) {
      performance.mark(name)
    }
  }
  
  /**
   * Measure the time between two marks
   */
  measure(name: string, startMark: string, endMark?: string) {
    const start = this.marks.get(startMark)
    const end = endMark ? this.marks.get(endMark) : performance.now()
    
    if (!start) return null
    
    const duration = (end || performance.now()) - start
    this.measures.set(name, duration)
    
    if ('performance' in window && 'measure' in performance) {
      try {
        performance.measure(name, startMark, endMark)
      } catch {
        // Ignore errors from invalid marks
      }
    }
    
    // Send custom metric to analytics
    sendToAnalytics({
      name: `custom-${name}`,
      value: duration,
      rating: duration < 1000 ? 'good' : duration < 3000 ? 'needs-improvement' : 'poor',
      delta: 0,
      id: `${name}-${Date.now()}`,
      navigationType: 'custom',
    })
    
    return duration
  }
  
  /**
   * Clear all marks and measures
   */
  clear() {
    this.marks.clear()
    this.measures.clear()
    
    if ('performance' in window && 'clearMarks' in performance) {
      performance.clearMarks()
      performance.clearMeasures()
    }
  }
  
  /**
   * Get all current measures
   */
  getMeasures(): Record<string, number> {
    return Object.fromEntries(this.measures)
  }
}

// Global performance tracker instance
export const performanceTracker = new PerformanceTracker()

/**
 * Report long tasks (blocking main thread > 50ms)
 */
export function observeLongTasks() {
  if (!('PerformanceObserver' in window)) return
  
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
          sendToAnalytics({
            name: 'long-task',
            value: entry.duration,
            rating: entry.duration < 100 ? 'good' : entry.duration < 200 ? 'needs-improvement' : 'poor',
            delta: 0,
            id: `lt-${Date.now()}`,
            navigationType: 'long-task',
          })
        }
      }
    })
    
    observer.observe({ entryTypes: ['longtask'] })
  } catch {
    // Some browsers don't support long task observation
  }
}

/**
 * Report resource loading performance
 */
export function observeResourceTiming() {
  if (!('PerformanceObserver' in window)) return
  
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const resourceEntry = entry as PerformanceResourceTiming
        
        // Only track slow resources
        if (resourceEntry.duration > 1000) {
          sendToAnalytics({
            name: 'slow-resource',
            value: resourceEntry.duration,
            rating: resourceEntry.duration < 2000 ? 'needs-improvement' : 'poor',
            delta: 0,
            id: `res-${Date.now()}`,
            navigationType: resourceEntry.initiatorType || 'resource',
          })
        }
      }
    })
    
    observer.observe({ entryTypes: ['resource'] })
  } catch {
    // Some browsers don't support resource timing
  }
}