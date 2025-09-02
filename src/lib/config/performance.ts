/**
 * Production Performance Configuration
 * Core Web Vitals thresholds and monitoring setup
 */

export const PERFORMANCE_BUDGETS = {
  // Core Web Vitals thresholds (production targets)
  LCP_THRESHOLD: 2500, // Largest Contentful Paint (ms)
  FID_THRESHOLD: 100,  // First Input Delay (ms)
  CLS_THRESHOLD: 0.1,  // Cumulative Layout Shift
  FCP_THRESHOLD: 1800, // First Contentful Paint (ms)
  
  // Bundle size budgets
  MAIN_BUNDLE_SIZE: 250000,  // 250KB main bundle
  CHUNK_SIZE_LIMIT: 100000,  // 100KB per chunk
  
  // Runtime performance
  MEMORY_LIMIT: 50 * 1024 * 1024, // 50MB memory limit
  RENDER_TIME_BUDGET: 16, // 16ms render budget (60fps)
  
  // Network budgets
  API_RESPONSE_TIME: 1000, // 1s API response time
  CACHE_HIT_RATE: 0.85,    // 85% cache hit rate target
} as const

export const MONITORING_CONFIG = {
  // Sample rates for production
  PERFORMANCE_SAMPLE_RATE: 0.1,    // 10% of sessions
  ERROR_SAMPLE_RATE: 1.0,          // 100% of errors
  
  // Alert thresholds
  ERROR_RATE_THRESHOLD: 0.01,      // 1% error rate
  P95_RESPONSE_TIME: 2000,         // 2s P95 response time
  
  // Reporting intervals
  METRICS_REPORT_INTERVAL: 60000,  // 1 minute
  VITALS_REPORT_INTERVAL: 30000,   // 30 seconds
} as const

export const OPTIMIZATION_FEATURES = {
  // Production optimizations
  VIRTUAL_SCROLLING_THRESHOLD: 100, // Items before virtual scrolling
  IMAGE_LAZY_LOADING: true,
  COMPONENT_LAZY_LOADING: true,
  BUNDLE_COMPRESSION: true,
  SERVICE_WORKER_ENABLED: process.env.NODE_ENV === 'production',
  
  // Cache strategies
  STATIC_CACHE_DURATION: 31536000,  // 1 year for static assets
  API_CACHE_DURATION: 300,          // 5 minutes for API responses
  SWR_DEDUPE_INTERVAL: 2000,        // 2s SWR dedupe interval
} as const

/**
 * Performance monitoring utility
 */
export function reportWebVital(metric: any) {
  // Only report in production
  if (process.env.NODE_ENV !== 'production') return
  
  // Sample based on configuration
  if (Math.random() > MONITORING_CONFIG.PERFORMANCE_SAMPLE_RATE) return
  
  // Report to analytics service
  if (typeof window !== 'undefined' && 'gtag' in window) {
    (window as any).gtag('event', metric.name, {
      custom_map: { metric_value: 'value' },
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      event_category: 'Web Vitals',
      non_interaction: true,
    })
  }
  
  // Report to custom analytics
  fetch('/api/analytics/web-vitals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: metric.name,
      value: metric.value,
      delta: metric.delta,
      id: metric.id,
      url: window.location.href,
      timestamp: Date.now(),
    }),
  }).catch(console.error)
}