import { NextRequest, NextResponse } from 'next/server'
import { checkDatabaseConnection } from '@/lib/db/client'

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  uptime: number
  services: {
    database: boolean
    cache: boolean
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Check database connection
    const databaseHealthy = await checkDatabaseConnection()
    
    // Check cache connection (Redis) - placeholder for now
    let cacheHealthy = false
    try {
      // TODO: Add Redis health check when implemented
      cacheHealthy = true
    } catch {
      cacheHealthy = false
    }

    const healthStatus: HealthStatus = {
      status: databaseHealthy && cacheHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: databaseHealthy,
        cache: cacheHealthy
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