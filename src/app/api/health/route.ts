/**
 * Health Check API Endpoint
 * 
 * Comprehensive system health monitoring
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { log, checkLoggerHealth } from '@/lib/monitoring/logger'
import { Redis } from '@upstash/redis'

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  uptime: number
  checks: {
    database: HealthCheck
    redis: HealthCheck
    memory: HealthCheck
    filesystem: HealthCheck
    logger: HealthCheck
    external: HealthCheck
  }
  summary: {
    total: number
    passed: number
    failed: number
    warnings: number
  }
}

interface HealthCheck {
  status: 'pass' | 'fail' | 'warn'
  duration: number
  message: string
  details?: Record<string, any>
}

// Health check timeout
const HEALTH_CHECK_TIMEOUT = 5000

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now()
  
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Simple connectivity test
    const { data, error } = await supabase
      .from('projects')
      .select('id')
      .limit(1)
    
    if (error) throw error
    
    return {
      status: 'pass',
      duration: Date.now() - start,
      message: 'Database connection successful',
      details: {
        connected: true,
        responseTime: Date.now() - start,
      }
    }
  } catch (error) {
    return {
      status: 'fail',
      duration: Date.now() - start,
      message: 'Database connection failed',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        connected: false,
      }
    }
  }
}

/**
 * Check Redis connectivity
 */
async function checkRedis(): Promise<HealthCheck> {
  const start = Date.now()
  
  try {
    if (!process.env.REDIS_URL) {
      return {
        status: 'warn',
        duration: Date.now() - start,
        message: 'Redis not configured',
        details: { configured: false }
      }
    }
    
    const redis = new Redis({
      url: process.env.REDIS_URL,
      token: process.env.REDIS_TOKEN,
    })
    
    // Test Redis connectivity
    const testKey = `health_check:${Date.now()}`
    await redis.set(testKey, 'test', { ex: 10 })
    const result = await redis.get(testKey)
    await redis.del(testKey)
    
    if (result !== 'test') {
      throw new Error('Redis read/write test failed')
    }
    
    return {
      status: 'pass',
      duration: Date.now() - start,
      message: 'Redis connection successful',
      details: {
        connected: true,
        responseTime: Date.now() - start,
      }
    }
  } catch (error) {
    return {
      status: 'fail',
      duration: Date.now() - start,
      message: 'Redis connection failed',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        connected: false,
      }
    }
  }
}

/**
 * Check memory usage
 */
async function checkMemory(): Promise<HealthCheck> {
  const start = Date.now()
  
  try {
    const memUsage = process.memoryUsage()
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024)
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024)
    const rssMemMB = Math.round(memUsage.rss / 1024 / 1024)
    
    // Memory usage thresholds
    const memoryWarningThreshold = 500 // MB
    const memoryCriticalThreshold = 1000 // MB
    
    let status: 'pass' | 'warn' | 'fail' = 'pass'
    let message = 'Memory usage normal'
    
    if (heapUsedMB > memoryCriticalThreshold) {
      status = 'fail'
      message = 'Memory usage critical'
    } else if (heapUsedMB > memoryWarningThreshold) {
      status = 'warn'
      message = 'Memory usage elevated'
    }
    
    return {
      status,
      duration: Date.now() - start,
      message,
      details: {
        heapUsed: `${heapUsedMB}MB`,
        heapTotal: `${heapTotalMB}MB`,
        rss: `${rssMemMB}MB`,
        external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
        arrayBuffers: `${Math.round(memUsage.arrayBuffers / 1024 / 1024)}MB`,
        heapUsagePercent: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
      }
    }
  } catch (error) {
    return {
      status: 'fail',
      duration: Date.now() - start,
      message: 'Memory check failed',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}

/**
 * Check filesystem
 */
async function checkFilesystem(): Promise<HealthCheck> {
  const start = Date.now()
  
  try {
    const fs = require('fs').promises
    const path = require('path')
    const testFile = path.join(process.cwd(), '.health-check-test')
    
    // Test write/read/delete
    await fs.writeFile(testFile, 'health-check-test')
    const content = await fs.readFile(testFile, 'utf8')
    await fs.unlink(testFile)
    
    if (content !== 'health-check-test') {
      throw new Error('Filesystem read/write test failed')
    }
    
    return {
      status: 'pass',
      duration: Date.now() - start,
      message: 'Filesystem accessible',
      details: {
        writable: true,
        readable: true,
        responseTime: Date.now() - start,
      }
    }
  } catch (error) {
    return {
      status: 'fail',
      duration: Date.now() - start,
      message: 'Filesystem check failed',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        writable: false,
      }
    }
  }
}

/**
 * Check logger system
 */
async function checkLogger(): Promise<HealthCheck> {
  const start = Date.now()
  
  try {
    const loggerHealth = checkLoggerHealth()
    
    return {
      status: loggerHealth.healthy ? 'pass' : 'warn',
      duration: Date.now() - start,
      message: loggerHealth.healthy ? 'Logger system operational' : 'Logger system issues detected',
      details: {
        healthy: loggerHealth.healthy,
        issues: loggerHealth.issues,
      }
    }
  } catch (error) {
    return {
      status: 'fail',
      duration: Date.now() - start,
      message: 'Logger check failed',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}

/**
 * Check external dependencies
 */
async function checkExternal(): Promise<HealthCheck> {
  const start = Date.now()
  
  try {
    // Check if Supabase is reachable
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) {
      throw new Error('Supabase URL not configured')
    }
    
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT),
    })
    
    if (!response.ok) {
      throw new Error(`Supabase health check failed: ${response.status}`)
    }
    
    return {
      status: 'pass',
      duration: Date.now() - start,
      message: 'External dependencies accessible',
      details: {
        supabase: {
          status: response.status,
          responseTime: Date.now() - start,
        },
      }
    }
  } catch (error) {
    return {
      status: 'fail',
      duration: Date.now() - start,
      message: 'External dependencies check failed',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}

/**
 * Run all health checks with timeout
 */
async function runHealthChecks(): Promise<HealthCheckResult['checks']> {
  const timeout = (ms: number) => new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Health check timeout')), ms)
  )
  
  const runCheck = async (name: string, checkFn: () => Promise<HealthCheck>) => {
    try {
      return await Promise.race([
        checkFn(),
        timeout(HEALTH_CHECK_TIMEOUT)
      ]) as HealthCheck
    } catch (error) {
      return {
        status: 'fail',
        duration: HEALTH_CHECK_TIMEOUT,
        message: `Health check timeout or error: ${name}`,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timeout: true,
        }
      }
    }
  }
  
  const [database, redis, memory, filesystem, logger, external] = await Promise.all([
    runCheck('database', checkDatabase),
    runCheck('redis', checkRedis),
    runCheck('memory', checkMemory),
    runCheck('filesystem', checkFilesystem),
    runCheck('logger', checkLogger),
    runCheck('external', checkExternal),
  ])
  
  return { database, redis, memory, filesystem, logger, external }
}

/**
 * GET /api/health
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()
  
  try {
    // Run all health checks
    const checks = await runHealthChecks()
    
    // Calculate summary
    const checkResults = Object.values(checks)
    const summary = {
      total: checkResults.length,
      passed: checkResults.filter(c => c.status === 'pass').length,
      failed: checkResults.filter(c => c.status === 'fail').length,
      warnings: checkResults.filter(c => c.status === 'warn').length,
    }
    
    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    if (summary.failed > 0) {
      status = summary.failed > 2 ? 'unhealthy' : 'degraded'
    } else if (summary.warnings > 2) {
      status = 'degraded'
    }
    
    const result: HealthCheckResult = {
      status,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      checks,
      summary,
    }
    
    // Log health check
    log.info('Health check completed', {
      status: result.status,
      duration: Date.now() - startTime,
      summary: result.summary,
    })
    
    // Return appropriate HTTP status
    const httpStatus = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503
    
    return NextResponse.json(result, { 
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json',
      }
    })
  } catch (error) {
    log.error('Health check failed', error as Error)
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    )
  }
}