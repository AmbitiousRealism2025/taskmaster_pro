/**
 * API Route: Performance Alert System
 * 
 * Handles immediate performance violation alerts
 * Provides real-time monitoring for critical performance issues
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Performance alert validation schema
const performanceAlertSchema = z.object({
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

// Alert storage (replace with database/queue in production)
const performanceAlerts: Array<z.infer<typeof performanceAlertSchema>> = []

// Alert thresholds for immediate notification
const ALERT_THRESHOLDS = {
  LCP: 4000,  // 4s - critical threshold
  FID: 300,   // 300ms - critical threshold
  CLS: 0.25,  // 0.25 - critical threshold
  FCP: 3000,  // 3s - critical threshold
  TTFB: 1500  // 1.5s - critical threshold
}

/**
 * POST /api/analytics/performance-alert
 * Handle performance violation alerts
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const alert = performanceAlertSchema.parse(body)

    // Store alert
    performanceAlerts.push(alert)

    // Determine alert severity
    const severity = getAlertSeverity(alert.metric)
    
    // Log critical alerts
    if (severity === 'critical') {
      console.error('CRITICAL PERFORMANCE ALERT:', {
        metric: alert.metric.name,
        value: alert.metric.value,
        threshold: ALERT_THRESHOLDS[alert.metric.name as keyof typeof ALERT_THRESHOLDS],
        url: alert.url,
        userId: alert.userId,
        sessionId: alert.sessionId
      })
    } else {
      console.warn('Performance Alert:', {
        metric: alert.metric.name,
        value: alert.metric.value,
        url: alert.url,
        userId: alert.userId
      })
    }

    // Check for patterns (multiple alerts from same user/session)
    const recentAlerts = getRecentAlerts(alert.sessionId, alert.userId)
    const pattern = analyzeAlertPattern(recentAlerts)

    // Generate immediate recommendations
    const recommendations = generateImmediateRecommendations(alert.metric)

    // In production, trigger real-time notifications:
    // - Slack/Discord webhook
    // - Email alerts for critical issues
    // - Dashboard updates
    // - Incident management system
    await triggerRealTimeNotifications(alert, severity, pattern)

    return NextResponse.json({
      success: true,
      alertId: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      severity,
      pattern,
      recommendations,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Performance alert processing error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid alert data',
          details: error.errors
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to process performance alert'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/analytics/performance-alert
 * Retrieve recent performance alerts
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const severity = searchParams.get('severity') as 'low' | 'medium' | 'high' | 'critical' | null
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

    // Filter alerts
    let filteredAlerts = performanceAlerts

    if (userId) {
      filteredAlerts = filteredAlerts.filter(a => a.userId === userId)
    }

    // Apply severity filter
    if (severity) {
      filteredAlerts = filteredAlerts.filter(alert => 
        getAlertSeverity(alert.metric) === severity
      )
    }

    // Sort by timestamp (newest first) and limit
    const sortedAlerts = filteredAlerts
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)

    // Add severity and recommendations to each alert
    const enrichedAlerts = sortedAlerts.map(alert => ({
      ...alert,
      severity: getAlertSeverity(alert.metric),
      recommendations: generateImmediateRecommendations(alert.metric)
    }))

    // Generate alert summary
    const alertSummary = generateAlertSummary(filteredAlerts)

    return NextResponse.json({
      alerts: enrichedAlerts,
      summary: alertSummary,
      total: filteredAlerts.length,
      limit,
      generatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error retrieving performance alerts:', error)
    
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to retrieve performance alerts'
      },
      { status: 500 }
    )
  }
}

/**
 * Determine alert severity based on metric value
 */
function getAlertSeverity(metric: any): 'low' | 'medium' | 'high' | 'critical' {
  const threshold = ALERT_THRESHOLDS[metric.name as keyof typeof ALERT_THRESHOLDS]
  
  if (!threshold) return 'low'
  
  const ratio = metric.value / threshold
  
  if (ratio >= 2.0) return 'critical'  // 2x over threshold
  if (ratio >= 1.5) return 'high'      // 1.5x over threshold
  if (ratio >= 1.2) return 'medium'    // 1.2x over threshold
  return 'low'
}

/**
 * Get recent alerts for pattern analysis
 */
function getRecentAlerts(sessionId?: string, userId?: string): Array<z.infer<typeof performanceAlertSchema>> {
  const now = new Date()
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)

  return performanceAlerts.filter(alert => {
    const alertTime = new Date(alert.timestamp)
    const isRecent = alertTime > fiveMinutesAgo
    const sameSession = sessionId ? alert.sessionId === sessionId : true
    const sameUser = userId ? alert.userId === userId : true
    
    return isRecent && sameSession && sameUser
  })
}

/**
 * Analyze alert patterns
 */
function analyzeAlertPattern(alerts: Array<z.infer<typeof performanceAlertSchema>>): {
  type: 'none' | 'recurring' | 'cascade' | 'widespread'
  severity: 'low' | 'medium' | 'high'
  description: string
} {
  if (alerts.length <= 1) {
    return { type: 'none', severity: 'low', description: 'Isolated performance issue' }
  }

  // Check for recurring same metric
  const metricCounts = alerts.reduce((acc, alert) => {
    acc[alert.metric.name] = (acc[alert.metric.name] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const maxCount = Math.max(...Object.values(metricCounts))
  const affectedMetrics = Object.keys(metricCounts).length

  if (maxCount >= 3) {
    return {
      type: 'recurring',
      severity: 'high',
      description: `Recurring ${Object.keys(metricCounts).find(k => metricCounts[k] === maxCount)} issues detected`
    }
  }

  if (affectedMetrics >= 3) {
    return {
      type: 'cascade',
      severity: 'high',
      description: 'Multiple performance metrics affected simultaneously'
    }
  }

  if (alerts.length >= 5) {
    return {
      type: 'widespread',
      severity: 'medium',
      description: 'Multiple performance issues detected in short timeframe'
    }
  }

  return {
    type: 'none',
    severity: 'low',
    description: 'Minor performance fluctuation'
  }
}

/**
 * Generate immediate recommendations for metric violation
 */
function generateImmediateRecommendations(metric: any): string[] {
  const recommendations: string[] = []

  switch (metric.name) {
    case 'LCP':
      recommendations.push('Check for large images or slow server responses')
      recommendations.push('Optimize critical rendering path')
      recommendations.push('Consider using a CDN for static assets')
      break
      
    case 'FID':
      recommendations.push('Reduce JavaScript execution time')
      recommendations.push('Break up long-running tasks')
      recommendations.push('Consider code splitting for large bundles')
      break
      
    case 'CLS':
      recommendations.push('Add size attributes to images and media')
      recommendations.push('Reserve space for dynamic content')
      recommendations.push('Avoid inserting content above existing content')
      break
      
    case 'FCP':
      recommendations.push('Optimize server response time')
      recommendations.push('Eliminate render-blocking resources')
      recommendations.push('Minimize critical CSS')
      break
      
    case 'TTFB':
      recommendations.push('Optimize server-side processing')
      recommendations.push('Use CDN for global content delivery')
      recommendations.push('Check database query performance')
      break
      
    default:
      recommendations.push('Monitor this metric and investigate root cause')
  }

  return recommendations
}

/**
 * Trigger real-time notifications (placeholder for production implementation)
 */
async function triggerRealTimeNotifications(
  alert: z.infer<typeof performanceAlertSchema>,
  severity: string,
  pattern: any
): Promise<void> {
  // In production, implement:
  
  // 1. Webhook notifications
  if (severity === 'critical') {
    console.log('Would trigger Slack/Discord webhook for critical alert')
    // await sendSlackAlert(alert, severity, pattern)
  }
  
  // 2. Email alerts
  if (severity === 'critical' || pattern.type === 'cascade') {
    console.log('Would send email alert to development team')
    // await sendEmailAlert(alert, severity, pattern)
  }
  
  // 3. Real-time dashboard updates
  console.log('Would broadcast to WebSocket connections for dashboard updates')
  // await broadcastToDashboard(alert, severity, pattern)
  
  // 4. Incident management system integration
  if (severity === 'critical' && pattern.type !== 'none') {
    console.log('Would create incident ticket in management system')
    // await createIncidentTicket(alert, severity, pattern)
  }
}

/**
 * Generate alert summary statistics
 */
function generateAlertSummary(alerts: Array<z.infer<typeof performanceAlertSchema>>) {
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const recentAlerts = alerts.filter(a => new Date(a.timestamp) > oneHourAgo)
  const dailyAlerts = alerts.filter(a => new Date(a.timestamp) > oneDayAgo)

  // Count by severity
  const severityCounts = alerts.reduce((acc, alert) => {
    const severity = getAlertSeverity(alert.metric)
    acc[severity] = (acc[severity] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Count by metric
  const metricCounts = alerts.reduce((acc, alert) => {
    acc[alert.metric.name] = (acc[alert.metric.name] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Top problematic URLs
  const urlCounts = alerts.reduce((acc, alert) => {
    const path = new URL(alert.url).pathname
    acc[path] = (acc[path] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return {
    totalAlerts: alerts.length,
    recentAlerts: recentAlerts.length,
    dailyAlerts: dailyAlerts.length,
    severityBreakdown: severityCounts,
    metricBreakdown: metricCounts,
    topProblematicPages: Object.entries(urlCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([url, count]) => ({ url, count })),
    alertRate: {
      perHour: recentAlerts.length,
      perDay: dailyAlerts.length
    }
  }
}