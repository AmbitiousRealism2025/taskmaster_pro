import { NextRequest, NextResponse } from 'next/server'
import { checkDatabaseConnection } from '@/lib/db/client'
import { checkRedisConnection } from '@/lib/redis/client'
import { getPerformanceHealth } from '@/lib/performance-monitor'

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  uptime: number
  services: {
    database: boolean
    cache: boolean
    performance: boolean
  }
  performance?: {
    averageQueryTime: number
    slowQueryCount: number
    criticalIssues: string[]
    warnings: string[]
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Check database connection
    const databaseHealthy = await checkDatabaseConnection()
    
    // Check cache connection (Redis)
    const cacheHealthy = await checkRedisConnection()
    
    // Check performance health
    const performanceHealth = getPerformanceHealth()
    const performanceHealthy = performanceHealth.healthy

    const healthStatus: HealthStatus = {
      status: databaseHealthy && cacheHealthy && performanceHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: databaseHealthy,
        cache: cacheHealthy,
        performance: performanceHealthy
      },
      performance: {
        averageQueryTime: performanceHealth.stats.averageQueryTime,
        slowQueryCount: performanceHealth.stats.slowQueryCount,
        criticalIssues: performanceHealth.criticalIssues,
        warnings: performanceHealth.warnings
      }
    }

    const duration = Date.now() - startTime
    console.log('Health check completed', { duration, status: healthStatus.status })

    return NextResponse.json(healthStatus, { 
      status: healthStatus.status === 'healthy' ? 200 : 503 
    })
  } catch (error) {
    console.error('Health check failed', { error })
    
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        timestamp: new Date().toISOString(),
        error: 'Internal server error' 
      },
      { status: 503 }
    )
  }
}