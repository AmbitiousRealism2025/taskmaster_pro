/**
 * Web Vitals Analytics Endpoint
 * 
 * Collects Core Web Vitals and performance metrics
 */

import { NextRequest, NextResponse } from 'next/server'
import { log } from '@/lib/monitoring/logger'
import { rateLimit, RATE_LIMIT_CONFIGS } from '@/lib/security/rate-limit'

interface WebVitalMetric {
  metric: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta: number
  id: string
  navigationType: string
  url: string
  timestamp: string
  userAgent: string
}

interface PerformanceEntry {
  name: string
  entryType: string
  startTime: number
  duration: number
}

interface CustomMetric {
  name: string
  value: number
  tags?: Record<string, string>
  timestamp?: string
}

/**
 * Validate Web Vital metric
 */
function isValidWebVital(metric: any): metric is WebVitalMetric {
  const validMetrics = ['CLS', 'FCP', 'FID', 'LCP', 'TTFB', 'INP']
  const validRatings = ['good', 'needs-improvement', 'poor']
  
  return (
    typeof metric.metric === 'string' &&
    validMetrics.includes(metric.metric) &&
    typeof metric.value === 'number' &&
    validRatings.includes(metric.rating) &&
    typeof metric.id === 'string' &&
    typeof metric.url === 'string'
  )
}

/**
 * Process Web Vital metric
 */
function processWebVital(metric: WebVitalMetric) {
  // Log performance metric
  log.performance(`${metric.metric}: ${metric.value}`, metric.value, getMetricUnit(metric.metric), {
    metric: metric.metric,
    rating: metric.rating,
    id: metric.id,
    url: metric.url,
    navigationType: metric.navigationType,
    userAgent: metric.userAgent.substring(0, 100), // Truncate long user agents
  })
  
  // Additional processing based on metric type
  switch (metric.metric) {
    case 'LCP':
      if (metric.rating === 'poor') {
        log.warn('Poor Largest Contentful Paint detected', {
          value: metric.value,
          threshold: 4000,
          url: metric.url,
          userAgent: metric.userAgent.substring(0, 100),
        })
      }
      break
      
    case 'FID':
      if (metric.rating === 'poor') {
        log.warn('Poor First Input Delay detected', {
          value: metric.value,
          threshold: 300,
          url: metric.url,
          userAgent: metric.userAgent.substring(0, 100),
        })
      }
      break
      
    case 'CLS':
      if (metric.rating === 'poor') {
        log.warn('Poor Cumulative Layout Shift detected', {
          value: metric.value,
          threshold: 0.25,
          url: metric.url,
          userAgent: metric.userAgent.substring(0, 100),
        })
      }
      break
  }
}

/**
 * Get metric unit
 */
function getMetricUnit(metric: string): string {
  switch (metric) {
    case 'CLS':
      return 'score'
    case 'FCP':
    case 'FID':
    case 'LCP':
    case 'TTFB':
    case 'INP':
      return 'ms'
    default:
      return 'ms'
  }
}

/**
 * Process performance entries
 */
function processPerformanceEntries(entries: PerformanceEntry[]) {
  for (const entry of entries) {
    if (entry.entryType === 'navigation') {
      log.performance('Navigation timing', entry.duration, 'ms', {
        name: entry.name,
        type: entry.entryType,
      })
    } else if (entry.entryType === 'resource' && entry.duration > 1000) {
      log.warn('Slow resource detected', {
        resource: entry.name,
        duration: entry.duration,
        type: entry.entryType,
      })
    } else if (entry.entryType === 'longtask') {
      log.warn('Long task detected', {
        duration: entry.duration,
        startTime: entry.startTime,
      })
    }
  }
}

/**
 * Process custom metrics
 */
function processCustomMetrics(metrics: CustomMetric[]) {
  for (const metric of metrics) {
    log.performance(metric.name, metric.value, 'custom', {
      tags: metric.tags,
      timestamp: metric.timestamp,
    })
  }
}

/**
 * POST /api/analytics/vitals
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, RATE_LIMIT_CONFIGS.analytics.vitals)
    if (rateLimitResult instanceof NextResponse) {
      return rateLimitResult
    }
    
    const body = await request.json()
    const userAgent = request.headers.get('user-agent') || 'unknown'
    
    // Handle single metric or array of metrics
    const metrics = Array.isArray(body) ? body : [body]
    
    let processedCount = 0
    let errorCount = 0
    
    for (const data of metrics) {
      try {
        if (data.metric) {
          // Web Vital metric
          const webVital: WebVitalMetric = {
            ...data,
            userAgent,
            timestamp: data.timestamp || new Date().toISOString(),
          }
          
          if (isValidWebVital(webVital)) {
            processWebVital(webVital)
            processedCount++
          } else {
            log.warn('Invalid Web Vital metric received', { data })
            errorCount++
          }
        } else if (data.entries) {
          // Performance entries
          processPerformanceEntries(data.entries)
          processedCount++
        } else if (data.customMetrics) {
          // Custom metrics
          processCustomMetrics(data.customMetrics)
          processedCount++
        } else {
          log.warn('Unknown analytics data format', { data })
          errorCount++
        }
      } catch (error) {
        log.error('Error processing analytics data', error as Error, { data })
        errorCount++
      }
    }
    
    return NextResponse.json({
      success: true,
      processed: processedCount,
      errors: errorCount,
      timestamp: new Date().toISOString(),
    })
    
  } catch (error) {
    log.error('Analytics endpoint error', error as Error, {
      url: request.url,
      method: request.method,
    })
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process analytics data',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/analytics/vitals - Return aggregated metrics
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // This would typically query a database or metrics store
    // For now, return a placeholder response
    
    return NextResponse.json({
      message: 'Web Vitals analytics data',
      note: 'This endpoint would typically return aggregated metrics from a time-series database',
      timestamp: new Date().toISOString(),
    })
    
  } catch (error) {
    log.error('Analytics GET endpoint error', error as Error)
    
    return NextResponse.json(
      { error: 'Failed to retrieve analytics data' },
      { status: 500 }
    )
  }
}