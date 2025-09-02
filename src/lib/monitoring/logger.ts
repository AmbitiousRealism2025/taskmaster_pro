/**
 * Structured Logging System
 * 
 * Centralized logging with multiple transports and structured data
 */

import winston from 'winston'
import path from 'path'

// Log levels
export type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'debug'

// Structured log entry interface
export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  service: string
  environment: string
  version: string
  userId?: string
  sessionId?: string
  requestId?: string
  ip?: string
  userAgent?: string
  url?: string
  method?: string
  statusCode?: number
  responseTime?: number
  error?: {
    name: string
    message: string
    stack?: string
    code?: string
  }
  context?: Record<string, any>
  tags?: string[]
}

// Custom log format
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    const { timestamp, level, message, service, environment, ...meta } = info
    
    const logEntry: LogEntry = {
      timestamp,
      level: level as LogLevel,
      message,
      service: service || 'taskmaster-pro',
      environment: environment || process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      ...meta,
    }
    
    return JSON.stringify(logEntry, null, process.env.NODE_ENV === 'development' ? 2 : 0)
  })
)

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
    return `${timestamp} [${service}] ${level}: ${message} ${metaStr}`
  })
)

// Create transports array
const transports: winston.transport[] = []

// Console transport for development
if (process.env.NODE_ENV === 'development') {
  transports.push(
    new winston.transports.Console({
      level: 'debug',
      format: consoleFormat,
    })
  )
} else {
  transports.push(
    new winston.transports.Console({
      level: 'info',
      format: customFormat,
    })
  )
}

// File transports for production
if (process.env.NODE_ENV === 'production') {
  const logsDir = process.env.LOGS_DIR || '/app/logs'
  
  transports.push(
    // Error logs
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: customFormat,
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 10,
      tailable: true,
    }),
    
    // Combined logs
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: customFormat,
      maxsize: 100 * 1024 * 1024, // 100MB
      maxFiles: 5,
      tailable: true,
    }),
    
    // HTTP access logs
    new winston.transports.File({
      filename: path.join(logsDir, 'access.log'),
      level: 'http',
      format: customFormat,
      maxsize: 100 * 1024 * 1024, // 100MB
      maxFiles: 5,
      tailable: true,
    })
  )
}

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: customFormat,
  defaultMeta: {
    service: 'taskmaster-pro',
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
  },
  transports,
  exitOnError: false,
})

// Add request logging middleware
export function createRequestLogger() {
  return (req: any, res: any, next: any) => {
    const start = Date.now()
    const requestId = req.headers['x-request-id'] || generateRequestId()
    
    // Add request ID to request object
    req.requestId = requestId
    
    // Log request start
    logger.http('Request started', {
      requestId,
      method: req.method,
      url: req.url,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      userId: req.user?.id,
      sessionId: req.sessionID,
    })
    
    // Override res.end to log response
    const originalEnd = res.end
    res.end = function(...args: any[]) {
      const responseTime = Date.now() - start
      
      logger.http('Request completed', {
        requestId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        responseTime,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        userId: req.user?.id,
        sessionId: req.sessionID,
      })
      
      originalEnd.apply(this, args)
    }
    
    next()
  }
}

// Enhanced logging methods
export const log = {
  error: (message: string, error?: Error | any, context?: Record<string, any>) => {
    const errorInfo = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: (error as any).code,
    } : error
    
    logger.error(message, { error: errorInfo, context })
  },
  
  warn: (message: string, context?: Record<string, any>) => {
    logger.warn(message, { context })
  },
  
  info: (message: string, context?: Record<string, any>) => {
    logger.info(message, { context })
  },
  
  http: (message: string, context?: Record<string, any>) => {
    logger.http(message, { context })
  },
  
  debug: (message: string, context?: Record<string, any>) => {
    logger.debug(message, { context })
  },
  
  // Security event logging
  security: (event: string, severity: 'low' | 'medium' | 'high' | 'critical', context?: Record<string, any>) => {
    logger.warn(`SECURITY: ${event}`, {
      context: {
        ...context,
        securityEvent: event,
        severity,
        timestamp: new Date().toISOString(),
      },
      tags: ['security', severity],
    })
  },
  
  // Performance event logging
  performance: (metric: string, value: number, unit: string = 'ms', context?: Record<string, any>) => {
    logger.info(`PERFORMANCE: ${metric}`, {
      context: {
        ...context,
        metric,
        value,
        unit,
        timestamp: new Date().toISOString(),
      },
      tags: ['performance'],
    })
  },
  
  // Business event logging
  business: (event: string, context?: Record<string, any>) => {
    logger.info(`BUSINESS: ${event}`, {
      context: {
        ...context,
        businessEvent: event,
        timestamp: new Date().toISOString(),
      },
      tags: ['business'],
    })
  },
  
  // User action logging
  userAction: (action: string, userId: string, context?: Record<string, any>) => {
    logger.info(`USER_ACTION: ${action}`, {
      context: {
        ...context,
        action,
        userId,
        timestamp: new Date().toISOString(),
      },
      tags: ['user-action'],
    })
  },
}

// Error boundary logging
export function logErrorBoundary(error: Error, errorInfo: any, userId?: string) {
  log.error('React Error Boundary caught an error', error, {
    errorInfo,
    userId,
    component: errorInfo.componentStack,
    errorBoundary: true,
  })
}

// API error logging
export function logAPIError(
  endpoint: string,
  method: string,
  error: Error,
  requestId?: string,
  userId?: string,
  context?: Record<string, any>
) {
  log.error(`API Error: ${method} ${endpoint}`, error, {
    endpoint,
    method,
    requestId,
    userId,
    apiError: true,
    ...context,
  })
}

// Database error logging
export function logDatabaseError(
  operation: string,
  table: string,
  error: Error,
  query?: string,
  userId?: string
) {
  log.error(`Database Error: ${operation} on ${table}`, error, {
    operation,
    table,
    query: query ? query.substring(0, 500) : undefined, // Truncate long queries
    userId,
    databaseError: true,
  })
}

// Utility functions
function generateRequestId(): string {
  return Math.random().toString(36).substr(2, 9)
}

// Health check for logging system
export function checkLoggerHealth(): { healthy: boolean; issues: string[] } {
  const issues: string[] = []
  
  try {
    // Test basic logging
    logger.info('Health check test log')
    
    // Check if transports are writable
    for (const transport of logger.transports) {
      if ('writable' in transport && !transport.writable) {
        issues.push(`Transport ${transport.constructor.name} is not writable`)
      }
    }
    
    return { healthy: issues.length === 0, issues }
  } catch (error) {
    issues.push(`Logger health check failed: ${error}`)
    return { healthy: false, issues }
  }
}

// Export the winston logger for advanced use cases
export { logger as winston }

export default logger