/**
 * API Route: Performance Analytics
 * 
 * Collects and stores performance metrics including Core Web Vitals
 * Provides performance insights and budget violation alerts
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Performance report validation schema
const performanceReportSchema = z.object({
  sessionId: z.string(),
  userId: z.string().optional(),
  timestamp: z.string(),
  url: z.string().url(),
  userAgent: z.string(),
  connection: z.string(),
  coreWebVitals: z.record(z.object({
    name: z.string(),
    value: z.number(),
    rating: z.enum(['good', 'needs-improvement', 'poor']),
    delta: z.number(),
    id: z.string(),
    navigationType: z.string()
  })),
  customMetrics: z.array(z.object({
    name: z.string(),
    value: z.number(),
    timestamp: z.number(),
    userId: z.string().optional(),
    sessionId: z.string()
  })),
  budgetViolations: z.array(z.string()),
  overallRating: z.enum(['good', 'needs-improvement', 'poor'])
})

// Performance metric validation schema
const metricSchema = z.object({
  sessionId: z.string(),
  userId: z.string().optional(),
  metric: z.object({
    name: z.string(),
    value: z.number(),
    rating: z.enum(['good', 'needs-improvement', 'poor']),
    delta: z.number(),
    id: z.string(),
    navigationType: z.string()
  }),
  timestamp: z.string(),
  url: z.string().url()
})

// In-memory storage for development (replace with database in production)
const performanceReports: Array<z.infer<typeof performanceReportSchema>> = []
const alertMetrics: Array<z.infer<typeof metricSchema>> = []

/**
 * POST /api/analytics/performance
 * Store performance report
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const report = performanceReportSchema.parse(body)

    // Store report (in production, save to database)
    performanceReports.push(report)

    // Log performance issues
    if (report.overallRating === 'poor') {
      console.warn('Poor performance detected:', {
        sessionId: report.sessionId,
        userId: report.userId,
        url: report.url,
        violations: report.budgetViolations,
        coreWebVitals: report.coreWebVitals
      })
    }

    // Analyze trends (simplified for development)
    const recentReports = performanceReports
      .filter(r => r.userId === report.userId)
      .slice(-10) // Last 10 reports

    const trends = analyzeTrends(recentReports)

    return NextResponse.json({
      success: true,
      sessionId: report.sessionId,
      trends,
      recommendations: generateRecommendations(report)
    })

  } catch (error) {
    console.error('Performance analytics error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid performance data',
          details: error.errors
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to process performance data'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/analytics/performance
 * Retrieve performance analytics
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const sessionId = searchParams.get('sessionId')
    const timeframe = searchParams.get('timeframe') || '24h'

    // Filter reports
    let filteredReports = performanceReports

    if (userId) {
      filteredReports = filteredReports.filter(r => r.userId === userId)
    }

    if (sessionId) {
      filteredReports = filteredReports.filter(r => r.sessionId === sessionId)
    }

    // Apply timeframe filter
    const now = new Date()
    const timeframeMs = getTimeframeMs(timeframe)
    const cutoffTime = new Date(now.getTime() - timeframeMs)

    filteredReports = filteredReports.filter(r => 
      new Date(r.timestamp) > cutoffTime
    )

    // Generate analytics
    const analytics = generateAnalytics(filteredReports)

    return NextResponse.json({
      analytics,
      reportCount: filteredReports.length,
      timeframe,
      generatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error retrieving performance analytics:', error)
    
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to retrieve performance analytics'
      },
      { status: 500 }
    )
  }
}

/**
 * Analyze performance trends
 */
function analyzeTrends(reports: Array<z.infer<typeof performanceReportSchema>>) {
  if (reports.length < 2) {
    return { message: 'Insufficient data for trend analysis' }
  }

  const metrics = ['LCP', 'FID', 'CLS', 'FCP', 'TTFB']
  const trends: Record<string, { current: number; trend: 'improving' | 'degrading' | 'stable' }> = {}

  metrics.forEach(metric => {
    const values = reports
      .map(r => r.coreWebVitals[metric]?.value)
      .filter(v => v !== undefined)

    if (values.length >= 2) {
      const current = values[values.length - 1]
      const previous = values[values.length - 2]
      const change = ((current - previous) / previous) * 100

      trends[metric] = {
        current,
        trend: Math.abs(change) < 5 ? 'stable' : change > 0 ? 'degrading' : 'improving'
      }
    }
  })

  return trends
}

/**
 * Generate performance recommendations
 */
function generateRecommendations(report: z.infer<typeof performanceReportSchema>): string[] {
  const recommendations: string[] = []

  // LCP recommendations
  const lcp = report.coreWebVitals.LCP
  if (lcp && lcp.rating === 'poor') {
    recommendations.push('Optimize images and remove unused CSS to improve Largest Contentful Paint')
  }

  // FID recommendations
  const fid = report.coreWebVitals.FID
  if (fid && fid.rating === 'poor') {
    recommendations.push('Reduce JavaScript execution time and break up long tasks to improve First Input Delay')
  }

  // CLS recommendations
  const cls = report.coreWebVitals.CLS
  if (cls && cls.rating === 'poor') {
    recommendations.push('Add size attributes to images and reserve space for dynamic content to reduce layout shift')
  }

  // Memory recommendations
  const memoryMetrics = report.customMetrics.filter(m => m.name.includes('memory'))
  const highMemory = memoryMetrics.find(m => m.value > 100 * 1024 * 1024) // 100MB
  if (highMemory) {
    recommendations.push('Consider code splitting and lazy loading to reduce memory usage')
  }

  // API recommendations
  const slowAPIs = report.customMetrics.filter(m => 
    m.name.startsWith('api_') && m.value > 1000
  )
  if (slowAPIs.length > 0) {
    recommendations.push('Optimize slow API calls and consider implementing caching strategies')
  }

  return recommendations
}

/**
 * Generate comprehensive analytics
 */
function generateAnalytics(reports: Array<z.infer<typeof performanceReportSchema>>) {
  if (reports.length === 0) {
    return { message: 'No performance data available' }
  }

  // Core Web Vitals summary
  const metrics = ['LCP', 'FID', 'CLS', 'FCP', 'TTFB']
  const webVitalsSummary: Record<string, any> = {}

  metrics.forEach(metric => {
    const values = reports
      .map(r => r.coreWebVitals[metric]?.value)
      .filter(v => v !== undefined)

    if (values.length > 0) {
      webVitalsSummary[metric] = {
        average: values.reduce((a, b) => a + b, 0) / values.length,
        median: values.sort((a, b) => a - b)[Math.floor(values.length / 2)],
        p75: values.sort((a, b) => a - b)[Math.floor(values.length * 0.75)],
        p95: values.sort((a, b) => a - b)[Math.floor(values.length * 0.95)],
        count: values.length
      }
    }
  })

  // Rating distribution
  const ratingDistribution = {
    good: reports.filter(r => r.overallRating === 'good').length,
    needsImprovement: reports.filter(r => r.overallRating === 'needs-improvement').length,
    poor: reports.filter(r => r.overallRating === 'poor').length
  }

  // Budget violations
  const budgetViolations = reports
    .flatMap(r => r.budgetViolations)
    .reduce((acc, violation) => {
      acc[violation] = (acc[violation] || 0) + 1
      return acc
    }, {} as Record<string, number>)

  // Page performance by URL
  const pagePerformance: Record<string, any> = {}
  reports.forEach(report => {
    const url = new URL(report.url).pathname
    if (!pagePerformance[url]) {
      pagePerformance[url] = {
        reports: 0,
        averageLCP: 0,
        averageFID: 0,
        averageCLS: 0
      }
    }
    pagePerformance[url].reports++
    if (report.coreWebVitals.LCP) {
      pagePerformance[url].averageLCP += report.coreWebVitals.LCP.value
    }
    if (report.coreWebVitals.FID) {
      pagePerformance[url].averageFID += report.coreWebVitals.FID.value
    }
    if (report.coreWebVitals.CLS) {
      pagePerformance[url].averageCLS += report.coreWebVitals.CLS.value
    }
  })

  // Calculate averages for page performance
  Object.keys(pagePerformance).forEach(url => {
    const page = pagePerformance[url]
    page.averageLCP = page.averageLCP / page.reports
    page.averageFID = page.averageFID / page.reports
    page.averageCLS = page.averageCLS / page.reports
  })

  return {
    summary: {
      totalReports: reports.length,
      timeRange: {
        start: reports[0]?.timestamp,
        end: reports[reports.length - 1]?.timestamp
      }
    },
    webVitalsSummary,
    ratingDistribution,
    budgetViolations,
    pagePerformance,
    topIssues: Object.entries(budgetViolations)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
  }
}

/**
 * Convert timeframe string to milliseconds
 */
function getTimeframeMs(timeframe: string): number {
  switch (timeframe) {
    case '1h': return 60 * 60 * 1000
    case '6h': return 6 * 60 * 60 * 1000
    case '24h': return 24 * 60 * 60 * 1000
    case '7d': return 7 * 24 * 60 * 60 * 1000
    case '30d': return 30 * 24 * 60 * 60 * 1000
    default: return 24 * 60 * 60 * 1000
  }
}