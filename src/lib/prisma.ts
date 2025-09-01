import { PrismaClient } from '@prisma/client'
import { performanceMonitor } from './performance-monitor'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

function createPrismaClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error']
  })

  // Performance monitoring - log slow queries
  client.$on('query', (e) => {
    const duration = e.duration
    const query = e.query
    const params = e.params

    // Add to performance monitor
    performanceMonitor.addMetric({
      query,
      duration,
      timestamp: new Date(),
      params
    })

    // Log slow queries (> 1000ms)
    if (duration > 1000) {
      console.warn('🐌 Slow query detected:', {
        duration: `${duration}ms`,
        query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
        params: params,
        timestamp: new Date().toISOString()
      })
    }

    // Log very slow queries (> 5000ms) as errors
    if (duration > 5000) {
      console.error('🚨 Critical slow query:', {
        duration: `${duration}ms`,
        query,
        params,
        timestamp: new Date().toISOString(),
        stack: new Error().stack
      })
    }

    // Development performance logging
    if (process.env.NODE_ENV === 'development' && duration > 100) {
      console.log(`⚡ Query took ${duration}ms: ${query.substring(0, 50)}...`)
    }
  })

  // Log connection errors
  client.$on('error', (e) => {
    console.error('❌ Prisma error:', {
      message: e.message,
      timestamp: new Date().toISOString()
    })
  })

  // Log warnings
  client.$on('warn', (e) => {
    console.warn('⚠️ Prisma warning:', {
      message: e.message,
      timestamp: new Date().toISOString()
    })
  })

  return client
}