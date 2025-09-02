/**
 * API Route: Web Vitals Analytics
 * 
 * Collects Core Web Vitals metrics for performance monitoring
 */

import { NextRequest, NextResponse } from 'next/server'
import { PERFORMANCE_BUDGETS, MONITORING_CONFIG } from '@/lib/config/performance'

interface WebVitalMetric {
  name: string
  value: number
  delta: number
  id: string
  url: string
  timestamp: number
}

// Simple in-memory storage for development (use database in production)
const metricsStore: WebVitalMetric[] = []

export async function POST(request: NextRequest) {
  try {
    const metric: WebVitalMetric = await request.json()
    
    // Validate metric
    if (!metric.name || typeof metric.value !== 'number') {
      return NextResponse.json(
        { error: 'Invalid metric data' },
        { status: 400 }
      )
    }
    
    // Store metric (in production, store in database)
    metricsStore.push({
      ...metric,
      timestamp: Date.now(),
    })
    
    // Keep only recent metrics (last 1000)
    if (metricsStore.length > 1000) {
      metricsStore.splice(0, metricsStore.length - 1000)
    }
    
    // Check against performance budgets
    const alerts = checkPerformanceBudgets(metric)
    
    // Log performance issues
    if (alerts.length > 0) {
      console.warn('Performance budget exceeded:', {
        metric: metric.name,
        value: metric.value,
        alerts,
        url: metric.url
      })
    }
    
    return NextResponse.json({ 
      success: true,
      alerts: alerts.length > 0 ? alerts : undefined
    })
    
  } catch (error) {
    console.error('Web vitals collection error:', error)
    
    return NextResponse.json(
      {
        error: 'Failed to collect web vital',
        details: process.env.NODE_ENV === 'development' ? 
          (error instanceof Error ? error.message : String(error)) : undefined
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get recent metrics summary
    const recentMetrics = metricsStore.filter(
      m => Date.now() - m.timestamp < 24 * 60 * 60 * 1000 // Last 24 hours
    )
    
    // Calculate averages by metric type
    const summary = ['LCP', 'FID', 'CLS', 'FCP'].reduce((acc, name) => {
      const metrics = recentMetrics.filter(m => m.name === name)
      if (metrics.length > 0) {
        const values = metrics.map(m => m.value)
        acc[name] = {
          count: metrics.length,
          average: values.reduce((a, b) => a + b, 0) / values.length,
          p95: values.sort((a, b) => a - b)[Math.floor(values.length * 0.95)] || 0,
          budget: getBudgetForMetric(name),
          status: getMetricStatus(name, values)
        }
      }
      return acc
    }, {} as Record<string, any>)
    
    return NextResponse.json({
      summary,
      totalMetrics: recentMetrics.length,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Web vitals retrieval error:', error)
    
    return NextResponse.json(
      { error: 'Failed to retrieve web vitals' },
      { status: 500 }
    )
  }
}

function checkPerformanceBudgets(metric: WebVitalMetric): string[] {
  const alerts: string[] = []
  
  switch (metric.name) {
    case 'LCP':
      if (metric.value > PERFORMANCE_BUDGETS.LCP_THRESHOLD) {
        alerts.push(`LCP (${Math.round(metric.value)}ms) exceeds budget (${PERFORMANCE_BUDGETS.LCP_THRESHOLD}ms)`)
      }
      break
    case 'FID':
      if (metric.value > PERFORMANCE_BUDGETS.FID_THRESHOLD) {
        alerts.push(`FID (${Math.round(metric.value)}ms) exceeds budget (${PERFORMANCE_BUDGETS.FID_THRESHOLD}ms)`)
      }
      break
    case 'CLS':
      if (metric.value > PERFORMANCE_BUDGETS.CLS_THRESHOLD) {
        alerts.push(`CLS (${metric.value.toFixed(3)}) exceeds budget (${PERFORMANCE_BUDGETS.CLS_THRESHOLD})`)
      }
      break
    case 'FCP':
      if (metric.value > PERFORMANCE_BUDGETS.FCP_THRESHOLD) {
        alerts.push(`FCP (${Math.round(metric.value)}ms) exceeds budget (${PERFORMANCE_BUDGETS.FCP_THRESHOLD}ms)`)
      }
      break
  }
  
  return alerts
}

function getBudgetForMetric(name: string): number {
  switch (name) {
    case 'LCP': return PERFORMANCE_BUDGETS.LCP_THRESHOLD
    case 'FID': return PERFORMANCE_BUDGETS.FID_THRESHOLD  
    case 'CLS': return PERFORMANCE_BUDGETS.CLS_THRESHOLD
    case 'FCP': return PERFORMANCE_BUDGETS.FCP_THRESHOLD
    default: return 0
  }
}

function getMetricStatus(name: string, values: number[]): 'good' | 'needs-improvement' | 'poor' {
  const average = values.reduce((a, b) => a + b, 0) / values.length
  const budget = getBudgetForMetric(name)
  
  if (average <= budget * 0.8) return 'good'
  if (average <= budget) return 'needs-improvement'
  return 'poor'
}