// API Route for notification system metrics and health monitoring
// Part of Phase 3.2 - External Integration Layer

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/lib/auth/config'
import { getNotificationService } from '@/lib/notifications/EnhancedNotificationService'

// Get notification system metrics and health status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user has admin permissions for detailed metrics
    const isAdmin = session.user.role === 'admin' // Assuming role field exists
    
    const notificationService = getNotificationService()
    const systemHealth = await notificationService.getSystemHealth()

    if (isAdmin) {
      // Return full metrics for admin users
      return NextResponse.json({
        health: systemHealth,
        timestamp: new Date().toISOString(),
        status: 'success'
      })
    } else {
      // Return limited metrics for regular users
      return NextResponse.json({
        performance: {
          deliveryRate: systemHealth.metrics.deliveryRate,
          averageLatency: systemHealth.metrics.averageLatency,
          queueDepth: systemHealth.queue.queueSize
        },
        status: systemHealth.circuitBreaker.state === 'CLOSED' ? 'operational' : 'degraded',
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Get notification metrics error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Export metrics in Prometheus format (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check admin permissions
    const isAdmin = session.user.role === 'admin'
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { format } = await request.json()

    const notificationService = getNotificationService()
    
    if (format === 'prometheus') {
      const metricsCollector = (notificationService as any).metrics
      const prometheusMetrics = await metricsCollector.exportMetricsForPrometheus()
      
      return new Response(prometheusMetrics, {
        headers: {
          'Content-Type': 'text/plain; version=0.0.4; charset=utf-8'
        }
      })
    }

    return NextResponse.json(
      { error: 'Unsupported format. Use "prometheus"' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Export notification metrics error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}